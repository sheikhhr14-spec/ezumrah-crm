import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';
import { createQuotation } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';

export default async function QuotationsPage() {
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const [{ data: quotations }, { data: customers }] = await Promise.all([
    db.from('quotations').select('*, customers(full_name)').eq('agency_id', aid).order('created_at', { ascending: false }),
    db.from('customers').select('id, full_name').eq('agency_id', aid),
  ]);

  return (
    <div>
      <PageHeader title="Quotations" subtitle="Send quotes, convert to bookings" />
      <AddPanel label="Create quotation">
        <form action={createQuotation} className="grid gap-4 sm:grid-cols-3">
          <Field label="Customer">
            <select className="input" name="customer_id">
              <option value="">— select —</option>
              {customers?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </Field>
          <Field label="Valid until"><input className="input" name="valid_until" type="date" /></Field>
          <Field label="Status"><select className="input" name="status">{['draft', 'sent', 'accepted', 'rejected', 'expired'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Subtotal"><input className="input" name="subtotal" type="number" step="0.01" required /></Field>
          <Field label="Tax"><input className="input" name="tax_amount" type="number" step="0.01" /></Field>
          <Field label="Notes"><input className="input" name="notes" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save quotation</button></div>
        </form>
      </AddPanel>
      <Table head={['Quote', 'Customer', 'Valid until', 'Total', 'Status']}>
        {quotations?.length ? quotations.map((q) => (
          <tr key={q.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{q.quote_no}</td>
            <td className="px-4 py-2">{(q.customers as any | null)?.full_name || '—'}</td>
            <td className="px-4 py-2">{q.valid_until || '—'}</td>
            <td className="px-4 py-2 font-semibold">${Number(q.total).toLocaleString()} {q.currency}</td>
            <td className="px-4 py-2"><StatusBadge status={q.status} /></td>
          </tr>
        )) : <Empty msg="No quotations yet." />}
      </Table>
    </div>
  );
}
