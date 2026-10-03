'use server';

import { getCurrentUser } from '@/lib/data';
import { redirect } from 'next/navigation';
import { getKelviqConfig, createKelviqCheckoutSession, getKelviqClient } from '@/lib/kelviq';
import { ApiError } from '@kelviq/node-sdk';
import { PLANS } from '@/lib/billing';

/**
 * Starts a Kelviq (Merchant of Record) subscription checkout.
 * If the agency is still in its trial, the card is collected now and Kelviq
 * charges it when the trial period configured on the plan ends.
 */
export async function startCheckout(formData: FormData) {
  const ctx = await getCurrentUser();
  if (!ctx?.profile?.agency_id) redirect('/login');

  const plan = String(formData.get('plan') || 'standard');
  if (!(PLANS as any)[plan] || (PLANS as any)[plan].price_monthly === null) {
    redirect('/billing?error=' + encodeURIComponent('Enterprise is custom-priced. Our team will contact you — no card needed yet.'));
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cfg = await getKelviqConfig();

  if (!cfg.enabled || !cfg.serverKey) {
    redirect('/billing?error=' + encodeURIComponent('Online billing is temporarily unavailable. Please try again shortly.'));
  }

  try {
    const trialing = ctx.profile.agencies?.subscription_status === 'trialing';
    const session = await createKelviqCheckoutSession(cfg, {
      plan,
      agencyId: ctx.profile.agency_id,
      email: ctx.user?.email || undefined,
      name: ctx.profile.agencies?.name || ctx.profile.full_name || undefined,
      successUrl: `${origin}/billing?kelviq=success`,
      trialDays: trialing ? 5 : null, // Kelviq charges the card when the trial ends
    });
    redirect(session.checkoutUrl);
  } catch (e: any) {
    // static-link fallback only when the link matches the chosen plan's price
    if (cfg.checkoutUrl && plan === 'standard') redirect(cfg.checkoutUrl);
    redirect('/billing?error=' + encodeURIComponent(e?.message || 'Kelviq checkout failed'));
  }
}


/**
 * Billing portal: hands the owner a self-serve Kelviq portal session to
 * manage their card, invoices and cancellation. Kelviq returns 400 while the
 * customer record has no email (unknown customer) — answered with a friendly
 * redirect instead of a 500.
 */
export async function openBillingPortal() {
  const ctx = await getCurrentUser();
  if (ctx?.profile?.role !== 'owner' && ctx?.profile?.role !== 'superadmin') redirect('/dashboard?denied=1');
  const agencyId = ctx?.profile?.agency_id;
  if (!agencyId) redirect('/login');

  const cfg = await getKelviqConfig();
  if (!cfg.enabled || !cfg.serverKey) redirect('/billing?portal=unavailable');

  try {
    const client = await getKelviqClient(cfg);
    const session = await client.portal.createSession({ customerId: agencyId });
    redirect(`${session.customerPortalUrl}?token=${session.token}`);
  } catch (e: any) {
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e; // next/navigation redirect passthrough
    const status = e instanceof ApiError ? e.statusCode : undefined;
    if (status === 400 || status === 404) {
      redirect('/billing?portal=unavailable');
    }
    redirect('/billing?error=' + encodeURIComponent(e?.message || 'Could not open the billing portal'));
  }
}
