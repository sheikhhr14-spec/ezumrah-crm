import { login } from '@/lib/auth-actions';
import Link from 'next/link';
import SubmitButton from '@/components/submit-button';

export default function LoginPage({ searchParams }: { searchParams: { error?: string; env?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gold text-xl font-bold text-white">E</div>
          <h1 className="text-2xl font-bold text-slate-900">EzUmrah CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Umrah & Hajj agency management</p>
        </div>
        <form action={login} className="card space-y-4 p-6">
          {searchParams?.env === 'missing' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Server not configured: Supabase environment variables are missing in the deployment. Add them in Vercel → Settings → Environment Variables, then redeploy.
            </p>
          )}
          {searchParams?.env === 'error' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Could not verify your session. Check that the Supabase URL and anon key are set correctly in Vercel, then redeploy.
            </p>
          )}
          {searchParams?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{searchParams.error}</p>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required placeholder="you@agency.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required />
          </div>
          <SubmitButton className="btn-primary w-full" >Sign in</SubmitButton>
          <p className="text-center text-sm text-slate-500">
            New agency? <Link className="font-semibold text-gold hover:underline" href="/signup">Create account</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
