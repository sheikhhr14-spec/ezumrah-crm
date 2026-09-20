import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { setRecordStatus, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, StatusBadge } from '@/components/ui';
import Link from 'next/link';

export default async function FlightsPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requireModule('flights');
  const db = createAdminClient();
  const [{ data: records }, { data: bookings }, { data: customers }] = await Promise.all([
    db.from('flights').select('*, customers(full_name), bookings(booking_ref, customers(full_name))').eq('agency_id', ctx.profile.agency_id)
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
      <PageHeader title="Flights" subtitle={`${records?.length ?? 0} flight segments across all bookings`} />

      <form className="mb-4">
        <input className="input max-w-xs" name="q" placeholder="Search…" defaultValue={searchParams?.q || ''} />
        <button className="btn-secondary ml-2" type="submit">Search</button>
      </form>

      <Table head={['Booking', 'Airline / Flight', 'Route', 'Departs', 'Pax', 'Status', 'Actions']}>
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
                <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=flights&id=${r.id}`}>PDF</a>
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
