import { createAdminClient } from '@/lib/supabase/admin';
import { savePortalTheme } from '@/lib/admin-actions';
import { PageHeader, Field } from '@/components/ui';
import { requireSuperadmin } from '@/lib/data';
import AccentPicker from '@/components/AccentPicker';

export default async function SettingsPage() {
  const ctx = await requireSuperadmin();
  const current = (ctx.profile as any)?.portal_accent || '#b8923f';
  const db = createAdminClient();
  const [{ count: agencies }, { count: users }] = await Promise.all([
    db.from('agencies').select('id', { count: 'exact', head: true }),
    db.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  return (
    <div>
      <PageHeader title="Settings & Theme" subtitle="Personalize your Super Admin portal and review platform configuration" />

      {/* Portal theme */}
      <div className="card mb-6 p-6">
        <h2 className="mb-1 text-sm font-bold text-slate-900">Portal theme</h2>
        <p className="mb-4 text-xs text-slate-400">Choose the accent color of this Super Admin portal (saved to your account — other admins keep theirs).</p>
        <form action={savePortalTheme}>
          <AccentPicker current={current} />
          <button className="btn-primary" type="submit">Save theme</button>
        </form>
      </div>

      {/* Platform info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Platform</h2>
          <dl className="space-y-3 text-sm">
            {[
              ['Product', 'EzUmrah SaaS CRM'],
              ['URL', 'https://ezumrah-crm.vercel.app'],
              ['Database', 'Supabase · ezumrah-crm'],
              ['Tenants', String(agencies || 0)],
              ['Total users', String(users || 0)],
              ['Plans', 'Starter $29 · Professional $79 · Enterprise $199'],
              ['Super admin', ctx.profile?.email || ctx.user.email],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-400">{k}</dt>
                <dd className="font-semibold text-slate-700">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Agency branding & labeling</h2>
          <p className="mb-3 text-sm text-slate-500">
            Each agency can get its own label (tag) and brand color — set them from
            <a className="accent font-semibold" href="/admin/agencies"> Agencies → View / Edit</a>.
            The brand color is applied to that tenant&rsquo;s own CRM interface, and labels + color dots appear throughout the admin portal.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="badge accent-soft-bg accent">VIP</span>
            <span className="badge bg-emerald-50 text-emerald-600">Priority</span>
            <span className="badge bg-amber-50 text-amber-600">Trial</span>
            <span className="badge bg-slate-100 text-slate-500">Standard</span>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Payments: Stripe Checkout is wired for signup (Starter/Professional/Enterprise). Connect your Stripe key to enable live checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
