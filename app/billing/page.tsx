import { getCurrentUser, requireUser } from '@/lib/data';
import { redirect } from 'next/navigation';

import { PLANS, PLAN_IDS, type PlanId } from '@/lib/billing';
import { logout } from '@/lib/auth-actions';
import { startCheckout, openBillingPortal } from '@/lib/checkout-actions';
import { getKelviqConfig, resolveKelviqSubscription, internalPlanFromKelviq } from '@/lib/kelviq';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export default async function BillingPage({ searchParams }: { searchParams?: { error?: string; enterprise?: string; kelviq?: string; portal?: string } }) {
  const ctx = await requireUser();
  if (ctx.profile?.role !== 'owner' && ctx.profile?.role !== 'superadmin') redirect('/dashboard?denied=1');
  const agency = ctx?.profile?.agencies;
  const currentPlan = (agency?.plan as PlanId) || 'professional';
  const planInfo = (PLANS as any)[currentPlan] || (PLANS as any).professional;
  let status = agency?.subscription_status || 'incomplete';
  const kelviq = await getKelviqConfig();
  const trialEnds = agency?.trial_ends_at ? new Date(agency.trial_ends_at) : null;
  const trialDaysLeft = trialEnds ? Math.ceil((trialEnds.getTime() - Date.now()) / 86400000) : -1;

  // Direct verification: after returning from Kelviq checkout, query Kelviq
  // for this agency's subscription and activate instantly (works even
  // before webhooks are configured).
  if (searchParams?.kelviq === 'success' && status !== 'active' && kelviq.enabled && kelviq.serverKey && agency?.id) {
    const { subscription, customerId } = await resolveKelviqSubscription(kelviq, agency.id, ctx.user?.email);
    if (subscription) {
      const plan = internalPlanFromKelviq(kelviq, subscription.plan?.planIdentifier || subscription.plan_identifier) || 'standard';
      const patch: Record<string, any> = {
        subscription_status: 'active',
        plan,
        kelviq_customer_id: customerId,
        current_period_end: subscription.billingPeriodEndTime || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      };
      if (subscription.id) patch.kelviq_subscription_id = subscription.id;
      await createAdminClient().from('agencies').update(patch).eq('id', agency.id);
      status = 'active';
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Activate your subscription</h1>
          <p className="mt-1 text-sm text-slate-500">
            {agency ? `${agency.name} — plan: ${planInfo.name} (${status})` : 'No agency found'}
          </p>
        </div>

        {status !== 'active' ? (
          <>
            {searchParams?.error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{searchParams.error}</div>}
            {searchParams?.portal === 'unavailable' && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                The self-serve billing portal isn't available for your account yet. Contact support and we'll update your payment details for you.
              </div>
            )}
            {searchParams?.kelviq === 'success' && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                ✓ Payment received. Your subscription is being activated — this page unlocks automatically within a minute. <a className="font-semibold underline" href="/billing">Refresh</a>
              </div>
            )}
            {searchParams?.enterprise === '1' && (
              <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm accent">
                Enterprise request received. Our team will contact you shortly to set up custom pricing — your workspace is being prepared.
              </div>
            )}
            {currentPlan === 'enterprise' ? (
              <div className="card p-6 text-center">
                <p className="text-lg font-semibold accent">Enterprise — custom pricing</p>
                <p className="mt-2 text-sm text-slate-500">White-labeling, GDS integration and full API access are configured per agency. Our team will contact you to activate this workspace.</p>
              </div>
            ) : (
              <>
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {status === 'trialing'
                ? 'You have full access during your 5-day trial. Add your card below — Kelviq only charges it when the trial ends, so nothing is lost.'
                : 'A card is required to use the CRM. Payments are collected securely by Kelviq — global taxes are handled for you at checkout.'}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {PLAN_IDS.map((id) => {
                const p: any = (PLANS as any)[id];
                const custom = p.price_monthly === null;
                return (
                  <div key={id} className="card flex flex-col p-5">
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="mt-1 text-2xl font-bold text-gold">{custom ? 'Custom' : `$${p.price_monthly}`}<span className="text-xs font-normal text-slate-400">{custom ? '' : '/month'}</span></p>
                    <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-500">
                      {p.features.map((f: string) => <li key={f}>✓ {f}</li>)}
                    </ul>
                    {custom ? (
                      <a className="btn-secondary mt-4 w-full text-center" href={`mailto:hamza@ezumrah.com?subject=Enterprise%20pricing%20—%20${encodeURIComponent(agency?.name || 'my agency')}`}>Contact for pricing</a>
                    ) : (
                      <form action={startCheckout} className="mt-4"><input type="hidden" name="plan" value={id} /><button className="btn-primary w-full" type="submit">{status === 'trialing' ? 'Add card' : 'Pay by card'}</button></form>
                    )}
                  </div>
                );
              })}
            </div>
              </>
            )}
          </>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-lg font-semibold text-green-600">Subscription active ✓</p>
            <p className="mt-1 text-sm text-slate-500">{planInfo.name} — {planInfo.price_monthly ? `$${planInfo.price_monthly}/month` : 'custom pricing'}{agency?.current_period_end ? ` · next billing ${new Date(agency.current_period_end).toLocaleDateString()}` : ''}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link className="btn-primary" href="/dashboard">Go to dashboard →</Link>
              <form action={openBillingPortal}><button className="btn-secondary" type="submit">Manage card &amp; invoices</button></form>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <form action={logout}><button className="text-sm text-slate-400 hover:underline" type="submit">Sign out</button></form>
        </div>
      </div>
    </main>
  );
}
