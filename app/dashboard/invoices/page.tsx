import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { createInvoice, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';

export default async function InvoicesPage() {
  const ctx = await requireModule('invoices');
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const [{ data: invoices }, { data: bookings }] = await Promise.all([
    db.from('invoices').select('*, bookings(booking_ref)').eq('agency_id', aid).order('created_at', { ascending: false }),
    db.from('bookings').select('id, booking_ref').eq('agency_id', aid),
  ]);

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Billing & payments" />
      <AddPanel label="Create invoice">
        <form action={createInvoice} className="grid gap-4 sm:grid-cols-3">
          <Field label="Booking">
            <select className="input" name="booking_id">
              <option value="">— none —</option>
              {bookings?.map((b) => <option key={b.id} value={b.id}>{b.booking_ref}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input className="input" name="due_date" type="date" /></Field>
          <Field label="Status"><select className="input" name="status">{['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Subtotal"><input className="input" name="subtotal" type="number" step="0.01" required /></Field>
          <Field label="Tax"><input className="input" name="tax_amount" type="number" step="0.01" /></Field>
          <Field label="Notes"><input className="input" name="notes" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save invoice</button></div>
        </form>
      </AddPanel>
      <Table head={['Invoice', 'Booking', 'Issued', 'Due', 'Total', 'Status', 'Actions']}>
        {invoices?.length ? invoices.map((i) => (
          <tr key={i.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{i.invoice_no}</td>
            <td className="px-4 py-2">{(i.bookings as any | null)?.booking_ref || '—'}</td>
            <td className="px-4 py-2">{i.issue_date}</td>
            <td className="px-4 py-2">{i.due_date || '—'}</td>
            <td className="px-4 py-2 font-semibold">${Number(i.total).toLocaleString()} {i.currency}</td>
            <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
            <td className="px-4 py-2"><div className="flex items-center gap-2">
              <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=invoice&id=${i.id}`}>PDF</a>
                <RowEdit table="invoices" id={i.id}><label className="text-[10px] text-slate-400">Issue date</label><input className="input px-2 py-1 text-xs" type="date" name="issue_date" defaultValue={i.issue_date || ''} /><label className="text-[10px] text-slate-400">Due date</label><input className="input px-2 py-1 text-xs" type="date" name="due_date" defaultValue={i.due_date || ''} /><label className="text-[10px] text-slate-400">Subtotal</label><input className="input px-2 py-1 text-xs" name="subtotal" defaultValue={i.subtotal || ''} /><label className="text-[10px] text-slate-400">Tax</label><input className="input px-2 py-1 text-xs" name="tax_amount" defaultValue={i.tax_amount || ''} /><label className="text-[10px] text-slate-400">Total</label><input className="input px-2 py-1 text-xs" name="total" defaultValue={i.total || ''} /><label className="text-[10px] text-slate-400">Status</label><select className="input px-2 py-1 text-xs" name="status"><option value="draft" selected={i.status === "draft"}> draft</option><option value="sent" selected={i.status === "sent"}> sent</option><option value="paid" selected={i.status === "paid"}> paid</option><option value="partial" selected={i.status === "partial"}> partial</option><option value="overdue" selected={i.status === "overdue"}> overdue</option><option value="cancelled" selected={i.status === "cancelled"}> cancelled</option></select></RowEdit>
              <form action={deleteRecord}><input type="hidden" name="table" value="invoices" /><input type="hidden" name="id" value={i.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
            </div></td>
          </tr>
        )) : <Empty msg="No invoices yet." />}
      </Table>
    </div>
  );
}
