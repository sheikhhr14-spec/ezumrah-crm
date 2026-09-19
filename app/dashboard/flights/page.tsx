import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { addFlight, setRecordStatus, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';
import Link from 'next/link';

export default async function FlightsPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requireModule('flights');
  const db = createAdminClient();
  const [{ data: records }, { data: bookings }] = await Promise.all([
    db.from('flights').select('*, bookings(booking_ref, customers(full_name))').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }),
    db.from('bookings').select('id, booking_ref, package_name').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }).limit(100),
  ]);

  const q = (searchParams?.q || '').toLowerCase();
  const list = (records || []).filter((r: any) => !q || JSON.stringify(r).toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title="Flights" subtitle={`${records?.length ?? 0} flight segments across all bookings`} />

      <AddPanel label="Add flight">
        <form action={addFlight} className="grid gap-4 sm:grid-cols-3">
          <Field label="Booking *">
            <select className="input" name="booking_id" required>
              <option value="">Select booking…</option>
              {(bookings || []).map((b: any) => (
                <option key={b.id} value={b.id}>{b.booking_ref} — {b.package_name || 'trip'}</option>
              ))}
            </select>
          </Field>
          <Field label="Airline *"><input className="input" name="airline" required /></Field>
          <Field label="Flight no."><input className="input" name="flight_no"  /></Field>
          <Field label="Departure airport"><input className="input" name="departure_airport"  /></Field>
          <Field label="Arrival airport"><input className="input" name="arrival_airport"  /></Field>
          <Field label="Departure time"><input className="input" name="departure_time" type="datetime-local" /></Field>
          <Field label="Arrival time"><input className="input" name="arrival_time" type="datetime-local" /></Field>
          <Field label="Passengers"><input className="input" name="pax_count" type="number" /></Field>
          <Field label="Cabin class"><input className="input" name="cabin_class" placeholder="economy / business" /></Field>
          <Field label="Confirmation code"><input className="input" name="confirmation_code"  /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save flight</button></div>
        </form>
      </AddPanel>

      <form className="mb-4">
        <input className="input max-w-xs" name="q" placeholder="Search…" defaultValue={searchParams?.q || ''} />
        <button className="btn-secondary ml-2" type="submit">Search</button>
      </form>

      <Table head={['Booking', 'Airline / Flight', 'Route', 'Departs', 'Pax', 'Status', 'Actions']}>
        {list.length ? list.map((r: any) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-2">
              <Link href={`/dashboard/bookings/${r.booking_id}`} className="font-semibold accent hover:underline">
                {r.bookings?.booking_ref || '—'}
              </Link>
            </td>
            <td className="px-4 py-2">{r.airline || '—'} <span className="text-xs text-slate-400">{r.flight_no || ''}</span></td>
            <td className="px-4 py-2">{r.departure_airport || '—'} → {r.arrival_airport || '—'}</td>
            <td className="px-4 py-2">{r.departure_time ? new Date(r.departure_time).toLocaleString() : '—'}</td>
            <td className="px-4 py-2">{r.pax_count}</td>
            <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <form action={setRecordStatus} className="flex gap-1">
                  <input type="hidden" name="table" value="flights" />
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} className="input max-w-28 px-2 py-1 text-xs">
                    <option value="scheduled">scheduled</option>
                    <option value="confirmed">confirmed</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
                </form>
                <RowEdit table="flights" id={r.id}><label className="text-[10px] text-slate-400">Airline</label><input className="input px-2 py-1 text-xs" name="airline" defaultValue={r.airline || ''} /><label className="text-[10px] text-slate-400">Flight no</label><input className="input px-2 py-1 text-xs" name="flight_no" defaultValue={r.flight_no || ''} /><label className="text-[10px] text-slate-400">From</label><input className="input px-2 py-1 text-xs" name="departure_airport" defaultValue={r.departure_airport || ''} /><label className="text-[10px] text-slate-400">To</label><input className="input px-2 py-1 text-xs" name="arrival_airport" defaultValue={r.arrival_airport || ''} /><label className="text-[10px] text-slate-400">Pax</label><input className="input px-2 py-1 text-xs" name="pax_count" defaultValue={r.pax_count || ''} /><label className="text-[10px] text-slate-400">Cabin</label><input className="input px-2 py-1 text-xs" name="cabin_class" defaultValue={r.cabin_class || ''} /><label className="text-[10px] text-slate-400">Confirm code</label><input className="input px-2 py-1 text-xs" name="confirmation_code" defaultValue={r.confirmation_code || ''} /><label className="text-[10px] text-slate-400">Status</label><select className="input px-2 py-1 text-xs" name="status"><option value="scheduled" selected={r.status === "scheduled"}> scheduled</option><option value="confirmed" selected={r.status === "confirmed"}> confirmed</option><option value="cancelled" selected={r.status === "cancelled"}> cancelled</option><option value="completed" selected={r.status === "completed"}> completed</option></select></RowEdit>
                <form action={deleteRecord}>
                  <input type="hidden" name="table" value="flights" />
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No flight records yet." /></td></tr>}
      </Table>
    </div>
  );
}
