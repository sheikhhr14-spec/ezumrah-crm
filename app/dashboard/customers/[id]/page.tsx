import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { PageHeader, Table, Empty, StatusBadge } from '@/components/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const ctx = await requireModule('customers');
  const db = createAdminClient();
  const { data: c } = await db.from('customers').select('*')
    .eq('id', params.id).eq('agency_id', ctx.profile.agency_id).single();
  if (!c) notFound();

  const [{ data: bookings }, { data: documents }] = await Promise.all([
    db.from('bookings').select('id, booking_ref, package_name, trip_type, status, departure_date, total_amount, paid_amount, currency')
      .eq('agency_id', ctx.profile.agency_id).eq('customer_id', c.id).order('created_at', { ascending: false }),
    db.from('documents').select('id, title, doc_type, expiry_date, file_url')
      .eq('agency_id', ctx.profile.agency_id).eq('customer_id', c.id),
  ]);

  const totalValue = (bookings || []).reduce((s, b) => s + Number(b.total_amount), 0);
  const totalPaid = (bookings || []).reduce((s, b) => s + Number(b.paid_amount), 0);

  return (
    <div>
      <div className="mb-2"><Link className="text-xs accent hover:underline" href="/dashboard/customers">← All customers</Link></div>
      <PageHeader title={c.full_name} subtitle={`Customer profile — ${c.country || 'country not set'}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Phone', value: c.phone || '—' },
          { label: 'WhatsApp', value: c.whatsapp || '—' },
          { label: 'Email', value: c.email || '—' },
          { label: 'Passport', value: c.passport_no || '—' },
        ].map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="mt-1 font-semibold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-sm text-slate-500">Bookings</p><p className="mt-1 text-2xl font-bold">{bookings?.length ?? 0}</p></div>
        <div className="card p-5"><p className="text-sm text-slate-500">Lifetime value</p><p className="mt-1 text-2xl font-bold">${totalValue.toLocaleString()}</p></div>
        <div className="card p-5"><p className="text-sm text-slate-500">Paid to date</p><p className="mt-1 text-2xl font-bold">${totalPaid.toLocaleString()}</p></div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Bookings</h2>
      <Table head={['Ref', 'Package', 'Type', 'Departure', 'Total', 'Paid', 'Status']}>
        {bookings?.length ? bookings.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50">
            <td className="px-4 py-2"><Link className="font-semibold accent hover:underline" href={`/dashboard/bookings/${b.id}`}>{b.booking_ref}</Link></td>
            <td className="px-4 py-2">{b.package_name || '—'}</td>
            <td className="px-4 py-2 capitalize">{b.trip_type}</td>
            <td className="px-4 py-2">{b.departure_date || '—'}</td>
            <td className="px-4 py-2">${Number(b.total_amount).toLocaleString()} {b.currency}</td>
            <td className="px-4 py-2">${Number(b.paid_amount).toLocaleString()}</td>
            <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No bookings for this customer yet." /></td></tr>}
      </Table>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Documents</h2>
      <Table head={['Title', 'Type', 'Expires', 'File']}>
        {documents?.length ? documents.map((d) => (
          <tr key={d.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{d.title}</td>
            <td className="px-4 py-2 capitalize">{(d.doc_type || '').replace(/_/g, ' ')}</td>
            <td className="px-4 py-2">{d.expiry_date || '—'}</td>
            <td className="px-4 py-2">{d.file_url ? <a className="accent hover:underline" href={d.file_url} target="_blank" rel="noreferrer">Open</a> : '—'}</td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No documents for this customer." /></td></tr>}
      </Table>

      {c.notes && (
        <div className="card mt-6 p-5">
          <p className="text-sm text-slate-500">Notes</p>
          <p className="mt-1 text-slate-700">{c.notes}</p>
        </div>
      )}
    </div>
  );
}
