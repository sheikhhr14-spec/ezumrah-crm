'use server';

import { getCurrentUser } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS, type PlanId } from '@/lib/billing';
import { redirect } from 'next/navigation';

// Creates a Stripe Checkout session (subscription) for the chosen plan.
// Uses REST API directly so no extra dependency is needed.
export async function createCheckout(formData: FormData) {
  const ctx = await getCurrentUser();
  if (!ctx?.profile?.agency_id) redirect('/login');

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    redirect('/billing?error=' + encodeURIComponent('Stripe keys not configured yet. Add STRIPE_SECRET_KEY in Vercel.'));
  }

  const plan = String(formData.get('plan') || 'starter') as PlanId;
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'usd');
  body.set('line_items[0][price_data][unit_amount]', String(PLANS[plan].price_monthly * 100));
  body.set('line_items[0][price_data][recurring][interval]', 'month');
  body.set('line_items[0][price_data][product_data][name]', `EzUmrah CRM — ${PLANS[plan].name} plan`);
  body.set('success_url', `${origin}/api/stripe/verify?session_id={CHECKOUT_SESSION_ID}`);
  body.set('cancel_url', `${origin}/billing?error=cancelled`);
  body.set('metadata[agency_id]', ctx.profile.agency_id);
  body.set('metadata[plan]', plan);
  body.set('subscription_data[metadata][agency_id]', ctx.profile.agency_id);
  if (ctx.user.email) body.set('customer_email', ctx.user.email);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const session = await res.json();
  if (!session.url) redirect('/billing?error=' + encodeURIComponent(session.error?.message || 'Checkout failed'));
  redirect(session.url);
}
