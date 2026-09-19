import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { createBooking, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';
import Link from 'next/link';

export default async function BookingsPage() {
  const ctx = await requireModule('bookings');
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
      <Table head={['Ref', 'Customer', 'Package', 'Type', 'Pilgrims', 'Departure', 'Amount', 'Status', 'Actions']}>
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
            <td className="px-4 py-2"><div className="flex items-center gap-2">
              <RowEdit table="bookings" id={b.id}><label className="text-[10px] text-slate-400">Package</label><input className="input px-2 py-1 text-xs" name="package_name" defaultValue={b.package_name || ''} /><label className="text-[10px] text-slate-400">Type</label><select className="input px-2 py-1 text-xs" name="trip_type"><option value="umrah"selected={b.trip_type === "umrah"}>umrah</option><option value="hajj"selected={b.trip_type === "hajj"}>hajj</option><option value="holiday"selected={b.trip_type === "holiday"}>holiday</option></select><label className="text-[10px] text-slate-400">Status</label><select className="input px-2 py-1 text-xs" name="status"><option value="pending"selected={b.status === "pending"}>pending</option><option value="confirmed"selected={b.status === "confirmed"}>confirmed</option><option value="in_progress"selected={b.status === "in_progress"}>in progress</option><option value="completed"selected={b.status === "completed"}>completed</option><option value="cancelled"selected={b.status === "cancelled"}>cancelled</option></select><label className="text-[10px] text-slate-400">Pilgrims</label><input className="input px-2 py-1 text-xs" name="pilgrims_count" defaultValue={b.pilgrims_count || ''} /><label className="text-[10px] text-slate-400">Departure</label><input className="input px-2 py-1 text-xs" type="date" name="departure_date" defaultValue={b.departure_date || ''} /><label className="text-[10px] text-slate-400">Return</label><input className="input px-2 py-1 text-xs" type="date" name="return_date" defaultValue={b.return_date || ''} /><label className="text-[10px] text-slate-400">Total</label><input className="input px-2 py-1 text-xs" name="total_amount" defaultValue={b.total_amount || ''} /><label className="text-[10px] text-slate-400">Paid</label><input className="input px-2 py-1 text-xs" name="paid_amount" defaultValue={b.paid_amount || ''} /></RowEdit>
              <form action={deleteRecord}><input type="hidden" name="table" value="bookings" /><input type="hidden" name="id" value={b.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
            </div></td>
          </tr>
        )) : <Empty msg="No bookings yet." />}
      </Table>
    </div>
  );
}
