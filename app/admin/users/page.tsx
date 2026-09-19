import { createAdminClient } from '@/lib/supabase/admin';
import { setUserRole, deleteUser } from '@/lib/admin-actions';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';
import Link from 'next/link';

export default async function UsersPage({ searchParams }: { searchParams: { q?: string, agency?: string } }) {
  const db = createAdminClient();
  const [{ data: profiles }, { data: agencies }] = await Promise.all([
    db.from('profiles').select('*, agencies(name)').order('created_at', { ascending: false }),
    db.from('agencies').select('id, name').order('name'),
  ]);

  const q = (searchParams?.q || '').toLowerCase();
  const agency = searchParams?.agency || '';
  const filtered = (profiles || []).filter((p: any) =>
    (!q || (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)) &&
    (!agency || p.agency_id === agency));

  return (
    <div>
      <PageHeader title="Platform Users" subtitle={`${profiles?.length || 0} accounts across all tenants`} />

      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" placeholder="Search name or email…" defaultValue={searchParams?.q || ''} />
        <select className="input max-w-56" name="agency" defaultValue={agency}>
          <option value="">All agencies (incl. platform)</option>
          {(agencies || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>

      <Table head={['Name', 'Email', 'Agency', 'Role', 'Change role', 'Ban']}>
        {filtered.length ? filtered.map((p: any) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{p.full_name || '—'}</td>
            <td className="px-4 py-2 text-slate-500">{p.email}</td>
            <td className="px-4 py-2">
              {p.agency_id
                ? <Link className="hover:underline" href={`/admin/agencies/${p.agency_id}`}>{p.agencies?.name || '—'}</Link>
                : <span className="badge accent-soft-bg accent">Platform</span>}
            </td>
            <td className="px-4 py-2"><StatusBadge status={p.role} /></td>
            <td className="px-4 py-2">
              <form action={setUserRole} className="flex gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="agency_id" value={p.agency_id || ''} />
                <select name="role" defaultValue={p.role} className="input max-w-32">
                  <option value="superadmin">superadmin</option>
                  <option value="owner">owner</option>
                  <option value="manager">manager</option>
                  <option value="staff">staff</option>
                </select>
                <button className="btn-secondary text-xs" type="submit">Set</button>
              </form>
            </td>
            <td className="px-4 py-2">
              {p.role !== 'superadmin' ? (
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="agency_id" value={p.agency_id || ''} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Ban</button>
                </form>
              ) : <span className="text-xs text-slate-300">protected</span>}
            </td>
          </tr>
        )) : <tr><td colSpan={6}><Empty msg="No users match." /></td></tr>}
      </Table>
    </div>
  );
}
