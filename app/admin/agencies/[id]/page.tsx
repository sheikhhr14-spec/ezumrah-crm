import { createAdminClient } from '@/lib/supabase/admin';
import { updateAgency, deleteAgency, setUserRole, deleteUser, setAgencyLogoAdmin } from '@/lib/admin-actions';
import { PageHeader, StatusBadge, Table, Empty, Field } from '@/components/ui';
import Link from 'next/link';
import AccentPicker from '@/components/AccentPicker';
import { notFound } from 'next/navigation';

const STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'suspended'];

export default async function AgencyDetail({ params }: { params: { id: string } }) {
  const db = createAdminClient();
  const { data: agency } = await db.from('agencies').select('*').eq('id', params.id).single();
  if (!agency) notFound();

  const [users, bookings, customers, invoices, pkgs, saasInvoices, tickets] = await Promise.all([
    db.from('profiles').select('id, full_name, email, role, created_at').eq('agency_id', agency.id).order('created_at'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
    db.from('customers').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
    db.from('invoices').select('total, status, currency').eq('agency_id', agency.id),
    db.from('packages').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id),
    db.from('platform_invoices').select('*').eq('agency_id', agency.id).order('created_at', { ascending: false }),
    db.from('support_tickets').select('*').eq('agency_id', agency.id).order('created_at', { ascending: false }).limit(5),
  ]);

  const revenue = (invoices.data || []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.total), 0);
  const saasPaid = (saasInvoices.data || []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0);

  const stats = [
    { label: 'Users', value: users.data?.length || 0 },
    { label: 'Bookings', value: bookings.count || 0 },
    { label: 'Customers', value: customers.count || 0 },
    { label: 'Packages', value: pkgs.count || 0 },
    { label: 'CRM revenue (paid)', value: `$${revenue.toLocaleString()}` },
    { label: 'SaaS paid', value: `$${saasPaid.toLocaleString()}` },
  ];


  return (
    <div>
      <div className="card mb-6 flex flex-wrap items-center gap-4 p-4">
        {agency.logo_url ? <img src={agency.logo_url} alt="logo" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-2xl">🏢</div>}
        <form action={setAgencyLogoAdmin} className="flex flex-col gap-1">
          <input type="hidden" name="id" value={agency.id} />
          <input type="file" name="file" accept="image/png,image/jpeg" className="text-xs" />
          <button className="btn-secondary px-3 py-1 text-xs" type="submit">Upload logo</button>
        </form>
        {agency.logo_url && (
          <form action={setAgencyLogoAdmin}>
            <input type="hidden" name="id" value={agency.id} /><input type="hidden" name="remove_logo" value="true" />
            <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Remove logo</button>
          </form>
        )}
        <p className="text-xs text-slate-400">Tenant logo — shows in the agency sidebar, invoices and emails.</p>
      </div>
      <Link className="text-sm text-slate-400 hover:text-gold" href="/admin/agencies">← All agencies</Link>

      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            {agency.brand_color && <span className="h-4 w-4 rounded-full" style={{ background: agency.brand_color }} />}
            {agency.name}
            {agency.label && <span className="badge accent-soft-bg accent">{agency.label}</span>}
          </h1>
          <p className="text-sm text-slate-500">
            Joined {new Date(agency.created_at).toLocaleDateString()} · <StatusBadge status={agency.subscription_status} /> · <span className="capitalize">{agency.plan}</span> plan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/admin/invoices?agency=${agency.id}`} className="btn-secondary text-xs">SaaS invoices</Link>
          <form action={deleteAgency}>
            <input type="hidden" name="id" value={agency.id} />
            <button className="btn border border-red-200 bg-red-50 text-xs text-red-600 hover:bg-red-100" type="submit">Delete agency</button>
          </form>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="stat-label">{s.label}</p>
            <p className="stat-num mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Edit agency */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Edit agency</h2>
        <form action={updateAgency} className="grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="id" value={agency.id} />
          <Field label="Agency name"><input className="input" name="name" defaultValue={agency.name} required /></Field>
          <Field label="Email"><input className="input" name="email" type="email" defaultValue={agency.email || ''} /></Field>
          <Field label="Label (tag)"><input className="input" name="label" defaultValue={agency.label || ''} placeholder="VIP, Priority…" /></Field>
          <Field label="Plan">
            <select className="input" name="plan" defaultValue={agency.plan}>
              <option value="starter">Starter ($29)</option>
              <option value="professional">Professional ($79)</option>
              <option value="enterprise">Enterprise ($199)</option>
            </select>
          </Field>
          <Field label="Subscription status (access control)">
            <select className="input" name="subscription_status" defaultValue={agency.subscription_status}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="Trial ends">
            <input className="input" name="trial_ends_at" type="date"
              defaultValue={agency.trial_ends_at ? String(agency.trial_ends_at).slice(0, 10) : ''} />
          </Field>
          <div>
            <label className="label">Brand color (applies to their CRM)</label>
            <AccentPicker current={agency.brand_color || '#b8923f'} name="brand_color" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button className="btn-primary" type="submit">Save changes</button>
            <span className="text-xs text-slate-400">Status &ldquo;suspended&rdquo; or &ldquo;canceled&rdquo; blocks their CRM access.</span>
          </div>
        </form>
      </div>

      {/* Tenant users */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Team members ({users.data?.length || 0})</h2>
        <Table head={['Name', 'Email', 'Role', 'Change role', 'Remove']}>
          {users.data?.length ? users.data.map((u: any) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold">{u.full_name || '—'}</td>
              <td className="px-4 py-2 text-slate-500">{u.email}</td>
              <td className="px-4 py-2"><StatusBadge status={u.role} /></td>
              <td className="px-4 py-2">
                <form action={setUserRole} className="flex gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="agency_id" value={agency.id} />
                  <select name="role" defaultValue={u.role} className="input max-w-32">
                    <option value="owner">owner</option>
                    <option value="manager">manager</option>
                    <option value="staff">staff</option>
                  </select>
                  <button className="btn-secondary text-xs" type="submit">Set</button>
                </form>
              </td>
              <td className="px-4 py-2">
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="agency_id" value={agency.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Remove</button>
                </form>
              </td>
            </tr>
          )) : <tr><td colSpan={5}><Empty msg="No users in this agency yet." /></td></tr>}
        </Table>
      </div>

      {/* SaaS invoices */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-900">SaaS billing history</h2>
        <Table head={['Invoice #', 'Plan', 'Amount', 'Status', 'Period', 'Paid at']}>
          {saasInvoices.data?.length ? saasInvoices.data.map((i: any) => (
            <tr key={i.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold">{i.number}</td>
              <td className="px-4 py-2 capitalize">{i.plan}</td>
              <td className="px-4 py-2">${Number(i.amount).toLocaleString()}</td>
              <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
              <td className="px-4 py-2 text-slate-400">{i.period_start} → {i.period_end}</td>
              <td className="px-4 py-2 text-slate-400">{i.paid_at ? new Date(i.paid_at).toLocaleDateString() : '—'}</td>
            </tr>
          )) : <tr><td colSpan={6}><Empty msg="No SaaS invoices raised." /></td></tr>}
        </Table>
      </div>

      {/* Support tickets */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Recent support tickets</h2>
        <div className="space-y-2">
          {tickets.data?.length ? tickets.data.map((t: any) => (
            <Link key={t.id} href={`/admin/support/${t.id}`} className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{t.subject}</p>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{t.priority} priority · {new Date(t.created_at).toLocaleDateString()}</p>
            </Link>
          )) : <Empty msg="No tickets from this agency." />}
        </div>
      </div>
    </div>
  );
}
