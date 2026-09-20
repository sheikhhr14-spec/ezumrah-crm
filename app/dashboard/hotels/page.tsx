import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { setRecordStatus, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, StatusBadge } from '@/components/ui';
import Link from 'next/link';

export default async function HotelsPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requireModule('hotels');
  const db = createAdminClient();
  const [{ data: records }, { data: bookings }, { data: customers }] = await Promise.all([
    db.from('hotels').select('*, customers(full_name), bookings(booking_ref, customers(full_name))').eq('agency_id', ctx.profile.agency_id)
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
      <PageHeader title="Hotels" subtitle={`${records?.length ?? 0} hotel stays across all bookings`} />

      <form className="mb-4">
        <input className="input max-w-xs" name="q" placeholder="Search…" defaultValue={searchParams?.q || ''} />
        <button className="btn-secondary ml-2" type="submit">Search</button>
      </form>

      <Table head={['Booking', 'Hotel', 'City', 'Check-in → Check-out', 'Nights', 'Rooms', 'Status', 'Actions']}>
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
                <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=hotels&id=${r.id}`}>PDF</a>
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
