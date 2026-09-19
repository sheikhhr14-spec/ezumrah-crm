import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';
import { createBooking } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';
import Link from 'next/link';

export default async function BookingsPage() {
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const [{ data: bookings }, { data: customers }, { data: packages }] = await Promise.all([
    db.from('bookings').select('*, customers(full_name)').eq('agency_id', aid).order('created_at', { ascending: false }),
    db.from('customers').select('id, full_name').eq('agency_id', aid),
    db.from('packages').select('name').eq('agency_id', aid).eq('is_active', true),
  ]);

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Umrah, Hajj & holiday bookings" />
      <AddPanel label="New booking">
        <form action={createBooking} className="grid gap-4 sm:grid-cols-3">
          <Field label="Customer *">
            <select className="input" name="customer_id" required>
              <option value="">Select customer</option>
              {customers?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </Field>
          <Field label="Package"><input className="input" name="package_name" list="pkg-names" /></Field>
          <datalist id="pkg-names">{packages?.map((p) => <option key={p.name} value={p.name} />)}</datalist>
          <Field label="Trip type">
            <select className="input" name="trip_type"><option value="umrah">Umrah</option><option value="hajj">Hajj</option><option value="holiday">Holiday</option></select>
          </Field>
          <Field label="Pilgrims"><input className="input" name="pilgrims_count" type="number" min="1" defaultValue={1} /></Field>
          <Field label="Departure date"><input className="input" name="departure_date" type="date" /></Field>
          <Field label="Return date"><input className="input" name="return_date" type="date" /></Field>
          <Field label="Total amount"><input className="input" name="total_amount" type="number" step="0.01" /></Field>
          <Field label="Source"><input className="input" name="source" placeholder="WhatsApp / referral / walk-in" /></Field>
          <Field label="Notes" span><input className="input" name="notes" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Create booking</button></div>
        </form>
      </AddPanel>
      <Table head={['Ref', 'Customer', 'Package', 'Type', 'Pilgrims', 'Departure', 'Amount', 'Status']}>
        {bookings?.length ? bookings.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50">
            <td className="px-4 py-2"><Link className="font-semibold text-gold hover:underline" href={`/dashboard/bookings/${b.id}`}>{b.booking_ref}</Link></td>
            <td className="px-4 py-2">{(b.customers as any | null)?.full_name}</td>
            <td className="px-4 py-2">{b.package_name || '—'}</td>
            <td className="px-4 py-2 capitalize">{b.trip_type}</td>
            <td className="px-4 py-2">{b.pilgrims_count}</td>
            <td className="px-4 py-2">{b.departure_date || '—'}</td>
            <td className="px-4 py-2">${Number(b.total_amount).toLocaleString()} {b.currency}</td>
            <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
          </tr>
        )) : <Empty msg="No bookings yet." />}
      </Table>
    </div>
  );
}
