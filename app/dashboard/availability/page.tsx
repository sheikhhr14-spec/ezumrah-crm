import { requireModule } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, AddPanel, Empty } from '@/components/ui';
import { createHotelInventory, deleteHotelInventory, createFleetVehicle, deleteFleetVehicle } from '@/lib/crm-actions';

const addDays = (d: string, n: number) => new Date(new Date(d).getTime() + n * 86400000).toISOString().slice(0, 10);

export default async function AvailabilityPage({ searchParams }: { searchParams?: { start?: string } }) {
  const ctx = await requireModule('availability');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const start = searchParams?.start && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.start)
    ? new Date(searchParams.start + 'T00:00:00Z') : new Date();
  const DAYS = 14;
  const dates = [...Array(DAYS)].map((_, i) => { const d = new Date(start.getTime() + i * 86400000); return d.toISOString().slice(0, 10); });

  const [{ data: tours }, { data: inv }, { data: fleet }] = await Promise.all([
    db.from('package_sales').select('*, package_sale_transports(*)')
      .eq('agency_id', aid).eq('package_category', 'tour').neq('status', 'cancelled'),
    db.from('hotel_inventory').select('*').eq('agency_id', aid).order('hotel_name'),
    db.from('transport_fleet').select('*').eq('agency_id', aid).order('vehicle_type'),
  ]);

  // ---- rooms needed per hotel per night, from TOUR sales ----
  const stays: { hotel: string; ci: string; co: string; rooms: number }[] = [];
  for (const t of (tours || []) as any[]) {
    const rooms = Number(t.rooms_quint || 0) + Number(t.rooms_quad || 0) + Number(t.rooms_triple || 0) + Number(t.rooms_double || 0) + Number(t.rooms_single || 0);
    if (!rooms || !t.departure_date) continue;
    let cursor = String(t.departure_date).slice(0, 10);
    const segs: [string, number][] = [
      [t.makkah_hotel || '', Number(t.makkah_nights || 0)],
      [t.madinah_hotel || '', Number(t.madinah_nights || 0)],
      [t.tour_hotel || '', Number(t.tour_nights || 0)],
    ];
    for (const [hotel, nights] of segs) {
      if (nights > 0) {
        if (hotel && cursor) stays.push({ hotel, ci: cursor, co: addDays(cursor, nights), rooms });
        cursor = addDays(cursor, nights);
      }
    }
  }
  const hotels = new Map<string, { name: string; city: string | null; cap: number }>();
  for (const r of (inv || []) as any[]) {
    const k = (r.hotel_name || '').toLowerCase();
    const e = hotels.get(k) || { name: r.hotel_name, city: r.city, cap: 0 };
    e.cap += Number(r.total_rooms || 0);
    hotels.set(k, e);
  }
  for (const s of stays) {
    const k = s.hotel.toLowerCase();
    if (!hotels.has(k)) hotels.set(k, { name: s.hotel, city: null, cap: 0 });
  }
  const soldRooms = (hotelKey: string, night: string) =>
    stays.filter((s) => s.hotel.toLowerCase() === hotelKey && s.ci <= night && night < s.co).reduce((sm, s) => sm + s.rooms, 0);

  // ---- transport seats per date per mode, from TOUR sale legs ----
  const trips: { vehicle: string; date: string; seats: number }[] = [];
  for (const t of (tours || []) as any[]) {
    for (const l of (t.package_sale_transports || []) as any[]) {
      if (l.leg_date && l.seats) trips.push({ vehicle: String(l.mode || 'bus'), date: String(l.leg_date).slice(0, 10), seats: Number(l.seats) });
    }
  }
  const vehicles = new Map<string, { name: string; cap: number }>();
  for (const r of (fleet || []) as any[]) {
    const k = (r.vehicle_type || '').toLowerCase();
    const e = vehicles.get(k) || { name: r.vehicle_type, cap: 0 };
    e.cap += Number(r.seats || 0);
    vehicles.set(k, e);
  }
  for (const t of trips) {
    const k = t.vehicle.toLowerCase();
    if (!vehicles.has(k)) vehicles.set(k, { name: t.vehicle, cap: 0 });
  }
  const soldSeats = (vk: string, day: string) =>
    trips.filter((t) => t.vehicle.toLowerCase() === vk && t.date === day).reduce((sm, t) => sm + t.seats, 0);

  const cell = (sold: number, cap: number) => {
    if (!cap) return <span className="text-slate-400">{sold} / —</span>;
    const over = sold > cap;
    const full = sold === cap;
    return <span className={over ? 'font-bold text-red-600' : full ? 'font-semibold text-amber-600' : 'text-slate-700'}>{sold} / {cap}</span>;
  };

  return (
    <div>
      <PageHeader title="Availability & Slots" subtitle="Real-time room allocation and transport slots for Tour sales — computed live from your tour bookings" />

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="block"><span className="text-xs font-semibold text-slate-600">Start date</span>
          <input className="input" type="date" name="start" defaultValue={dates[0]} /></label>
        <button className="btn-secondary" type="submit">Show 14 days</button>
      </form>

      <div className="card mb-6 overflow-x-auto p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">🏨 Tour room allocation — rooms needed / capacity per night</h2>
        {hotels.size === 0 ? <Empty msg="Add your hotel capacity below — every tour sale's rooms (quint/quad/triple/double/single) check against it automatically." /> : (
          <table className="w-full min-w-[900px] text-xs">
            <thead><tr className="border-b border-slate-200">
              <th className="p-2 text-left">Hotel</th>
              {dates.map((d) => <th key={d} className="p-1 text-center font-semibold">{d.slice(5)}</th>)}
            </tr></thead>
            <tbody>
              {Array.from(hotels.entries()).map(([k, h]) => (
                <tr key={k} className="border-b border-slate-100">
                  <td className="p-2 font-semibold text-slate-900">{h.name}{h.city ? <span className="text-slate-400"> · {h.city}</span> : null}</td>
                  {dates.map((d) => <td key={d} className="p-1 text-center">{cell(soldRooms(k, d), h.cap)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[11px] text-slate-400">Rooms come from each tour&apos;s room-sharing counts (Makkah nights → Madinah nights → tour hotel nights). Red = overbooked · amber = full. New tour sales automatically warn in their notes when capacity is exceeded.</p>
      </div>

      <div className="card mb-6 overflow-x-auto p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">🚌 Tour transport slots — seats needed / fleet capacity per day</h2>
        {vehicles.size === 0 ? <Empty msg="Add your fleet below — every tour's arrival, intercity, ziyarat and departure transfers check against available seats." /> : (
          <table className="w-full min-w-[900px] text-xs">
            <thead><tr className="border-b border-slate-200">
              <th className="p-2 text-left">Vehicle / mode</th>
              {dates.map((d) => <th key={d} className="p-1 text-center font-semibold">{d.slice(5)}</th>)}
            </tr></thead>
            <tbody>
              {Array.from(vehicles.entries()).map(([k, v]) => (
                <tr key={k} className="border-b border-slate-100">
                  <td className="p-2 font-semibold text-slate-900">{v.name}</td>
                  {dates.map((d) => <td key={d} className="p-1 text-center">{cell(soldSeats(k, d), v.cap)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[11px] text-slate-400">Includes every transport leg of your tours (bus / van / private car / train / taxi). Cancelled tours are excluded.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">Hotel capacity (your allotted rooms)</h3>
          <table className="mb-3 w-full text-xs">
            <tbody>
              {(inv || []).map((r: any) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 font-semibold">{r.hotel_name} <span className="text-slate-400">{r.city || ''} · {r.room_type}</span></td>
                  <td className="py-2">{r.total_rooms} rooms</td>
                  <td className="py-2 text-right">
                    <form action={deleteHotelInventory}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-red-400 hover:text-red-600" type="submit">Delete</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AddPanel label="Add hotel capacity">
            <form action={createHotelInventory} className="grid gap-2 sm:grid-cols-2">
              <input className="input" name="hotel_name" placeholder="Hotel name *" required />
              <input className="input" name="city" placeholder="City (Makkah / Madinah / tour city)" />
              <input className="input" name="room_type" placeholder="Room type (or 'any')" />
              <input className="input" name="total_rooms" type="number" placeholder="Total rooms *" required />
              <button className="btn-primary sm:col-span-2" type="submit">Save capacity</button>
            </form>
          </AddPanel>
        </div>

        <div className="card p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">Fleet (your vehicles)</h3>
          <table className="mb-3 w-full text-xs">
            <tbody>
              {(fleet || []).map((r: any) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 font-semibold">{r.vehicle_type} <span className="text-slate-400">{r.vehicle_name || ''} {r.plate_no || ''}</span></td>
                  <td className="py-2">{r.seats} seats</td>
                  <td className="py-2 text-right">
                    <form action={deleteFleetVehicle}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-red-400 hover:text-red-600" type="submit">Delete</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AddPanel label="Add vehicle">
            <form action={createFleetVehicle} className="grid gap-2 sm:grid-cols-2">
              <input className="input" name="vehicle_type" placeholder="Mode / type * (bus / van / private_car)" required />
              <input className="input" name="vehicle_name" placeholder="Vehicle name" />
              <input className="input" name="plate_no" placeholder="Plate no." />
              <input className="input" name="seats" type="number" placeholder="Seats *" required />
              <button className="btn-primary sm:col-span-2" type="submit">Save vehicle</button>
            </form>
          </AddPanel>
        </div>
      </div>
    </div>
  );
}
