'use server';

import { logActivity, actor } from '@/lib/activity';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';

const S = (fd: FormData, k: string) => String(fd.get(k) || '').trim() || null;
const N = (fd: FormData, k: string) => Number(fd.get(k)) || 0;

function status(grand: number, paid: number) { return paid <= 0 ? 'Unpaid' : paid >= grand ? 'Fully paid' : 'Partial'; }

// ================= PACKAGES =================
export async function createTourPackage(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  await db.from('tour_packages').insert({
    agency_id: ctx.profile.agency_id!, name: S(fd, 'name'), days: N(fd, 'days') || 3,
    tour_type: S(fd, 'tour_type') || 'custom', base_price: N(fd, 'base_price'),
    inclusions: S(fd, 'inclusions'), exclusions: S(fd, 'exclusions'), ziyarat: S(fd, 'ziyarat'), description: S(fd, 'description'),
  });
  revalidatePath('/dashboard/tour-sales');
}
export async function deleteTourPackage(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_itinerary').delete().eq('package_id', String(fd.get('id'))).eq('agency_id', aid);
  await db.from('tour_packages').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath('/dashboard/tour-sales');
}
export async function createItineraryRow(fd: FormData) {
  const db = createAdminClient(); const ctx = await requireActiveAgency();
  await db.from('tour_itinerary').insert({
    agency_id: ctx.profile.agency_id!, package_id: String(fd.get('package_id')),
    kind: S(fd, 'kind') || 'activity', day_no: N(fd, 'day_no') || 1,
    title: S(fd, 'title'), location: S(fd, 'location'), start_time: S(fd, 'start_time'), notes: S(fd, 'notes'),
  });
  revalidatePath('/dashboard/tour-sales');
}
export async function deleteItineraryRow(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_itinerary').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath('/dashboard/tour-sales');
}

// ================= DEPARTURES =================
export async function createTourDeparture(fd: FormData) {
  const db = createAdminClient(); const ctx = await requireActiveAgency();
  await db.from('tour_departures').insert({
    agency_id: ctx.profile.agency_id!, package_id: String(fd.get('package_id')),
    departure_date: S(fd, 'departure_date'), return_date: S(fd, 'return_date'),
    status: S(fd, 'status') || 'open', notes: S(fd, 'notes'),
  });
  revalidatePath('/dashboard/tour-sales'); revalidatePath('/dashboard/tour-sales');
}
export async function updateDepartureStatus(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_departures').update({ status: S(fd, 'status') || 'open' }).eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('id'))}`); revalidatePath('/dashboard/tour-sales');
}
export async function deleteTourDeparture(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_departures').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath('/dashboard/tour-sales'); revalidatePath('/dashboard/tour-sales');
}

// ================= DEPARTURE RESOURCES =================
export async function createDepartureVehicle(fd: FormData) {
  const db = createAdminClient(); const ctx = await requireActiveAgency();
  await db.from('tour_departure_vehicles').insert({
    agency_id: ctx.profile.agency_id!, departure_id: String(fd.get('departure_id')),
    vehicle_type: S(fd, 'vehicle_type'), vehicle_label: S(fd, 'vehicle_label'),
    plate_no: S(fd, 'plate_no'), total_seats: N(fd, 'total_seats'),
  });
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function deleteDepartureVehicle(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_departure_vehicles').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function createDepartureHotel(fd: FormData) {
  const db = createAdminClient(); const ctx = await requireActiveAgency();
  await db.from('tour_departure_hotels').insert({
    agency_id: ctx.profile.agency_id!, departure_id: String(fd.get('departure_id')),
    city: S(fd, 'city'), hotel_name: S(fd, 'hotel_name'), check_in: S(fd, 'check_in'), check_out: S(fd, 'check_out'),
    single_rooms: N(fd, 'single_rooms'), double_rooms: N(fd, 'double_rooms'),
    triple_rooms: N(fd, 'triple_rooms'), quad_rooms: N(fd, 'quad_rooms'), other_rooms: N(fd, 'other_rooms'),
  });
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function deleteDepartureHotel(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_departure_hotels').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function createDeparturePickup(fd: FormData) {
  const db = createAdminClient(); const ctx = await requireActiveAgency();
  await db.from('tour_departure_pickups').insert({
    agency_id: ctx.profile.agency_id!, departure_id: String(fd.get('departure_id')),
    location: S(fd, 'location'), pickup_time: S(fd, 'pickup_time'), notes: S(fd, 'notes'),
  });
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function deleteDeparturePickup(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_departure_pickups').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}

// ================= BOOKINGS & PASSENGERS =================
export async function createTourBooking(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const depId = String(fd.get('departure_id'));
  let pax: any[] = [];
  try { pax = JSON.parse(String(fd.get('passengers_json') || '[]')); } catch { pax = []; }
  pax = pax.filter((p) => (p.full_name || '').trim()).slice(0, 80);
  const salePrice = N(fd, 'sale_price'), cost = N(fd, 'cost'), paid = N(fd, 'amount_paid');
  const { count } = await db.from('tour_bookings').select('id', { count: 'exact', head: true }).eq('agency_id', aid);
  const ref = `TB-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
  const { data: bk } = await db.from('tour_bookings').insert({
    agency_id: aid, departure_id: depId, ref,
    group_name: S(fd, 'group_name'), contact_name: S(fd, 'contact_name'), contact_phone: S(fd, 'contact_phone'),
    sale_price: salePrice, cost, amount_paid: paid, payment_method: S(fd, 'payment_method'),
    payment_status: status(salePrice, paid), balance: salePrice - paid,
    due_date: S(fd, 'due_date'), notes: S(fd, 'notes'), status: S(fd, 'status') || 'confirmed',
  }).select('id').single();
  if (bk && pax.length) {
    await db.from('tour_passengers').insert(pax.map((p) => ({
      agency_id: aid, booking_id: bk.id, full_name: p.full_name.trim(),
      gender: p.gender || null, age: Number(p.age) || null, passport_no: p.passport_no || null, phone: p.phone || null,
      room_group: (p.room_group || '').trim() || null, room_preference: p.room_preference || 'shared',
      room_type: p.room_type || null, pickup_id: p.pickup_id || null,
    })));
    if (fd.get('auto_seat') === 'on') await autoAllocateSeatsFor(db, aid, depId);
    if (fd.get('auto_room') === 'on') await autoAllocateRoomsFor(db, aid, depId);
  }
  revalidatePath(`/dashboard/tour-sales/departure/${depId}`); revalidatePath('/dashboard/tour-sales');
}
export async function deleteTourBooking(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  const { data: bk } = await db.from('tour_bookings').select('id, departure_id').eq('id', String(fd.get('id'))).eq('agency_id', aid).single();
  await db.from('tour_passengers').delete().eq('booking_id', String(fd.get('id')));
  await db.from('tour_bookings').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  if (bk?.departure_id) revalidatePath(`/dashboard/tour-sales/departure/${bk.departure_id}`);
}
export async function deleteTourPassenger(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_passengers').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
await logActivity(aid, 'tour_passengers', String(fd.get('id')), 'deleted', 'Passenger removed', await actor());
      revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function updateTourPassenger(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  const seatV = S(fd, 'seat_vehicle_id');
  const seatNo = N(fd, 'seat_no');
  const paxId = String(fd.get('id'));
  const depId = String(fd.get('departure_id'));
  if (seatV && seatNo > 0) {
    const { pax } = await departurePax(db, aid, depId);
    const taken = pax.find((x: any) => x.seat_vehicle_id === seatV && Number(x.seat_no) === seatNo && x.id !== paxId);
    if (taken) throw new Error(`Seat ${seatNo} is already taken by ${taken.full_name}.`);
    const { data: blk } = await db.from('tour_seat_blocks').select('kind')
      .eq('agency_id', aid).eq('departure_id', depId).eq('vehicle_id', seatV).eq('seat_no', seatNo).maybeSingle();
    if (blk) throw new Error(`Seat is ${blk.kind}. Release it first.`);
    const { data: veh } = await db.from('tour_departure_vehicles').select('total_seats').eq('id', seatV).eq('agency_id', aid).single();
    if (!veh || seatNo > Number(veh.total_seats || 0)) throw new Error('Invalid vehicle or seat number.');
  }
  await db.from('tour_passengers').update({
    full_name: S(fd, 'full_name') || 'Passenger', gender: S(fd, 'gender'), age: N(fd, 'age') || null,
    passport_no: S(fd, 'passport_no'), phone: S(fd, 'phone'),
    room_group: S(fd, 'room_group'), room_preference: S(fd, 'room_preference') || 'shared', room_type: S(fd, 'room_type'),
    hotel_room: S(fd, 'hotel_room'), bed_label: S(fd, 'bed_label'),
    seat_vehicle_id: seatV, seat_no: seatNo || null,
    pickup_id: S(fd, 'pickup_id'), checkin_status: S(fd, 'checkin_status') || 'booked', notes: S(fd, 'notes'),
  }).eq('id', String(fd.get('id'))).eq('agency_id', aid);
await logActivity(aid, 'tour_passengers', String(fd.get('id')), 'updated', 'Passenger details edited', await actor());
      revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function setPassengerCheckin(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await db.from('tour_passengers').update({ checkin_status: S(fd, 'checkin_status') || 'booked' })
    .eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}

// ================= ALLOCATION =================
async function departurePax(db: any, aid: string, depId: string) {
  const { data: bks } = await db.from('tour_bookings').select('id, ref, group_name').eq('agency_id', aid).eq('departure_id', depId);
  const ids = (bks || []).map((b: any) => b.id);
  let pax: any[] = [];
  if (ids.length) { const { data } = await db.from('tour_passengers').select('*').in('booking_id', ids).order('created_at'); pax = data || []; }
  return { bookings: bks || [], pax };
}

async function autoAllocateSeatsFor(db: any, aid: string, depId: string) {
  const [{ data: vehicles }, { data: blocks }, { pax }] = await Promise.all([
    db.from('tour_departure_vehicles').select('*').eq('agency_id', aid).eq('departure_id', depId).order('created_at'),
    db.from('tour_seat_blocks').select('vehicle_id, seat_no').eq('agency_id', aid).eq('departure_id', depId),
    departurePax(db, aid, depId),
  ]);
  const blocked = new Set((blocks || []).map((b: any) => `${b.vehicle_id}-${b.seat_no}`));
  const freePax = pax.filter((p: any) => !p.seat_vehicle_id || !p.seat_no);
  const taken = new Set(pax.filter((p: any) => p.seat_vehicle_id && p.seat_no).map((p: any) => `${p.seat_vehicle_id}-${p.seat_no}`));
  let vi = 0, seat = 1;
  for (const p of freePax) {
    while (vi < (vehicles || []).length) {
      const v = vehicles[vi];
      if (seat > v.total_seats) { vi++; seat = 1; continue; }
      if (blocked.has(`${v.id}-${seat}`) || taken.has(`${v.id}-${seat}`)) { seat++; continue; }
      break;
    }
    if (vi >= (vehicles || []).length) break;
    const v = vehicles[vi];
    taken.add(`${v.id}-${seat}`);
    await db.from('tour_passengers').update({ seat_vehicle_id: v.id, seat_no: seat }).eq('id', p.id);
    seat++;
  }
}

async function autoAllocateRoomsFor(db: any, aid: string, depId: string) {
  const [{ data: hotels }, { pax }] = await Promise.all([
    db.from('tour_departure_hotels').select('*').eq('agency_id', aid).eq('departure_id', depId).order('created_at'),
    departurePax(db, aid, depId),
  ]);
  const SIZE: Record<string, number> = { single: 1, double: 2, triple: 3, quad: 4, other: 4 };
  const BEDS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const rooms: { label: string; type: string; size: number; used: any[] }[] = [];
  (hotels || []).forEach((h: any, hi: number) => {
    ([['single', h.single_rooms], ['double', h.double_rooms], ['triple', h.triple_rooms], ['quad', h.quad_rooms], ['other', h.other_rooms]] as [string, number][])
      .forEach(([type, count]) => { for (let n = 1; n <= Number(count || 0); n++) rooms.push({ label: `H${hi + 1}-${type[0].toUpperCase()}${n}`, type, size: SIZE[type] || 2, used: [] }); });
  });
  const free = pax.filter((p: any) => !p.hotel_room);
  const grouped = free.filter((p: any) => (p.room_group || '').trim() || p.room_preference === 'private' || p.room_preference === 'family');
  const shared = free.filter((p: any) => !grouped.includes(p));
  const updates: { id: string; room: string; bed: string }[] = [];
  // family / private groups → rooms of their own (smallest fitting room first)
  const groups = new Map<string, any[]>();
  for (const p of grouped) {
    const key = (p.room_group || '').trim() ? (p.room_group || '').trim().toLowerCase() : `__solo_${p.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const sortedGroups = Array.from(groups.values()).sort((a, b) => b.length - a.length);
  for (const g of sortedGroups) {
    let remaining = [...g];
    while (remaining.length) {
      const withSpace = rooms.filter((r) => r.used.length < r.size);
      if (!withSpace.length) break;
      const fitAll = withSpace.filter((r) => r.size - r.used.length >= remaining.length)
        .sort((a, b) => (a.size - a.used.length) - (b.size - b.used.length))[0];
      const room = fitAll || withSpace.sort((a, b) => (b.size - b.used.length) - (a.size - a.used.length))[0];
      const space = room.size - room.used.length;
      const take = remaining.splice(0, space);
      take.forEach((p: any) => { updates.push({ id: p.id, room: room.label, bed: BEDS[room.used.length] || 'X' }); room.used.push(p); });
    }
  }
  // shared passengers → fill the emptiest large rooms with unrelated passengers
  for (const p of shared) {
    const withSpace = rooms.filter((r) => r.used.length < r.size).sort((a, b) => (b.size - b.used.length) - (a.size - a.used.length));
    if (!withSpace.length) break;
    const room = withSpace[0];
    updates.push({ id: p.id, room: room.label, bed: BEDS[room.used.length] || 'X' });
    room.used.push(p);
  }
  for (const u of updates) await db.from('tour_passengers').update({ hotel_room: u.room, bed_label: u.bed }).eq('id', u.id);
}

export async function autoAllocateSeats(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await autoAllocateSeatsFor(db, aid, String(fd.get('departure_id')));
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function autoAllocateRooms(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  await autoAllocateRoomsFor(db, aid, String(fd.get('departure_id')));
  revalidatePath(`/dashboard/tour-sales/departure/${String(fd.get('departure_id'))}`);
}
export async function toggleSeatBlock(fd: FormData) {
  const db = createAdminClient(); const aid = (await requireActiveAgency()).profile.agency_id!;
  const depId = String(fd.get('departure_id'));
  const vehId = String(fd.get('vehicle_id'));
  const seatNo = N(fd, 'seat_no');
  const kind = S(fd, 'kind') || 'blocked';
  const { data: existing } = await db.from('tour_seat_blocks').select('id, kind')
    .eq('agency_id', aid).eq('departure_id', depId).eq('vehicle_id', vehId).eq('seat_no', seatNo).maybeSingle();
  if (existing) await db.from('tour_seat_blocks').delete().eq('id', existing.id);
  else await db.from('tour_seat_blocks').insert({ agency_id: aid, departure_id: depId, vehicle_id: vehId, seat_no: seatNo, kind, reason: S(fd, 'reason') });
  revalidatePath(`/dashboard/tour-sales/departure/${depId}`);
}

export async function addTourPassengers(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const bkId = String(fd.get('booking_id'));
  const { data: bk } = await db.from('tour_bookings').select('id, departure_id').eq('id', bkId).eq('agency_id', aid).single();
  if (!bk) throw new Error('Booking not found in your agency.');
  let pax: any[] = [];
  try { pax = JSON.parse(String(fd.get('passengers_json') || '[]')); } catch { pax = []; }
  pax = pax.filter((p) => (p.full_name || '').trim()).slice(0, 80);
  if (pax.length) {
    await db.from('tour_passengers').insert(pax.map((p) => ({
      agency_id: aid, booking_id: bkId, full_name: p.full_name.trim(),
      gender: p.gender || null, age: Number(p.age) || null, passport_no: p.passport_no || null, phone: p.phone || null,
      room_group: (p.room_group || '').trim() || null, room_preference: p.room_preference || 'shared',
      room_type: p.room_type || null, pickup_id: p.pickup_id || null,
    })));
    if (fd.get('auto_seat') === 'on') await autoAllocateSeatsFor(db, aid, bk.departure_id);
    if (fd.get('auto_room') === 'on') await autoAllocateRoomsFor(db, aid, bk.departure_id);
  }
await logActivity(aid, 'tour_bookings', String(fd.get('booking_id')), 'created', 'Passengers added to booking', await actor());
      revalidatePath(`/dashboard/tour-sales/departure/${bk.departure_id}`);
}

export async function updateTourBooking(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const id = String(fd.get('id'));
  const sale = N(fd, 'sale_price');
  const paid = N(fd, 'amount_paid');
  await db.from('tour_bookings').update({
    group_name: S(fd, 'group_name'), contact_name: S(fd, 'contact_name'), contact_phone: S(fd, 'contact_phone'),
    sale_price: sale, cost: N(fd, 'cost'), amount_paid: paid, payment_method: S(fd, 'payment_method'),
    payment_status: status(sale, paid), balance: sale - paid,
    due_date: S(fd, 'due_date'), notes: S(fd, 'notes'), status: S(fd, 'status') || 'confirmed',
  }).eq('id', id).eq('agency_id', aid);
  const { data: bk } = await db.from('tour_bookings').select('departure_id').eq('id', id).single();
  if (bk?.departure_id) revalidatePath(`/dashboard/tour-sales/departure/${bk.departure_id}`);
}

export async function movePassengerSeat(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const paxId = String(fd.get('passenger_id'));
  const vehId = String(fd.get('vehicle_id'));
  const seatNo = N(fd, 'seat_no');
  const { data: p } = await db.from('tour_passengers').select('id, booking_id, full_name').eq('id', paxId).eq('agency_id', aid).single();
  if (!p) throw new Error('Passenger not found in your agency.');
  const { data: v } = await db.from('tour_departure_vehicles').select('id, total_seats').eq('id', vehId).eq('agency_id', aid).single();
  if (!v) throw new Error('Vehicle not found.');
  if (seatNo < 1 || seatNo > Number(v.total_seats || 0)) throw new Error('Invalid seat number.');
  const { data: bk } = await db.from('tour_bookings').select('departure_id').eq('id', p.booking_id).single();
  if (!bk?.departure_id) throw new Error('Booking departure not found.');
  const { pax } = await departurePax(db, aid, bk.departure_id);
  const taken = pax.find((x: any) => x.seat_vehicle_id === vehId && Number(x.seat_no) === seatNo && x.id !== paxId);
  if (taken) throw new Error(`Seat already taken by ${taken.full_name}.`);
  const { data: blk } = await db.from('tour_seat_blocks').select('id, kind')
    .eq('departure_id', bk.departure_id).eq('vehicle_id', vehId).eq('seat_no', seatNo).maybeSingle();
  if (blk) throw new Error(`Seat is ${blk.kind}.`);
  await db.from('tour_passengers').update({ seat_vehicle_id: vehId, seat_no: seatNo }).eq('id', paxId).eq('agency_id', aid);
await logActivity(aid, 'tour_passengers', paxId, 'seat', `Seat ${seatNo} assigned`, await actor());
      revalidatePath(`/dashboard/tour-sales/departure/${bk.departure_id}`);
}
