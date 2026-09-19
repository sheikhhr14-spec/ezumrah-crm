import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';
import { createInvoice } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';

export default async function InvoicesPage() {
  const ctx = await requireActiveAgency();
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
      <Table head={['Invoice', 'Booking', 'Issued', 'Due', 'Total', 'Status']}>
        {invoices?.length ? invoices.map((i) => (
          <tr key={i.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{i.invoice_no}</td>
            <td className="px-4 py-2">{(i.bookings as any | null)?.booking_ref || '—'}</td>
            <td className="px-4 py-2">{i.issue_date}</td>
            <td className="px-4 py-2">{i.due_date || '—'}</td>
            <td className="px-4 py-2 font-semibold">${Number(i.total).toLocaleString()} {i.currency}</td>
            <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
          </tr>
        )) : <Empty msg="No invoices yet." />}
      </Table>
    </div>
  );
}
