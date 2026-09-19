import { signup } from '@/lib/auth-actions';
import { PLANS, PLAN_IDS } from '@/lib/billing';
import Link from 'next/link';
import SubmitButton from '@/components/submit-button';

export default function SignupPage({ searchParams }: { searchParams: { error?: string; plan?: string } }) {
  const selected = searchParams?.plan || 'starter';
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Create your agency account</h1>
          <p className="mt-1 text-sm text-slate-500">Credit card required — billed after the secure checkout step</p>
        </div>
        <form action={signup} className="card space-y-4 p-6">
          {searchParams?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{searchParams.error}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Your name</label>
              <input className="input" name="full_name" required placeholder="Ahmed Ali" />
            </div>
            <div>
              <label className="label">Agency name</label>
              <input className="input" name="agency_name" required placeholder="Al Noor Travels" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" name="email" type="email" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" name="password" type="password" minLength={8} required />
            </div>
          </div>

          <div>
            <span className="label">Choose plan</span>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLAN_IDS.map((id) => (
                <label key={id} className="cursor-pointer">
                  <input type="radio" name="plan" value={id} defaultChecked={id === selected} className="peer sr-only" />
                  <div className="rounded-xl border border-slate-200 p-4 transition peer-checked:border-gold peer-checked:bg-gold/5">
                    <p className="font-bold text-slate-900">{PLANS[id].name}</p>
                    <p className="text-lg font-bold text-gold">${PLANS[id].price_monthly}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {PLANS[id].features.map((f) => <li key={f}>✓ {f}</li>)}
                    </ul>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <SubmitButton className="btn-primary w-full" >Continue to payment →</SubmitButton>
          <p className="text-center text-sm text-slate-500">
            Already have an account? <Link className="font-semibold text-gold hover:underline" href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
