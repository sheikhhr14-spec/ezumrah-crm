import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { addHotel, setRecordStatus, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';
import Link from 'next/link';

export default async function HotelsPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requireModule('hotels');
  const db = createAdminClient();
  const [{ data: records }, { data: bookings }] = await Promise.all([
    db.from('hotels').select('*, bookings(booking_ref, customers(full_name))').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }),
    db.from('bookings').select('id, booking_ref, package_name').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }).limit(100),
  ]);

  const q = (searchParams?.q || '').toLowerCase();
  const list = (records || []).filter((r: any) => !q || JSON.stringify(r).toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title="Hotels" subtitle={`${records?.length ?? 0} hotel stays across all bookings`} />

      <AddPanel label="Add hotel">
        <form action={addHotel} className="grid gap-4 sm:grid-cols-3">
          <Field label="Booking *">
            <select className="input" name="booking_id" required>
              <option value="">Select booking…</option>
              {(bookings || []).map((b: any) => (
                <option key={b.id} value={b.id}>{b.booking_ref} — {b.package_name || 'trip'}</option>
              ))}
            </select>
          </Field>
          <Field label="City *"><input className="input" name="city" required placeholder="Makkah / Madinah" /></Field>
          <Field label="Hotel name *"><input className="input" name="hotel_name" required /></Field>
          <Field label="Check-in"><input className="input" name="check_in" type="date" /></Field>
          <Field label="Check-out"><input className="input" name="check_out" type="date" /></Field>
          <Field label="Nights"><input className="input" name="nights" type="number" /></Field>
          <Field label="Room type"><input className="input" name="room_type" placeholder="Quad / Triple / Double" /></Field>
          <Field label="Rooms"><input className="input" name="rooms_count" type="number" /></Field>
          <Field label="Meal plan"><input className="input" name="meal_plan" placeholder="HB / BB / RO" /></Field>
          <Field label="Confirmation code"><input className="input" name="confirmation_code"  /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save hotel</button></div>
        </form>
      </AddPanel>

      <form className="mb-4">
        <input className="input max-w-xs" name="q" placeholder="Search…" defaultValue={searchParams?.q || ''} />
        <button className="btn-secondary ml-2" type="submit">Search</button>
      </form>

      <Table head={['Booking', 'Hotel', 'City', 'Check-in → Check-out', 'Nights', 'Rooms', 'Status', 'Actions']}>
        {list.length ? list.map((r: any) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-2">
              <Link href={`/dashboard/bookings/${r.booking_id}`} className="font-semibold accent hover:underline">
                {r.bookings?.booking_ref || '—'}
              </Link>
            </td>
            <td className="px-4 py-2">{r.hotel_name || '—'}</td>
            <td className="px-4 py-2">{r.city || '—'}</td>
            <td className="px-4 py-2">{r.check_in || '—'} → {r.check_out || '—'}</td>
            <td className="px-4 py-2">{r.nights ?? '—'}</td>
            <td className="px-4 py-2">{r.rooms_count}</td>
            <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <form action={setRecordStatus} className="flex gap-1">
                  <input type="hidden" name="table" value="hotels" />
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} className="input max-w-28 px-2 py-1 text-xs">
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
                </form>
                <RowEdit table="hotels" id={r.id}><label className="text-[10px] text-slate-400">Hotel</label><input className="input px-2 py-1 text-xs" name="hotel_name" defaultValue={r.hotel_name || ''} /><label className="text-[10px] text-slate-400">City</label><select className="input px-2 py-1 text-xs" name="city"><option value="makkah" selected={r.city === "makkah"}> makkah</option><option value="madinah" selected={r.city === "madinah"}> madinah</option><option value="jeddah" selected={r.city === "jeddah"}> jeddah</option><option value="taif" selected={r.city === "taif"}> taif</option><option value="other" selected={r.city === "other"}> other</option></select><label className="text-[10px] text-slate-400">Check-in</label><input className="input px-2 py-1 text-xs" type="date" name="check_in" defaultValue={r.check_in || ''} /><label className="text-[10px] text-slate-400">Check-out</label><input className="input px-2 py-1 text-xs" type="date" name="check_out" defaultValue={r.check_out || ''} /><label className="text-[10px] text-slate-400">Nights</label><input className="input px-2 py-1 text-xs" name="nights" defaultValue={r.nights || ''} /><label className="text-[10px] text-slate-400">Room type</label><input className="input px-2 py-1 text-xs" name="room_type" defaultValue={r.room_type || ''} /><label className="text-[10px] text-slate-400">Rooms</label><input className="input px-2 py-1 text-xs" name="rooms_count" defaultValue={r.rooms_count || ''} /><label className="text-[10px] text-slate-400">Meal plan</label><input className="input px-2 py-1 text-xs" name="meal_plan" defaultValue={r.meal_plan || ''} /><label className="text-[10px] text-slate-400">Status</label><select className="input px-2 py-1 text-xs" name="status"><option value="pending" selected={r.status === "pending"}> pending</option><option value="confirmed" selected={r.status === "confirmed"}> confirmed</option><option value="cancelled" selected={r.status === "cancelled"}> cancelled</option></select></RowEdit>
                <form action={deleteRecord}>
                  <input type="hidden" name="table" value="hotels" />
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No hotel records yet." /></td></tr>}
      </Table>
    </div>
  );
}
