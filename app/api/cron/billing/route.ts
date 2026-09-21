import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/billing';

// Daily billing run: suspend expired trials & overdue accounts, issue monthly SaaS invoices, email agencies.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const db = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const period = monthStart.slice(0, 7);
  const grace7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const summary = { suspended: 0, invoices: 0, emails: 0, emailSkipped: 0 };

  const { data: agencies } = await db.from('agencies')
    .select('id, name, email, plan, subscription_status, trial_ends_at').neq('subscription_status', 'canceled');

  for (const a of agencies || []) {
    // 1. suspend expired trials (payment is marked manually by admin afterwards)
    if (a.subscription_status === 'trialing' && a.trial_ends_at && new Date(a.trial_ends_at) < now) {
      await db.from('agencies').update({ subscription_status: 'suspended' }).eq('id', a.id);
      a.subscription_status = 'suspended';
      summary.suspended++;
      await mail(db, a, summary,
        'Your EzUmrah CRM trial has ended',
        `Your trial period ended on ${a.trial_ends_at.slice(0, 10)}. The account is now suspended. Complete your ${a.plan} plan payment to reactivate — the EzUmrah team will mark your invoice as paid.`);
    }

    // 2. suspend actives with invoices >7 days overdue
    if (a.subscription_status === 'active') {
      const { data: overdue } = await db.from('platform_invoices').select('id')
        .eq('agency_id', a.id).eq('status', 'open').lt('period_end', grace7).limit(1);
      if (overdue && overdue.length) {
        await db.from('agencies').update({ subscription_status: 'suspended' }).eq('id', a.id);
        a.subscription_status = 'suspended';
        summary.suspended++;
        await mail(db, a, summary,
          'EzUmrah CRM account suspended — overdue invoice',
          'Your subscription invoice is more than 7 days overdue, so the account has been suspended. Pay the outstanding invoice and the EzUmrah team will reactivate it.');
      }
    }

    // 3. issue this month's invoice for active agencies (tenant + admin copies)
    if (a.subscription_status === 'active') {
      const plan = String(a.plan || 'starter').toLowerCase();
      const price = (PLANS as any)[plan]?.price_monthly || 29;
      const { data: tenantInv } = await db.from('saas_invoices').select('id')
        .eq('agency_id', a.id).eq('period', period).maybeSingle();
      const { data: adminInv } = await db.from('platform_invoices').select('id')
        .eq('agency_id', a.id).eq('period_start', monthStart).maybeSingle();
      if (!tenantInv) {
        const { count } = await db.from('saas_invoices').select('id', { count: 'exact', head: true }).eq('agency_id', a.id);
        await db.from('saas_invoices').insert({
          agency_id: a.id,
          invoice_no: `EZ-${period.replace('-', '')}-${String((count || 0) + 1).padStart(3, '0')}`,
          period, plan, amount: price, status: 'unpaid',
          due_date: new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 5).toISOString().slice(0, 10),
        });
        summary.invoices++;
      }
      if (!adminInv) {
        await db.from('platform_invoices').insert({
          agency_id: a.id, number: `SAAS-${period.replace('-', '')}-${a.id.slice(0, 4).toUpperCase()}`,
          plan, amount: price, currency: 'USD', period_start: monthStart, period_end: monthEnd, status: 'open',
        });
      }
      if (!tenantInv) {
        await mail(db, a, summary,
          `New EzUmrah CRM invoice — ${period}`,
          `Your ${plan} plan invoice for ${period} is ready in Billing. Amount: USD ${price}. Pay before the due date to keep the account active.`);
      }
    }
  }
  return NextResponse.json({ ok: true, ranAt: today, ...summary });
}

async function mail(db: any, a: any, summary: any, subject: string, body: string) {
  try {
    const { sendAgencyEmail, invoiceHtml } = await import('@/lib/email');
    await sendAgencyEmail(a.id, {
      subject,
      html: invoiceHtml({
        title: 'Subscription Notice', ref: 'EzUmrah CRM', agencyName: a.name, agencyLogo: null,
        meta: `Plan: ${a.plan} · Status: ${a.subscription_status}`,
        lines: [body], rows: [], totals: [],
      }),
    });
    summary.emails++;
  } catch {
    summary.emailSkipped++;
  }
}
