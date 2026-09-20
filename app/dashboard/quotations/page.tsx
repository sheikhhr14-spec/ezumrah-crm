import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import { createQuotation, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';

export default async function QuotationsPage() {
  const ctx = await requireModule('quotations');
  const cur = (ctx as any).agency?.currency;
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
      <Table head={['Quote', 'Customer', 'Valid until', 'Total', 'Status', 'Actions']}>
        {quotations?.length ? quotations.map((q) => (
          <tr key={q.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{q.quote_no}</td>
            <td className="px-4 py-2">{(q.customers as any | null)?.full_name || '—'}</td>
            <td className="px-4 py-2">{q.valid_until || '—'}</td>
            <td className="px-4 py-2 font-semibold">{money(Number(q.total), cur)}</td>
            <td className="px-4 py-2"><StatusBadge status={q.status} /></td>
            <td className="px-4 py-2"><div className="flex items-center gap-2">
              <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=quotation&id=${q.id}`}>PDF</a>
                <RowEdit table="quotations" id={q.id}><label className="text-[10px] text-slate-400">Valid until</label><input className="input px-2 py-1 text-xs" type="date" name="valid_until" defaultValue={q.valid_until || ''} /><label className="text-[10px] text-slate-400">Subtotal</label><input className="input px-2 py-1 text-xs" name="subtotal" defaultValue={q.subtotal || ''} /><label className="text-[10px] text-slate-400">Tax</label><input className="input px-2 py-1 text-xs" name="tax_amount" defaultValue={q.tax_amount || ''} /><label className="text-[10px] text-slate-400">Status</label><select className="input px-2 py-1 text-xs" name="status"><option value="draft" selected={q.status === "draft"}> draft</option><option value="sent" selected={q.status === "sent"}> sent</option><option value="accepted" selected={q.status === "accepted"}> accepted</option><option value="rejected" selected={q.status === "rejected"}> rejected</option><option value="expired" selected={q.status === "expired"}> expired</option></select></RowEdit>
              <form action={deleteRecord}><input type="hidden" name="table" value="quotations" /><input type="hidden" name="id" value={q.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
            </div></td>
          </tr>
        )) : <Empty msg="No quotations yet." />}
      </Table>
    </div>
  );
}
