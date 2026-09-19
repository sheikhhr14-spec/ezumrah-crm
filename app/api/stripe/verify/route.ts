import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Called by Stripe Checkout redirect after payment. Verifies the session
// server-side and activates the agency subscription.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');
  const key = process.env.STRIPE_SECRET_KEY;
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (!sessionId || !key) {
    return NextResponse.redirect(origin + '/billing?error=missing_session');
  }

  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const session = await res.json();

  if (session.payment_status === 'paid' || session.status === 'complete') {
    const db = createAdminClient();
    await db
      .from('agencies')
      .update({
        subscription_status: 'active',
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        stripe_subscription_id:
          typeof session.subscription === 'string' ? session.subscription : null,
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        plan: session.metadata?.plan || 'starter',
      })
      .eq('id', session.metadata?.agency_id);
    return NextResponse.redirect(origin + '/dashboard?welcome=1');
  }

  return NextResponse.redirect(origin + '/billing?error=payment_incomplete');
}
