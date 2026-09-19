import { createAdminClient } from '@/lib/supabase/admin';
import { setAgencyStatus } from '@/lib/admin-actions';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';
import Link from 'next/link';

export default async function AgenciesPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const db = createAdminClient();
  let q = db.from('agencies').select('*').order('created_at', { ascending: false });
  const { data: agencies } = await q;

  const filtered = (agencies || []).filter((a) => {
    if (searchParams?.status && a.subscription_status !== searchParams.status) return false;
    if (searchParams?.q && !a.name.toLowerCase().includes(searchParams.q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Agencies (Tenants)" subtitle={`${agencies?.length || 0} total — fully isolated from each other`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" placeholder="Search agency name…" defaultValue={searchParams?.q || ''} />
        <select className="input max-w-xs" name="status" defaultValue={searchParams?.status || ''}>
          <option value="">All statuses</option>
          {['incomplete', 'trialing', 'active', 'past_due', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>
      <Table head={['Agency', 'Plan', 'Status', 'Joined', 'Quick status', '']}>
        {filtered.length ? filtered.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{a.name}</td>
            <td className="px-4 py-2 capitalize">{a.plan}</td>
            <td className="px-4 py-2"><StatusBadge status={a.subscription_status} /></td>
            <td className="px-4 py-2">{new Date(a.created_at).toLocaleDateString()}</td>
            <td className="px-4 py-2">
              <form action={setAgencyStatus} className="flex gap-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="status" defaultValue={a.subscription_status} className="input w-32 px-2 py-1 text-xs">
                  {['incomplete', 'trialing', 'active', 'past_due', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <button className="btn-secondary px-2 py-1 text-xs" type="submit">Apply</button>
              </form>
            </td>
            <td className="px-4 py-2"><Link className="font-semibold text-gold hover:underline" href={`/admin/agencies/${a.id}`}>Manage →</Link></td>
          </tr>
        )) : <Empty msg="No agencies match." />}
      </Table>
    </div>
  );
}
