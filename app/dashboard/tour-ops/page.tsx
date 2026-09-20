import { requireModule } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, Empty, StatusBadge } from '@/components/ui';
import Link from 'next/link';

export default async function TourOpsPage() {
  const ctx = await requireModule('touroperations');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const [{ data: deps }, { data: vehicles }, { data: hotels }, { data: pickups }, { data: blocks }, { data: bookings }] = await Promise.all([
    db.from('tour_departures').select('*, tour_packages(name, days, inclusions)').eq('agency_id', aid).order('departure_date'),
    db.from('tour_departure_vehicles').select('departure_id, total_seats').eq('agency_id', aid),
    db.from('tour_departure_hotels').select('departure_id, single_rooms, double_rooms, triple_rooms, quad_rooms, other_rooms').eq('agency_id', aid),
    db.from('tour_departure_pickups').select('id, departure_id').eq('agency_id', aid),
    db.from('tour_seat_blocks').select('departure_id, kind').eq('agency_id', aid),
    db.from('tour_bookings').select('id, departure_id, status').eq('agency_id', aid).neq('status', 'cancelled'),
  ]);
  const bookingIds = (bookings || []).map((b: any) => b.id);
  const pax = bookingIds.length
    ? (await db.from('tour_passengers').select('booking_id, seat_vehicle_id, hotel_room, pickup_id, checkin_status').in('booking_id', bookingIds)).data || []
    : [];
  const bkByDep = new Map<string, any[]>();
  for (const b of bookings || []) { const a = bkByDep.get(b.departure_id) || []; a.push(b); bkByDep.set(b.departure_id, a); }

  return (
    <div>
      <PageHeader title="Tour Operations" subtitle="Live status per departure: passengers, seats, rooms, pickups and check-in" />
      {(deps || []).length === 0 && <Empty msg="Schedule a departure from Tour Packages first — operations appear here." />}
      <div className="grid gap-4 lg:grid-cols-2">
        {(deps || []).map((d: any) => {
          const bks = bkByDep.get(d.id) || [];
          const bksIds = new Set(bks.map((b: any) => b.id));
          const p = pax.filter((x: any) => bksIds.has(x.booking_id));
          const seatsTotal = (vehicles || []).filter((v: any) => v.departure_id === d.id).reduce((s: number, v: any) => s + Number(v.total_seats || 0), 0);
          const seatBooked = p.filter((x: any) => x.seat_vehicle_id).length;
          const depBlocks = (blocks || []).filter((b: any) => b.departure_id === d.id);
          const reserved = depBlocks.filter((b: any) => b.kind === 'reserved').length;
          const blocked = depBlocks.filter((b: any) => b.kind === 'blocked').length;
          const roomsTotal = (hotels || []).filter((h: any) => h.departure_id === d.id)
            .reduce((s: number, h: any) => s + Number(h.single_rooms || 0) + Number(h.double_rooms || 0) + Number(h.triple_rooms || 0) + Number(h.quad_rooms || 0) + Number(h.other_rooms || 0), 0);
          const roomsUsed = new Set(p.filter((x: any) => x.hotel_room).map((x: any) => x.hotel_room)).size;
          const pickedUp = p.filter((x: any) => x.checkin_status === 'picked_up').length;
          const checkedIn = p.filter((x: any) => x.checkin_status === 'checked_in' || x.checkin_status === 'picked_up').length;
          const pickupAssigned = p.filter((x: any) => x.pickup_id).length;
          const avail = seatsTotal - seatBooked - reserved - blocked;
          return (
            <Link key={d.id} href={`/dashboard/tour-ops/${d.id}`} className="card p-4 transition hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{d.tour_packages?.name || 'Tour'}</h3>
                  <p className="text-xs text-slate-500">{d.departure_date} → {d.return_date || '—'} · {bks.length} booking(s)</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Passengers</p><p className="font-bold text-slate-900">{p.length}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Seats avail / total</p><p className="font-bold text-slate-900">{Math.max(avail, 0)} / {seatsTotal}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Seats booked·res·blk</p><p className="font-bold text-slate-900">{seatBooked}·{reserved}·{blocked}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Rooms used / total</p><p className="font-bold text-slate-900">{roomsUsed} / {roomsTotal}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Checked in</p><p className="font-bold text-slate-900">{checkedIn}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Picked up</p><p className="font-bold text-slate-900">{pickedUp}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Pickup assigned</p><p className="font-bold text-slate-900">{pickupAssigned} / {p.length}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Pickup points</p><p className="font-bold text-slate-900">{(pickups || []).filter((x: any) => x.departure_id === d.id).length}</p></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
