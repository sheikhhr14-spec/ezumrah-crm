import { createAdminClient } from '@/lib/supabase/admin';
import { createInvoice, markInvoicePaid, voidInvoice, deleteInvoice } from '@/lib/admin-actions';
import { PageHeader, StatusBadge, Table, Empty, AddPanel, Field } from '@/components/ui';
import Link from 'next/link';

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string, agency?: string } }) {
  const db = createAdminClient();
  const [{ data: invoices }, { data: agencies }] = await Promise.all([
    db.from('platform_invoices').select('*, agencies(name)').order('created_at', { ascending: false }),
    db.from('agencies').select('id, name').order('name'),
  ]);

  const status = searchParams?.status || '';
  const agencyFilter = searchParams?.agency || '';
  const list = (invoices || []).filter((i: any) =>
    (!status || i.status === status) && (!agencyFilter || i.agency_id === agencyFilter));

  const all = invoices || [];
  const paid = all.filter((i: any) => i.status === 'paid');
  const open = all.filter((i: any) => i.status === 'open');

  const stats = [
    { label: 'Total invoiced', value: `$${all.reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString()}` },
    { label: 'Collected (paid)', value: `$${paid.reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString()}` },
    { label: 'Outstanding (open)', value: `$${open.reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString()}` },
    { label: 'Invoices', value: all.length },
  ];

  return (
    <div>
      <PageHeader title="Invoices & Payments" subtitle="SaaS billing raised on tenant agencies" />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="stat-label">{s.label}</p>
            <p className="stat-num mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <AddPanel label="Raise invoice for agency">
        <form action={createInvoice} className="grid gap-4 sm:grid-cols-3">
          <Field label="Agency">
            <select className="input" name="agency_id" required>
              <option value="">Select agency…</option>
              {(agencies || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Plan"><input className="input" name="plan" defaultValue="starter" /></Field>
          <Field label="Amount (USD)"><input className="input" name="amount" type="number" step="0.01" required placeholder="29" /></Field>
          <Field label="Period start"><input className="input" name="period_start" type="date" /></Field>
          <Field label="Period end"><input className="input" name="period_end" type="date" /></Field>
          <div className="flex items-end"><button className="btn-primary" type="submit">Create invoice</button></div>
        </form>
      </AddPanel>

      <form className="mb-4 flex flex-wrap gap-2">
        <select className="input max-w-40" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          <option value="open">open</option>
          <option value="paid">paid</option>
          <option value="void">void</option>
        </select>
        <select className="input max-w-56" name="agency" defaultValue={agencyFilter}>
          <option value="">All agencies</option>
          {(agencies || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>

      <Table head={['Invoice #', 'Agency', 'Plan', 'Amount', 'Status', 'Paid at', 'Actions']}>
        {list.length ? list.map((i: any) => (
          <tr key={i.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold"><Link className="hover:underline" href={`/admin/invoices/${i.id}`}>{i.number}</Link></td>
            <td className="px-4 py-2"><Link className="hover:underline" href={`/admin/agencies/${i.agency_id}`}>{i.agencies?.name || '—'}</Link></td>
            <td className="px-4 py-2 capitalize">{i.plan}</td>
            <td className="px-4 py-2">${Number(i.amount).toLocaleString()}</td>
            <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
            <td className="px-4 py-2 text-slate-400">{i.paid_at ? new Date(i.paid_at).toLocaleDateString() : '—'}</td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                {i.status === 'open' && (
                  <form action={markInvoicePaid} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={i.id} />
                    <input className="input max-w-32" name="stripe_payment_id" placeholder="Payment ref (optional)" />
                    <button className="text-xs font-semibold accent hover:underline" type="submit">Mark paid</button>
                  </form>
                )}
                {i.status !== 'void' && i.status !== 'paid' && (
                  <form action={voidInvoice}><input type="hidden" name="id" value={i.id} />
                    <button className="text-xs font-semibold text-slate-500 hover:underline" type="submit">Void</button></form>
                )}
                <form action={deleteInvoice}><input type="hidden" name="id" value={i.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
              </div>
            </td>
          </tr>
        )) : <tr><td colSpan={7}><Empty msg="No invoices yet. Raise one above." /></td></tr>}
      </Table>
    </div>
  );
}
