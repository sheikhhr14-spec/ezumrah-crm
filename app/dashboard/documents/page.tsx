import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { addDocument } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, AddPanel, Field } from '@/components/ui';

export default async function DocumentsPage() {
  const ctx = await requireModule('documents');
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const [{ data: documents }, { data: bookings }] = await Promise.all([
    db.from('documents').select('*, bookings(booking_ref), customers(full_name)').eq('agency_id', aid).order('created_at', { ascending: false }),
    db.from('bookings').select('id, booking_ref').eq('agency_id', aid),
  ]);

  return (
    <div>
      <PageHeader title="Document Vault" subtitle="Passports, visas, tickets & vouchers" />
      <AddPanel label="Add document">
        <form action={addDocument} className="grid gap-4 sm:grid-cols-3">
          <Field label="Title *"><input className="input" name="title" required placeholder="Passport — Ahmed Ali" /></Field>
          <Field label="Type"><select className="input" name="doc_type">{['passport', 'visa', 'ticket', 'hotel_voucher', 'transport_voucher', 'invoice', 'other'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></Field>
          <Field label="Booking"><select className="input" name="booking_id"><option value="">— none —</option>{bookings?.map((b) => <option key={b.id} value={b.id}>{b.booking_ref}</option>)}</select></Field>
          <Field label="File URL (Supabase Storage)"><input className="input" name="file_url" placeholder="https://...supabase.co/storage/v1/..." /></Field>
          <Field label="Expires"><input className="input" name="expiry_date" type="date" /></Field>
          <Field label="Notes"><input className="input" name="notes" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save document</button></div>
        </form>
      </AddPanel>
      <Table head={['Title', 'Type', 'Booking', 'Customer', 'Expires', 'File']}>
        {documents?.length ? documents.map((d) => (
          <tr key={d.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{d.title}</td>
            <td className="px-4 py-2 capitalize">{d.doc_type.replace(/_/g, ' ')}</td>
            <td className="px-4 py-2">{(d.bookings as any | null)?.booking_ref || '—'}</td>
            <td className="px-4 py-2">{(d.customers as any | null)?.full_name || '—'}</td>
            <td className="px-4 py-2">{d.expiry_date || '—'}</td>
            <td className="px-4 py-2">{d.file_url ? <a className="text-gold hover:underline" href={d.file_url} target="_blank" rel="noreferrer">Open</a> : '—'}</td>
          </tr>
        )) : <Empty msg="No documents yet." />}
      </Table>
    </div>
  );
}
