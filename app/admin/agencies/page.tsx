import { createAdminClient } from '@/lib/supabase/admin';
import { createAgency, deleteAgency } from '@/lib/admin-actions';
import { PageHeader, StatusBadge, Table, Empty, AddPanel, Field } from '@/components/ui';
import Link from 'next/link';
import AccentPicker from '@/components/AccentPicker';

export default async function AgenciesPage({ searchParams }: { searchParams: { q?: string, status?: string } }) {
  const db = createAdminClient();
  const [{ data: agencies }, { data: allProfiles }] = await Promise.all([
    db.from('agencies').select('*').order('created_at', { ascending: false }),
    db.from('profiles').select('id, agency_id'),
  ]);
  const userCounts: Record<string, number> = {};
  for (const p of allProfiles || []) if (p.agency_id) userCounts[p.agency_id] = (userCounts[p.agency_id] || 0) + 1;

  const q = (searchParams?.q || '').toLowerCase();
  const status = searchParams?.status || '';
  const filtered = (agencies || []).filter((a: any) =>
    (!q || a.name.toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q)) &&
    (!status || a.subscription_status === status)
  );

  const statuses = ['active', 'trialing', 'past_due', 'canceled', 'suspended'];

  return (
    <div>
      <PageHeader title="Agencies (Tenants)" subtitle={`${agencies?.length || 0} tenants on the platform`} />

      {/* Create agency */}
      <AddPanel label="Add new agency">
        <form action={createAgency} className="grid gap-4 sm:grid-cols-3">
          <Field label="Agency name"><input className="input" name="name" required placeholder="Al-Noor Travels" /></Field>
          <Field label="Email"><input className="input" name="email" type="email" placeholder="info@agency.com" /></Field>
          <Field label="Plan">
            <select className="input" name="plan" defaultValue="starter">
              <option value="starter">Starter ($29)</option>
              <option value="professional">Professional ($79)</option>
              <option value="enterprise">Enterprise ($199)</option>
            </select>
          </Field>
          <Field label="Subscription status">
            <select className="input" name="subscription_status" defaultValue="trialing">
              {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="Label (tag)"><input className="input" name="label" placeholder="VIP, Priority…" /></Field>
          <div>
            <label className="label">Brand color</label>
            <AccentPicker current="#b8923f" name="brand_color" />
          </div>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Create agency</button></div>
        </form>
      </AddPanel>

      {/* Search + filters */}
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" name="q" placeholder="Search name or email…" defaultValue={searchParams?.q || ''} />
        <select className="input max-w-40" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>

      <Table head={['Agency', 'Plan', 'Status', 'Label', 'Users', 'Joined', 'Actions']}>
        {filtered.length ? filtered.map((a: any) => (
          <tr key={a.id} className="hover:bg-slate-50">
            <td className="px-4 py-2">
              <Link href={`/admin/agencies/${a.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                {a.brand_color && <span className="h-3 w-3 rounded-full" style={{ background: a.brand_color }} />}
                {a.name}
              </Link>
              <span className="text-xs text-slate-400">{a.email || ''}</span>
            </td>
            <td className="px-4 py-2 capitalize">{a.plan}</td>
            <td className="px-4 py-2"><StatusBadge status={a.subscription_status} /></td>
            <td className="px-4 py-2">{a.label ? <span className="badge accent-soft-bg accent">{a.label}</span> : '—'}</td>
            <td className="px-4 py-2 text-slate-500">{userCounts[a.id] || 0}</td>
            <td className="px-4 py-2 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
            <td className="px-4 py-2">
              <div className="flex gap-2">
                <Link href={`/admin/agencies/${a.id}`} className="text-xs font-semibold accent hover:underline">View / Edit</Link>
                <form action={deleteAgency}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="text-xs font-semibold text-red-500 hover:underline"
                    onClick={undefined}>Delete</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr><td colSpan={7}><Empty msg="No agencies match." /></td></tr>}
      </Table>
      <p className="mt-3 text-xs text-slate-400">Deleting an agency removes all its data, users, and records permanently.</p>
    </div>
  );
}
