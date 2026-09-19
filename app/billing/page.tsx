import { getCurrentUser, requireUser } from '@/lib/data';
import { redirect } from 'next/navigation';

import { PLANS, PLAN_IDS, type PlanId } from '@/lib/billing';
import { logout } from '@/lib/auth-actions';
import { createCheckout } from '@/lib/stripe-actions';
import Link from 'next/link';

export default async function BillingPage() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== 'owner' && ctx.profile?.role !== 'superadmin') redirect('/dashboard?denied=1');
  const agency = ctx?.profile?.agencies;
  const currentPlan = (agency?.plan as PlanId) || 'starter';
  const status = agency?.subscription_status || 'incomplete';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Activate your subscription</h1>
          <p className="mt-1 text-sm text-slate-500">
            {agency ? `${agency.name} — plan: ${PLANS[currentPlan].name} (${status})` : 'No agency found'}
          </p>
        </div>

        {status !== 'active' && status !== 'trialing' ? (
          <>
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              A credit card is required to use the CRM. Your card is charged securely by Stripe.
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {PLAN_IDS.map((id) => (
                <form key={id} action={createCheckout} className="card flex flex-col p-5">
                  <input type="hidden" name="plan" value={id} />
                  <p className="font-bold text-slate-900">{PLANS[id].name}</p>
                  <p className="mt-1 text-2xl font-bold text-gold">${PLANS[id].price_monthly}<span className="text-xs font-normal text-slate-400">/month</span></p>
                  <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-500">
                    {PLANS[id].features.map((f) => <li key={f}>✓ {f}</li>)}
                  </ul>
                  <button className="btn-primary mt-4 w-full" type="submit">Pay by card</button>
                </form>
              ))}
            </div>
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
