import { signup } from '@/lib/auth-actions';
import { PLANS, PLAN_IDS } from '@/lib/billing';
import Link from 'next/link';
import SubmitButton from '@/components/submit-button';

export default function SignupPage({ searchParams }: { searchParams: { error?: string; plan?: string } }) {
  const selected = searchParams?.plan || 'professional';
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Create your agency account</h1>
          <p className="mt-1 text-sm text-slate-500">Professional: billed after secure checkout · Enterprise: our team contacts you</p>
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
            <div className="grid gap-3 sm:grid-cols-2">
              {PLAN_IDS.map((id) => {
                const p: any = (PLANS as any)[id];
                const custom = p.price_monthly === null;
                return (
                  <label key={id} className="cursor-pointer">
                    <input type="radio" name="plan" value={id} defaultChecked={id === selected} className="peer sr-only" />
                    <div className="rounded-xl border border-slate-200 p-4 transition peer-checked:border-gold peer-checked:bg-gold/5">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-lg font-bold text-gold">{custom ? 'Custom' : `$${p.price_monthly}`}<span className="text-xs font-normal text-slate-400">{custom ? ' pricing' : '/mo'}</span></p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-500">
                        {p.features.map((f: string) => <li key={f}>✓ {f}</li>)}
                      </ul>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400">Professional includes 2 users (+$50/month per extra user). Enterprise pricing is arranged with our team after signup.</p>
          </div>

          <SubmitButton className="btn-primary w-full" >Continue →</SubmitButton>
          <p className="text-center text-sm text-slate-500">
            Already have an account? <Link className="font-semibold text-gold hover:underline" href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
