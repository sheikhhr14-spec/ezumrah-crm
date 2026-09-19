import { createAdminClient } from '@/lib/supabase/admin';
import { setUserRole, deleteUser } from '@/lib/admin-actions';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';

export default async function UsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const db = createAdminClient();
  const { data: profiles } = await db
    .from('profiles').select('*, agencies(name)').order('created_at', { ascending: false });

  const filtered = (profiles || []).filter((p) =>
    !searchParams?.q ||
    (p.full_name || '').toLowerCase().includes(searchParams.q.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Platform Users" subtitle={`${profiles?.length || 0} accounts across all tenants`} />
      <form className="mb-4">
        <input className="input max-w-xs" name="q" placeholder="Search by name…" defaultValue={searchParams?.q || ''} />
        <button className="btn-secondary ml-2" type="submit">Search</button>
      </form>
      <Table head={['Name', 'Email', 'Agency', 'Role', 'Change role', 'Ban']}>
        {filtered.length ? filtered.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{p.full_name || '—'}</td>
            <td className="px-4 py-2 text-slate-500">{p.email}</td>
            <td className="px-4 py-2">{(p.agencies as any)?.name || 'Platform'}</td>
            <td className="px-4 py-2"><StatusBadge status={p.role} /></td>
            <td className="px-4 py-2">
              <form action={setUserRole} className="flex gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="agency_id" value={p.agency_id || ''} />
                <select name="role" defaultValue={p.role} className="input w-32 px-2 py-1 text-xs">
                  {['superadmin', 'owner', 'manager', 'staff'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
              </form>
            </td>
            <td className="px-4 py-2">
              <form action={deleteUser}>
                <input type="hidden" name="id" value={p.id} />
                <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Ban user</button>
              </form>
            </td>
          </tr>
        )) : <Empty msg="No users." />}
      </Table>
    </div>
  );
}
