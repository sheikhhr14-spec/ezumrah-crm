import { createAdminClient } from '@/lib/supabase/admin';
import { setAgencyStatus, setAgencyPlan, deleteAgency, setUserRole } from '@/lib/admin-actions';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AgencyDetail({ params }: { params: { id: string } }) {
  const db = createAdminClient();
  const { data: agency } = await db.from('agencies').select('*').eq('id', params.id).single();
  if (!agency) notFound();

  const [users, bookings, customers, invoices, packages] = await Promise.all([
    db.from('profiles').select('id, full_name, role, created_at, agencies(name)').eq('agency_id', agency.id).order('created_at'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
    db.from('customers').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
    db.from('invoices').select('total, status, currency').eq('agency_id', agency.id),
    db.from('packages').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
  ]);

  const revenue = (invoices.data || []).filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);

  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href="/admin/agencies">← All agencies</Link>
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{agency.name}</h1>
        <p className="text-sm text-slate-500">
          Joined {new Date(agency.created_at).toLocaleDateString()} · <StatusBadge status={agency.subscription_status} />
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Users', value: users.data?.length || 0 },
          { label: 'Bookings', value: bookings.count || 0 },
          { label: 'Customers', value: customers.count || 0 },
          { label: 'Packages', value: packages.count || 0 },
          { label: 'Invoiced (paid)', value: `$${revenue.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs uppercase text-slate-400">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Subscription</h2>
          <div className="flex flex-wrap items-end gap-2">
            <form action={setAgencyStatus} className="flex items-end gap-2">
              <input type="hidden" name="id" value={agency.id} />
              <div>
                <label className="label">Status</label>
                <select name="status" defaultValue={agency.subscription_status} className="input w-40">
                  {['incomplete', 'trialing', 'active', 'past_due', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <button className="btn-primary" type="submit">Set</button>
            </form>
            <form action={setAgencyPlan} className="flex items-end gap-2">
              <input type="hidden" name="id" value={agency.id} />
              <div>
                <label className="label">Plan</label>
                <select name="plan" defaultValue={agency.plan} className="input w-40">
                  {['starter', 'professional', 'enterprise'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button className="btn-primary" type="submit">Set</button>
            </form>
          </div>
          {agency.stripe_customer_id && (
            <p className="mt-3 text-xs text-slate-400">Stripe customer: {agency.stripe_customer_id}</p>
          )}
        </div>
        <div className="card border-red-200 p-5">
          <h2 className="mb-2 font-semibold text-red-600">Danger zone</h2>
          <p className="mb-3 text-sm text-slate-500">Deletes the agency and ALL its data (users, bookings, customers, invoices…). Cannot be undone.</p>
          <form action={deleteAgency}>
            <input type="hidden" name="id" value={agency.id} />
            <button className="btn bg-red-600 text-white hover:bg-red-700" type="submit">Delete agency permanently</button>
          </form>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Agency users</h2>
      <Table head={['Name', 'Role', 'Joined', 'Change role', '']}>
        {users.data?.length ? users.data.map((u) => (
          <tr key={u.id}>
            <td className="px-4 py-2 font-semibold">{u.full_name || '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={u.role} /></td>
            <td className="px-4 py-2">{new Date(u.created_at).toLocaleDateString()}</td>
            <td className="px-4 py-2">
              <form action={setUserRole} className="flex gap-2">
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="agency_id" value={agency.id} />
                <select name="role" defaultValue={u.role} className="input w-32 px-2 py-1 text-xs">
                  {['owner', 'manager', 'staff'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
              </form>
            </td>
            <td className="px-4 py-2"></td>
          </tr>
        )) : <Empty msg="No users." />}
      </Table>
    </div>
  );
}
