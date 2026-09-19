import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { addTransport, setRecordStatus, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';
import Link from 'next/link';

export default async function TransportsPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requireModule('transports');
  const db = createAdminClient();
  const [{ data: records }, { data: bookings }, { data: customers }] = await Promise.all([
    db.from('transports').select('*, customers(full_name), bookings(booking_ref, customers(full_name))').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }),
    db.from('bookings').select('id, booking_ref, package_name').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }).limit(100),
    db.from('customers').select('id, full_name').eq('agency_id', ctx.profile.agency_id)
      .order('full_name').limit(500),
  ]);

  const q = (searchParams?.q || '').toLowerCase();
  const list = (records || []).filter((r: any) => !q || JSON.stringify(r).toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title="Transports" subtitle={`${records?.length ?? 0} ground transfers across all bookings`} />

      <AddPanel label="Add transport">
        <form action={addTransport} className="grid gap-4 sm:grid-cols-3">
          <Field label="Booking">
            <select className="input" name="booking_id">
              <option value="">— Standalone (no booking) —</option>
              {(bookings || []).map((b: any) => (
                <option key={b.id} value={b.id}>{b.booking_ref} — {b.package_name || 'trip'}</option>
              ))}
            </select>
          </Field>
          <Field label="Customer (standalone)">
            <select className="input" name="customer_id">
              <option value="">— none —</option>
              {(customers || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount (USD)"><input className="input" name="amount" type="number" step="0.01" /></Field>
          <Field label="Type"><input className="input" name="transport_type" placeholder="airport_transfer / ziyarah" /></Field>
          <Field label="From"><input className="input" name="from_location"  /></Field>
          <Field label="To"><input className="input" name="to_location"  /></Field>
          <Field label="Date"><input className="input" name="transport_date" type="date" /></Field>
          <Field label="Time"><input className="input" name="transport_time" placeholder="14:30" /></Field>
          <Field label="Vehicle"><input className="input" name="vehicle_type" placeholder="Bus 45 / GMC / Hiace" /></Field>
          <Field label="Seats"><input className="input" name="seats" type="number" /></Field>
          <Field label="Driver name"><input className="input" name="driver_name"  /></Field>
          <Field label="Driver phone"><input className="input" name="driver_phone"  /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save transport</button></div>
        </form>
      </AddPanel>

      <form className="mb-4">
        <input className="input max-w-xs" name="q" placeholder="Search…" defaultValue={searchParams?.q || ''} />
        <button className="btn-secondary ml-2" type="submit">Search</button>
      </form>

      <Table head={['Booking', 'Type', 'From → To', 'Date / Time', 'Vehicle', 'Driver', 'Status', 'Actions']}>
        {list.length ? list.map((r: any) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-2">
              {r.booking_id ? (
                <>
                  <Link href={`/dashboard/bookings/${r.booking_id}`} className="font-semibold accent hover:underline">
                    {r.bookings?.booking_ref || '—'}
                  </Link>
                  <br /><span className="text-xs text-slate-400">{r.bookings?.customers?.full_name || ''}</span>
                </>
              ) : (
                <>
                  <span className="badge bg-slate-100 text-slate-500">standalone</span>
                  <br /><span className="text-xs font-semibold">{r.customers?.full_name || '—'}</span>
                </>
              )}
            </td>
            <td className="px-4 py-2">{r.transport_type.replace(/_/g,' ')}</td>
            <td className="px-4 py-2">{r.from_location || '—'} → {r.to_location || '—'}</td>
            <td className="px-4 py-2">{r.transport_date || '—'} {r.transport_time || ''}</td>
            <td className="px-4 py-2">{r.vehicle_type || '—'} {r.seats ? `(${r.seats} seats)` : ''}</td>
            <td className="px-4 py-2">{r.driver_name || '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <form action={setRecordStatus} className="flex gap-1">
                  <input type="hidden" name="table" value="transports" />
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} className="input max-w-28 px-2 py-1 text-xs">
                    <option value="scheduled">scheduled</option>
                    <option value="confirmed">confirmed</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
                </form>
                <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=transports&id=${r.id}`}>PDF</a>
                <RowEdit table="transports" id={r.id}><label className="text-[10px] text-slate-400">Type</label><select className="input px-2 py-1 text-xs" name="transport_type"><option value="airport_transfer" selected={r.transport_type === "airport_transfer"}> airport transfer</option><option value="intercity" selected={r.transport_type === "intercity"}> intercity</option><option value="local" selected={r.transport_type === "local"}> local</option><option value="ziyarah" selected={r.transport_type === "ziyarah"}> ziyarah</option></select><label className="text-[10px] text-slate-400">From</label><input className="input px-2 py-1 text-xs" name="from_location" defaultValue={r.from_location || ''} /><label className="text-[10px] text-slate-400">To</label><input className="input px-2 py-1 text-xs" name="to_location" defaultValue={r.to_location || ''} /><label className="text-[10px] text-slate-400">Date</label><input className="input px-2 py-1 text-xs" type="date" name="transport_date" defaultValue={r.transport_date || ''} /><label className="text-[10px] text-slate-400">Time</label><input className="input px-2 py-1 text-xs" name="transport_time" defaultValue={r.transport_time || ''} /><label className="text-[10px] text-slate-400">Vehicle</label><input className="input px-2 py-1 text-xs" name="vehicle_type" defaultValue={r.vehicle_type || ''} /><label className="text-[10px] text-slate-400">Seats</label><input className="input px-2 py-1 text-xs" name="seats" defaultValue={r.seats || ''} /><label className="text-[10px] text-slate-400">Driver</label><input className="input px-2 py-1 text-xs" name="driver_name" defaultValue={r.driver_name || ''} /><label className="text-[10px] text-slate-400">Driver phone</label><input className="input px-2 py-1 text-xs" name="driver_phone" defaultValue={r.driver_phone || ''} /><label className="text-[10px] text-slate-400">Status</label><select className="input px-2 py-1 text-xs" name="status"><option value="scheduled" selected={r.status === "scheduled"}> scheduled</option><option value="confirmed" selected={r.status === "confirmed"}> confirmed</option><option value="completed" selected={r.status === "completed"}> completed</option><option value="cancelled" selected={r.status === "cancelled"}> cancelled</option></select></RowEdit>
                <form action={deleteRecord}>
                  <input type="hidden" name="table" value="transports" />
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No transport records yet." /></td></tr>}
      </Table>
    </div>
  );
}
