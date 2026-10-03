import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKelviqConfig, verifyKelviqSignature, internalPlanFromKelviq } from '@/lib/kelviq';

// Kelviq webhook receiver. Register this URL in the Kelviq dashboard
// (Settings → Webhooks) and subscribe to: checkout.completed,
// subscription.created, subscription.updated, subscription.cancelled,
// subscription.plan_changed, invoice.payment_failed.
// Every delivery is verified (HMAC-SHA256) and deduplicated by event id.

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  incomplete: 'incomplete',
  incomplete_expired: 'cancelled',
  superseded: 'cancelled',
};

function pickAgencyId(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;
  return (
    obj.metadata?.agency_id ||
    obj.customer_id ||
    obj.customer?.customerId ||
    obj.customer?.id ||
    null
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('webhook-signature');
  const timestamp = request.headers.get('webhook-timestamp');
  const eventId = request.headers.get('webhook-id');

  const cfg = await getKelviqConfig();
  if (!verifyKelviqSignature(rawBody, signature, timestamp, cfg.webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  if (!event?.type) return NextResponse.json({ error: 'Missing type' }, { status: 400 });

  const db = createAdminClient();

  // Idempotency: Kelviq retries/resends deliver the same event more than once
  const evId = event.id || eventId || `${event.type}:${Date.now()}`;
  const { data: seen, error: seenErr } = await db
    .from('kelviq_webhook_events')
    .select('id')
    .eq('event_id', evId)
    .maybeSingle();
  if (seenErr) {
    // table missing — proceed anyway but log
    console.error('kelviq webhook: idempotency check failed', seenErr.message);
  }
  if (seen) return NextResponse.json({ received: true, duplicate: true });
  await db.from('kelviq_webhook_events').insert({
    event_id: evId,
    type: event.type,
    payload: event.data?.object || {},
  }).then(({ error }: any) => {
    if (error && error.code !== '23505') console.error('kelviq webhook: insert failed', error.message);
  });

  const obj = event.data?.object || {};
  const agencyId = pickAgencyId(obj);
  if (!agencyId) return NextResponse.json({ received: true, ignored: 'no agency id' });

  const { data: agency } = await db.from('agencies').select('id, plan').eq('id', agencyId).maybeSingle();
  if (!agency) return NextResponse.json({ received: true, ignored: 'unknown agency' });

  switch (event.type) {
    case 'checkout.completed': {
      // payment collected; subscription object follows in subscription.created,
      // but access can be granted now per Kelviq's metadata correlation guide
      const plan = obj.metadata?.plan || 'professional';
      await db.from('agencies').update({
        subscription_status: 'active',
        plan,
        kelviq_customer_id: agencyId,
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      }).eq('id', agencyId);
      break;
    }
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.plan_changed': {
      const status = STATUS_MAP[obj.status] || (event.type === 'subscription.created' ? 'active' : 'incomplete');
      const patch: Record<string, any> = {
        subscription_status: status,
        kelviq_customer_id: agencyId,
      };
      if (obj.id) patch.kelviq_subscription_id = obj.id;
      if (obj.billing_period_end_time) patch.current_period_end = obj.billing_period_end_time;
      else if (status === 'active') patch.current_period_end = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      const plan = internalPlanFromKelviq(cfg, obj.plan?.planIdentifier || obj.plan_identifier || obj.planIdentifier);
      if (plan) patch.plan = plan;
      await db.from('agencies').update(patch).eq('id', agencyId);
      break;
    }
    case 'subscription.cancelled': {
      await db.from('agencies').update({ subscription_status: 'cancelled' }).eq('id', agencyId);
      break;
    }
    case 'invoice.payment_failed': {
      await db.from('agencies').update({ subscription_status: 'past_due' }).eq('id', agencyId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
