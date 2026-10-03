'use server';

import { getCurrentUser } from '@/lib/data';
import { redirect } from 'next/navigation';
import { getKelviqConfig, createKelviqCheckoutSession } from '@/lib/kelviq';
import { PLANS } from '@/lib/billing';

/**
 * Starts a subscription checkout. Uses Kelviq (Merchant of Record) when the
 * super-admin has enabled it in /admin/settings; otherwise falls back to the
 * legacy Stripe checkout.
 */
export async function startCheckout(formData: FormData) {
  const ctx = await getCurrentUser();
  if (!ctx?.profile?.agency_id) redirect('/login');

  const plan = String(formData.get('plan') || 'professional');
  if (!(PLANS as any)[plan] || (PLANS as any)[plan].price_monthly === null) {
    redirect('/billing?error=' + encodeURIComponent('Enterprise is custom-priced. Our team will contact you — no card needed yet.'));
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cfg = await getKelviqConfig();

  if (cfg.enabled && cfg.serverKey) {
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

  // Stripe fallback
  const { createCheckout } = await import('@/lib/stripe-actions');
  await createCheckout(formData);
}
