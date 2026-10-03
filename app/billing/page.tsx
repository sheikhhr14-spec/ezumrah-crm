import { getCurrentUser, requireUser } from '@/lib/data';
import { redirect } from 'next/navigation';

import { PLANS, PLAN_IDS, type PlanId } from '@/lib/billing';
import { logout } from '@/lib/auth-actions';
import { startCheckout } from '@/lib/checkout-actions';
import { getKelviqConfig } from '@/lib/kelviq';
import Link from 'next/link';

export default async function BillingPage({ searchParams }: { searchParams?: { error?: string; enterprise?: string; kelviq?: string } }) {
  const ctx = await requireUser();
  if (ctx.profile?.role !== 'owner' && ctx.profile?.role !== 'superadmin') redirect('/dashboard?denied=1');
  const agency = ctx?.profile?.agencies;
  const currentPlan = (agency?.plan as PlanId) || 'professional';
  const planInfo = (PLANS as any)[currentPlan] || (PLANS as any).professional;
  const status = agency?.subscription_status || 'incomplete';
  const kelviq = await getKelviqConfig();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Activate your subscription</h1>
          <p className="mt-1 text-sm text-slate-500">
            {agency ? `${agency.name} — plan: ${planInfo.name} (${status})` : 'No agency found'}
          </p>
        </div>

        {status !== 'active' && status !== 'trialing' ? (
          <>
            {searchParams?.error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{searchParams.error}</div>}
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
              A card is required to use the CRM. Payments are collected securely by Kelviq — global taxes are handled for you at checkout.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                      <form action={startCheckout} className="mt-4"><input type="hidden" name="plan" value={id} /><button className="btn-primary w-full" type="submit">Pay by card</button></form>
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
            <Link className="btn-primary mt-4" href="/dashboard">Go to dashboard →</Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <form action={logout}><button className="text-sm text-slate-400 hover:underline" type="submit">Sign out</button></form>
        </div>
      </div>
    </main>
  );
}
