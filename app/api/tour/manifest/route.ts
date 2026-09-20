import { NextRequest, NextResponse } from 'next/server';
import { authAgency, departureData, toCsv, htmlDoc } from '@/lib/tour-export';

export async function GET(req: NextRequest) {
  const prof = await authAgency();
  if (!prof?.agency_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const depId = req.nextUrl.searchParams.get('departure') || '';
  const vehId = req.nextUrl.searchParams.get('vehicle') || '';
  const data = await departureData(depId, prof.agency_id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { db, dep, pax, bkMap, pkMap } = data;
  const { data: v } = await db.from('tour_departure_vehicles').select('*').eq('id', vehId).eq('agency_id', prof.agency_id).single();
  if (!v) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  const headers = ['Seat', 'Passenger', 'Gender', 'Age', 'Passport', 'Booking', 'Family/Group', 'Pickup', 'Status'];
  const rows: (string | number | null)[][] = pax
    .filter((p: any) => p.seat_vehicle_id === vehId && p.seat_no)
    .sort((a: any, b: any) => Number(a.seat_no) - Number(b.seat_no))
    .map((p: any) => {
      const k = p.pickup_id ? pkMap.get(p.pickup_id) : null;
      return [p.seat_no, p.full_name, p.gender === 'female' ? 'F' : 'M', p.age ?? '', p.passport_no || '',
        bkMap.get(p.booking_id)?.ref || '', p.room_group || '', k ? `${k.location}${k.pickup_time ? ` (${k.pickup_time})` : ''}` : '', (p.checkin_status || '').replace('_', ' ')];
    });
  const empty = (n: number) => [n, '— vacant —', ...Array(8).fill('')];
  const total = Number(v.total_seats || 0);
  const seated = new Set(rows.map((r) => r[0]));
  for (let n = 1; n <= total; n++) if (!seated.has(n)) rows.push(empty(n));
  rows.sort((a, b) => Number(a[0]) - Number(b[0]));
  const title = `Driver sheet — ${v.vehicle_label || v.vehicle_type}`;
  const sub = `${(dep as any).pkgName} · ${dep.departure_date} → ${dep.return_date || ''} · ${v.vehicle_type}${v.plate_no ? ` · ${v.plate_no}` : ''} · ${total} seats`;
  if (req.nextUrl.searchParams.get('format') === 'html') {
    return new NextResponse(htmlDoc(title, sub, headers, rows), { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  return new NextResponse(toCsv([headers, ...rows]), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="driver-sheet-${(v.vehicle_label || v.vehicle_type).toLowerCase()}-${dep.departure_date}.csv"`,
    },
  });
}
