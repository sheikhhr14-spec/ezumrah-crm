import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKelviqConfig, resolveKelviqSubscription, internalPlanFromKelviq } from '@/lib/kelviq';

// Daily Kelviq sync: pulls each agency's subscription state (status, plan,
// next billing date) from Kelviq so the CRM always reflects who has paid.
// Complements the webhook: webhooks push instantly, this run is the safety net.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const cfg = await getKelviqConfig();
  if (!cfg.enabled || !cfg.serverKey) return NextResponse.json({ ok: true, skipped: 'kelviq not configured' });

  const db = createAdminClient();
  const { data: agencies } = await db.from('agencies')
    .select('id, name, email, plan, subscription_status, kelviq_customer_id, current_period_end')
    .in('subscription_status', ['active', 'past_due', 'trialing']);

  const summary: Record<string, number> = { checked: 0, updated: 0, unchanged: 0, not_found: 0, lapsed: 0 };
  for (const a of agencies || []) {
    summary.checked++;
    const { subscription, customerId } = await resolveKelviqSubscription(cfg, a.id, a.email);
    if (subscription) {
      const kelviqStatus = String(subscription.status || '').toLowerCase();
      const status = kelviqStatus === 'active' || kelviqStatus === 'trialing'
        ? 'active'
        : kelviqStatus === 'past_due' || kelviqStatus === 'incomplete'
          ? 'past_due'
          : 'cancelled';
      const plan = internalPlanFromKelviq(cfg, subscription.plan?.planIdentifier) || a.plan;
      const periodEnd = subscription.billingPeriodEndTime || null;
      const patch: Record<string, any> = { subscription_status: status, plan, kelviq_customer_id: customerId };
      if (periodEnd) patch.current_period_end = periodEnd;
      if (subscription.id) patch.kelviq_subscription_id = subscription.id;
      if (status !== a.subscription_status || (periodEnd || '') !== (a.current_period_end || '')) {
        await db.from('agencies').update(patch).eq('id', a.id);
        summary.updated++;
      } else summary.unchanged++;
    } else {
      summary.not_found++;
      // active agency with an expired period and no Kelviq subscription → payment lapsed
      if (a.subscription_status === 'active' && a.current_period_end && new Date(a.current_period_end) < new Date()) {
        await db.from('agencies').update({ subscription_status: 'past_due' }).eq('id', a.id);
        summary.lapsed++;
      }
    }
  }
  return NextResponse.json({ ok: true, ...summary });
}
