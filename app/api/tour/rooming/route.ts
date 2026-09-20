import { NextRequest, NextResponse } from 'next/server';
import { authAgency, departureData, toCsv, htmlDoc } from '@/lib/tour-export';

export async function GET(req: NextRequest) {
  const prof = await authAgency();
  if (!prof?.agency_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await departureData(req.nextUrl.searchParams.get('departure') || '', prof.agency_id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { dep, hotels, pax, bkMap } = data;
  const hotelName = (room: string) => {
    const m = /^H(\d+)-/.exec(room || '');
    const h = m ? hotels[Number(m[1]) - 1] : null;
    return h ? h.hotel_name : '—';
  };
  const rows: (string | number | null)[][] = pax
    .filter((p: any) => p.hotel_room)
    .sort((a: any, b: any) => (a.hotel_room || '').localeCompare(b.hotel_room || '') || (a.bed_label || '').localeCompare(b.bed_label || ''))
    .map((p: any) => [
      hotelName(p.hotel_room), p.hotel_room, p.bed_label || '', p.full_name,
      p.gender === 'female' ? 'F' : 'M', p.age ?? '', p.passport_no || '',
      bkMap.get(p.booking_id)?.ref || '', p.room_group || '', p.room_preference || '', (p.checkin_status || '').replace('_', ' '),
    ]);
  const headers = ['Hotel', 'Room', 'Bed', 'Passenger', 'Gender', 'Age', 'Passport', 'Booking', 'Family/Group', 'Preference', 'Status'];
  const fname = `rooming-list-${dep.departure_date}`;
  if (req.nextUrl.searchParams.get('format') === 'html') {
    return new NextResponse(htmlDoc(`Rooming list — ${dep.tour_packages?.name || 'Tour'}`, `${dep.departure_date} → ${dep.return_date || ''} · ${rows.length} passengers`, headers, rows), { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  return new NextResponse(toCsv([headers, ...rows]), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${fname}.csv"`,
    },
  });
}
