import { requireModule } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, AddPanel, Empty, StatusBadge } from '@/components/ui';
import { money } from '@/lib/format';
import { autoAllocateSeats, autoAllocateRooms, toggleSeatBlock, updateTourPassenger, deleteTourPassenger, setPassengerCheckin, createDepartureVehicle, deleteDepartureVehicle, createDepartureHotel, deleteDepartureHotel, createDeparturePickup, deleteDeparturePickup, deleteTourBooking, updateDepartureStatus, updateTourBooking } from '@/lib/tour-actions';
import TourAddPassengerForm from '@/components/tour-add-passenger-form';
import TourBookingForm from '@/components/tour-booking-form';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const CHECKIN = ['booked', 'confirmed', 'checked_in', 'picked_up', 'no_show'];
const RTYPES = ['single', 'double', 'triple', 'quad'];

export default async function DeparturePage({ params }: { params: { id: string } }) {
  const ctx = await requireModule('toursales');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const { data: dep } = await db.from('tour_departures').select('*, tour_packages(name, days, inclusions, exclusions, ziyarat)')
    .eq('id', params.id).eq('agency_id', aid).single();
  if (!dep) notFound();
  const [{ data: vehicles }, { data: hotels }, { data: pickups }, { data: blocks }, { data: bookings }, { data: itin }] = await Promise.all([
    db.from('tour_departure_vehicles').select('*').eq('agency_id', aid).eq('departure_id', dep.id).order('created_at'),
    db.from('tour_departure_hotels').select('*').eq('agency_id', aid).eq('departure_id', dep.id).order('created_at'),
    db.from('tour_departure_pickups').select('*').eq('agency_id', aid).eq('departure_id', dep.id).order('pickup_time'),
    db.from('tour_seat_blocks').select('*').eq('agency_id', aid).eq('departure_id', dep.id),
    db.from('tour_bookings').select('*').eq('agency_id', aid).eq('departure_id', dep.id).order('created_at'),
    db.from('tour_itinerary').select('*').eq('package_id', dep.package_id).eq('agency_id', aid).order('day_no'),
  ]);
  const bkIds = (bookings || []).map((b: any) => b.id);
  const pax = bkIds.length
    ? (await db.from('tour_passengers').select('*').in('booking_id', bkIds).order('created_at')).data || []
    : [];
  const bkMap = new Map((bookings || []).map((b: any) => [b.id, b]));
  const vehMap = new Map((vehicles || []).map((v: any) => [v.id, v]));

  const seatsTotal = (vehicles || []).reduce((s: number, v: any) => s + Number(v.total_seats || 0), 0);
  const seatBooked = pax.filter((p: any) => p.seat_vehicle_id && p.seat_no).length;
  const reserved = (blocks || []).filter((b: any) => b.kind === 'reserved').length;
  const blocked = (blocks || []).filter((b: any) => b.kind === 'blocked').length;
  const available = Math.max(seatsTotal - seatBooked - reserved - blocked, 0);
  const roomsTotal = (hotels || []).reduce((s: number, h: any) => s + Number(h.single_rooms || 0) + Number(h.double_rooms || 0) + Number(h.triple_rooms || 0) + Number(h.quad_rooms || 0) + Number(h.other_rooms || 0), 0);
  const roomsUsed = new Set(pax.filter((p: any) => p.hotel_room).map((p: any) => p.hotel_room)).size;
  const pickedUp = pax.filter((p: any) => p.checkin_status === 'picked_up').length;
  const checkedIn = pax.filter((p: any) => x2(p)).length;
  function x2(p: any) { return p.checkin_status === 'checked_in' || p.checkin_status === 'picked_up'; }
  const noRoom = pax.filter((p: any) => !p.hotel_room).length;
  const noSeat = pax.filter((p: any) => !p.seat_vehicle_id || !p.seat_no).length;
  const cur = (ctx as any).agency?.currency;

  const seatCell = (v: any, n: number) => {
    const occupant = pax.find((p: any) => p.seat_vehicle_id === v.id && p.seat_no === n);
    const blk = (blocks || []).find((b: any) => b.vehicle_id === v.id && b.seat_no === n);
    if (occupant) return <div key={n} title={`${occupant.full_name} (${bkMap.get(occupant.booking_id)?.ref || ''})`} className="flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-white">{n}</div>;
    if (blk) return (
      <form key={n} action={toggleSeatBlock} className="contents">
        <input type="hidden" name="departure_id" value={dep.id} /><input type="hidden" name="vehicle_id" value={v.id} />
        <input type="hidden" name="seat_no" value={n} /><input type="hidden" name="kind" value={blk.kind} />
        <button title={`${blk.kind}${blk.reason ? ': ' + blk.reason : ''} — click to release`} type="submit"
          className={`flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold text-white ${blk.kind === 'blocked' ? 'bg-red-500' : 'bg-amber-500'}`}>{n}</button>
      </form>
    );
    return (
      <form key={n} action={toggleSeatBlock} className="contents">
        <input type="hidden" name="departure_id" value={dep.id} /><input type="hidden" name="vehicle_id" value={v.id} />
        <input type="hidden" name="seat_no" value={n} /><input type="hidden" name="kind" value="blocked" />
        <button title={`Seat ${n} available — click to block`} type="submit"
          className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-[10px] text-slate-400 hover:border-slate-500">{n}</button>
      </form>
    );
  };

  const rooms: { label: string; occupants: any[] }[] = [];
  for (const p of pax) {
    if (!p.hotel_room) continue;
    let r = rooms.find((x) => x.label === p.hotel_room);
    if (!r) { r = { label: p.hotel_room, occupants: [] }; rooms.push(r); }
    r.occupants.push(p);
  }
  rooms.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href="/dashboard/tour-sales">← All departures</Link>
      <PageHeader title={`${dep.tour_packages?.name || 'Tour'} — ${dep.departure_date} → ${dep.return_date || '—'}`} subtitle={`${pax.length} passengers · ${bookings?.length || 0} bookings · ${roomsUsed}/${roomsTotal} rooms · ${seatBooked}/${seatsTotal} seats booked`}>
        <div className="flex items-center gap-2">
          <form action={updateDepartureStatus} className="flex items-center gap-1">
            <input type="hidden" name="id" value={dep.id} />
            <select className="input" name="status" defaultValue={dep.status}>
              <option value="open">Open</option><option value="closed">Closed</option><option value="full">Full</option><option value="departed">Departed</option>
            </select>
            <button className="btn-secondary" type="submit">Set</button>
          </form>
        </div>
      </PageHeader>

      {/* summary tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="card p-3"><p className="text-[11px] text-slate-400">Passengers</p><p className="text-lg font-bold text-slate-900">{pax.length}</p></div>
        <div className="card p-3"><p className="text-[11px] text-slate-400">Seats total</p><p className="text-lg font-bold text-slate-900">{seatsTotal}</p></div>
        <div className="card p-3"><p className="text-[11px] text-slate-400">Seats booked</p><p className="text-lg font-bold text-slate-900">{seatBooked}</p></div>
        <div className="card p-3"><p className="text-[11px] text-slate-400">Available</p><p className="text-lg font-bold text-emerald-600">{available}</p></div>
        <div className="card p-3"><p className="text-[11px] text-slate-400">Reserved / blocked</p><p className="text-lg font-bold text-amber-600">{reserved} / {blocked}</p></div>
        <div className="card p-3"><p className="text-[11px] text-slate-400">Rooms used</p><p className="text-lg font-bold text-slate-900">{roomsUsed}/{roomsTotal}</p></div>
        <div className="card p-3"><p className="text-[11px] text-slate-400">Checked-in / picked up</p><p className="text-lg font-bold text-slate-900">{checkedIn} / {pickedUp}</p></div>
      </div>

      {/* ===== VEHICLES & SEAT MAP ===== */}
      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">🚌 Vehicles & seat allocation</h2>
          <form action={autoAllocateSeats}>
            <input type="hidden" name="departure_id" value={dep.id} />
            <button className="btn-primary text-xs" type="submit" disabled={!vehicles?.length || !noSeat}>⚡ Auto-allocate {noSeat} unassigned seat(s)</button>
          </form>
        </div>
        {(vehicles || []).length === 0 && <Empty msg="Add vehicles for this departure below — cars, SUVs, vans, coasters, minibuses and 40/45/50+ seat buses." />}
        {(vehicles || []).map((v: any) => (
          <div key={v.id} className="mb-4 rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">{v.vehicle_label || v.vehicle_type} <span className="font-normal text-slate-400">{v.vehicle_type} · {v.plate_no || ''} · {v.total_seats} seats</span></p>
              <form action={deleteDepartureVehicle}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="departure_id" value={dep.id} /><button className="text-[10px] text-red-400" type="submit">Delete</button></form>
            </div>
            <div className="flex flex-wrap gap-1">
              {[...Array(Number(v.total_seats || 0))].map((_, i) => seatCell(v, i + 1))}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Black = booked · red = blocked · amber = reserved · click an empty seat to block it, click a blocked seat to release</p>
          </div>
        ))}
        <AddPanel label="Add vehicle">
          <form action={createDepartureVehicle} className="grid gap-2 sm:grid-cols-4">
            <input type="hidden" name="departure_id" value={dep.id} />
            <select className="input" name="vehicle_type">
              <option value="car">Car</option><option value="suv">SUV</option><option value="van">Van</option>
              <option value="coaster">Coaster</option><option value="minibus">Minibus</option>
              <option value="bus40">Bus (40 seats)</option><option value="bus45">Bus (45 seats)</option><option value="bus50">Bus (50+ seats)</option>
            </select>
            <input className="input" name="vehicle_label" placeholder="Label (e.g. BUS-1)" />
            <input className="input" name="plate_no" placeholder="Plate no." />
            <input className="input" name="total_seats" type="number" placeholder="Total seats *" required />
            <button className="btn-primary" type="submit">Add vehicle</button>
          </form>
        </AddPanel>
      </div>

      {/* ===== HOTELS & ROOMS ===== */}
      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">🏨 Hotels, rooms & beds</h2>
          <form action={autoAllocateRooms}>
            <input type="hidden" name="departure_id" value={dep.id} />
            <button className="btn-primary text-xs" type="submit" disabled={!hotels?.length || !noRoom}>🛏 Auto-allocate {noRoom} unassigned passenger(s)</button>
          </form>
        </div>
        {(hotels || []).map((h: any) => (
          <div key={h.id} className="mb-3 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">{h.hotel_name} <span className="font-normal text-slate-400">{h.city || ''} · {h.check_in || ''} → {h.check_out || ''}</span></p>
              <form action={deleteDepartureHotel}><input type="hidden" name="id" value={h.id} /><input type="hidden" name="departure_id" value={dep.id} /><button className="text-[10px] text-red-400" type="submit">Delete</button></form>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Rooms — single: {h.single_rooms} · double: {h.double_rooms} · triple: {h.triple_rooms} · quad: {h.quad_rooms} · other: {h.other_rooms}</p>
          </div>
        ))}
        {hotels?.length === 0 && <Empty msg="Add hotels and room inventory for this departure below." />}
        <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((r) => (
            <div key={r.label} className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold text-slate-900">Room {r.label} <span className="font-normal text-slate-400">({r.occupants.length} pax)</span></p>
              {r.occupants.sort((a: any, b: any) => (a.bed_label || '').localeCompare(b.bed_label || '')).map((p: any) => (
                <p key={p.id} className="text-[11px] text-slate-600">🛏 {p.bed_label || '—'} · {p.full_name}{p.room_preference === 'private' ? ' (private)' : p.room_preference === 'family' ? ' (family)' : ''}</p>
              ))}
            </div>
          ))}
        </div>
        {noRoom > 0 && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">{noRoom} passenger(s) not yet assigned a room.</p>}
        <AddPanel label="Add hotel & rooms">
          <form action={createDepartureHotel} className="grid gap-2 sm:grid-cols-3">
            <input type="hidden" name="departure_id" value={dep.id} />
            <input className="input" name="hotel_name" placeholder="Hotel name *" required />
            <input className="input" name="city" placeholder="City" />
            <input className="input" name="check_in" type="date" />
            <input className="input" name="check_out" type="date" />
            <input className="input" name="single_rooms" type="number" placeholder="Single rooms" />
            <input className="input" name="double_rooms" type="number" placeholder="Double rooms" />
            <input className="input" name="triple_rooms" type="number" placeholder="Triple rooms" />
            <input className="input" name="quad_rooms" type="number" placeholder="Quad rooms" />
            <input className="input" name="other_rooms" type="number" placeholder="Other rooms" />
            <button className="btn-primary" type="submit">Add hotel</button>
          </form>
        </AddPanel>
      </div>

      {/* ===== PICKUP POINTS ===== */}
      <div className="card mb-6 p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">📍 Pickup points & timing</h2>
        {(pickups || []).map((k: any) => {
          const assigned = pax.filter((p: any) => p.pickup_id === k.id);
          return (
            <div key={k.id} className="mb-2 flex items-start justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-xs font-bold text-slate-900">{k.location} <span className="accent">· {k.pickup_time}</span></p>
                <p className="text-[11px] text-slate-500">{k.notes || ''}</p>
                <p className="mt-1 text-[11px] text-slate-600">{assigned.length ? assigned.map((p: any) => p.full_name).join(', ') : 'No passengers assigned'}</p>
              </div>
              <form action={deleteDeparturePickup}><input type="hidden" name="id" value={k.id} /><input type="hidden" name="departure_id" value={dep.id} /><button className="text-[10px] text-red-400" type="submit">Delete</button></form>
            </div>
          );
        })}
        {pickups?.length === 0 && <Empty msg="Add pickup locations — each can have its own time." />}
        <AddPanel label="Add pickup point">
          <form action={createDeparturePickup} className="grid gap-2 sm:grid-cols-3">
            <input type="hidden" name="departure_id" value={dep.id} />
            <input className="input" name="location" placeholder="Location *" required />
            <input className="input" name="pickup_time" placeholder="Time (e.g. 05:30)" />
            <input className="input" name="notes" placeholder="Notes" />
            <button className="btn-primary" type="submit">Add pickup</button>
          </form>
        </AddPanel>
      </div>

      {/* ===== PASSENGERS (individual management + reallocation) ===== */}
      <div className="card mb-6 p-4">
        <h2 className="mb-1 text-sm font-bold text-slate-900">👥 Passenger management ({pax.length})</h2>
        <p className="mb-3 text-[11px] text-slate-400">Edit one passenger without touching anyone else: move a bus seat, a room, a bed or a pickup — the rest of their allocation stays.</p>
        {pax.length === 0 && <Empty msg="No passengers yet — add a booking below." />}
        {pax.map((p: any) => (
          <div key={p.id} className="mb-2 rounded-lg border border-slate-200 p-2">
            <form action={updateTourPassenger} className="flex flex-wrap items-center gap-1">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="departure_id" value={dep.id} />
              <span className="rounded bg-slate-100 px-1 text-[10px] font-bold text-slate-500">{bkMap.get(p.booking_id)?.ref}</span>
              <input className="input !w-36 !py-1 text-xs" name="full_name" defaultValue={p.full_name} />
              <select className="input !w-16 !py-1 text-xs" name="gender" defaultValue={p.gender || 'male'}><option value="male">M</option><option value="female">F</option></select>
              <input className="input !w-14 !py-1 text-xs" name="age" type="number" defaultValue={p.age || ''} title="Age" />
              <input className="input !w-28 !py-1 text-xs" name="passport_no" defaultValue={p.passport_no || ''} placeholder="Passport" />
              <input className="input !w-24 !py-1 text-xs" name="room_group" defaultValue={p.room_group || ''} placeholder="Family grp" />
              <select className="input !w-20 !py-1 text-xs" name="room_preference" defaultValue={p.room_preference || 'shared'}>
                <option value="shared">shared</option><option value="private">private</option><option value="family">family</option>
              </select>
              <select className="input !w-20 !py-1 text-xs" name="room_type" defaultValue={p.room_type || 'quad'}>
                {RTYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input !w-24 !py-1 text-xs" name="hotel_room" defaultValue={p.hotel_room || ''} placeholder="Room (H1-D1)" title="Hotel room label" />
              <input className="input !w-12 !py-1 text-xs" name="bed_label" defaultValue={p.bed_label || ''} placeholder="Bed" />
              <select className="input !w-28 !py-1 text-xs" name="seat_vehicle_id" defaultValue={p.seat_vehicle_id || ''}>
                <option value="">— no vehicle —</option>
                {(vehicles || []).map((v: any) => <option key={v.id} value={v.id}>{v.vehicle_label || v.vehicle_type}</option>)}
              </select>
              <input className="input !w-14 !py-1 text-xs" name="seat_no" type="number" defaultValue={p.seat_no || ''} placeholder="Seat" title="Seat number" />
              <select className="input !w-28 !py-1 text-xs" name="pickup_id" defaultValue={p.pickup_id || ''}>
                <option value="">— pickup —</option>
                {(pickups || []).map((k: any) => <option key={k.id} value={k.id}>{k.location}</option>)}
              </select>
              <select className="input !w-24 !py-1 text-xs" name="checkin_status" defaultValue={p.checkin_status || 'booked'}>
                {CHECKIN.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
              <button className="btn-primary !py-1 text-xs" type="submit">Save</button>
            </form>
            <div className="mt-1 flex gap-1">
              {['confirmed', 'checked_in', 'picked_up', 'no_show'].map((c) => (
                <form key={c} action={setPassengerCheckin} className="inline">
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="departure_id" value={dep.id} /><input type="hidden" name="checkin_status" value={c} />
                  <button className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:border-slate-400" type="submit">{c.replace('_', ' ')}</button>
                </form>
              ))}
              <form action={deleteTourPassenger} className="inline">
                <input type="hidden" name="id" value={p.id} /><input type="hidden" name="departure_id" value={dep.id} />
                <button className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] text-red-400 hover:border-red-400" type="submit">Remove pax</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {/* ===== BOOKINGS ===== */}
      <div className="card mb-6 p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">🎟 Bookings</h2>
        {(bookings || []).map((b: any) => {
          const bp = pax.filter((p: any) => p.booking_id === b.id);
          return (
            <div key={b.id} className="mb-2">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 text-xs">
              <span className="font-bold text-slate-900">{b.ref}</span>
              <span className="text-slate-600">{b.group_name || b.contact_name} · {b.contact_phone || ''}</span>
              <span>{bp.length} pax</span>
              <StatusBadge status={b.payment_status} />
              <span className="text-slate-500">Paid {money(Number(b.amount_paid || 0), cur)} / {money(Number(b.sale_price || 0), cur)}</span>
              <Link className="accent font-semibold hover:underline" href={`/dashboard/tour-sales/voucher/${b.id}`}>Voucher →</Link>
              <form action={deleteTourBooking} className="ml-auto"><input type="hidden" name="id" value={b.id} /><button className="text-[10px] text-red-400" type="submit">Delete</button></form>
            </div>
              <AddPanel label="Edit booking">
                <form action={updateTourBooking} className="grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="id" value={b.id} />
                  <input className="input" name="group_name" defaultValue={b.group_name || ''} placeholder="Group name" />
                  <input className="input" name="contact_name" defaultValue={b.contact_name || ''} placeholder="Contact person" />
                  <input className="input" name="contact_phone" defaultValue={b.contact_phone || ''} placeholder="Contact phone" />
                  <input className="input" name="sale_price" type="number" step="0.01" defaultValue={Number(b.sale_price || 0)} placeholder="Sale price" />
                  <input className="input" name="cost" type="number" step="0.01" defaultValue={Number(b.cost || 0)} placeholder="Our cost" />
                  <input className="input" name="amount_paid" type="number" step="0.01" defaultValue={Number(b.amount_paid || 0)} placeholder="Amount paid" />
                  <select className="input" name="payment_method" defaultValue={b.payment_method || ''}>
                    <option value="">Payment method…</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option>
                  </select>
                  <input className="input" name="due_date" type="date" defaultValue={b.due_date || ''} />
                  <select className="input" name="status" defaultValue={b.status || 'confirmed'}>
                    <option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option>
                  </select>
                  <input className="input sm:col-span-2" name="notes" defaultValue={b.notes || ''} placeholder="Notes" />
                  <button className="btn-primary" type="submit">Save booking</button>
                </form>
              </AddPanel>
            </div>
          );
        })}
        {bookings?.length === 0 && <Empty msg="No bookings for this departure yet." />}
        {(bookings || []).length > 0 && (
          <AddPanel label="Add more passengers to an existing booking">
            <TourAddPassengerForm
              bookings={(bookings || []).map((b: any) => ({ id: b.id, ref: b.ref, label: `${b.ref} — ${b.group_name || b.contact_name || ''} (${pax.filter((p: any) => p.booking_id === b.id).length} pax)` }))}
              pickups={(pickups || []).map((k: any) => ({ id: k.id, location: k.location, pickup_time: k.pickup_time }))}
            />
          </AddPanel>
        )}
        <AddPanel label="New booking (1–50+ passengers)">
          <TourBookingForm departureId={dep.id} pickups={(pickups || []).map((k: any) => ({ id: k.id, location: k.location, pickup_time: k.pickup_time }))} />
        </AddPanel>
      </div>

      {/* ===== ITINERARY ===== */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">🗓 Tour itinerary & ziyarat</h2>
        {(itin || []).map((r: any) => (
          <p key={r.id} className="text-xs text-slate-600">
            <span className={`mr-2 rounded px-1 ${r.kind === 'ziyarat' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>Day {r.day_no} {r.kind === 'ziyarat' ? '🕌' : '📍'}</span>
            <b>{r.title}</b>{r.location ? ` · ${r.location}` : ''}{r.start_time ? ` · ${r.start_time}` : ''}{r.notes ? ` · ${r.notes}` : ''}
          </p>
        ))}
        {itin?.length === 0 && <Empty msg="No itinerary rows for this package — add them from Tour Packages." />}
      </div>
    </div>
  );
}
