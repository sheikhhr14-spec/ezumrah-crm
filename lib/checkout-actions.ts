'use server';

import { getCurrentUser } from '@/lib/data';
import { redirect } from 'next/navigation';
import { getKelviqConfig, createKelviqCheckoutSession } from '@/lib/kelviq';
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
    const session = await createKelviqCheckoutSession(cfg, {
      plan,
      agencyId: ctx.profile.agency_id,
      email: ctx.user?.email || undefined,
      name: ctx.profile.agencies?.name || ctx.profile.full_name || undefined,
      successUrl: `${origin}/billing?kelviq=success`,
    });
    redirect(session.checkoutUrl);
  } catch (e: any) {
    // static-link fallback only when the link matches the chosen plan's price
    if (cfg.checkoutUrl && plan === 'standard') redirect(cfg.checkoutUrl);
    redirect('/billing?error=' + encodeURIComponent(e?.message || 'Kelviq checkout failed'));
  }
}
