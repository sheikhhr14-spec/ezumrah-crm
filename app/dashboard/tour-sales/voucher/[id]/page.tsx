import { requireModule } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, StatusBadge } from '@/components/ui';
import { money } from '@/lib/format';
import PrintButton from '@/components/print-button';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function VoucherPage({ params }: { params: { id: string } }) {
  const ctx = await requireModule('toursales');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const { data: bk } = await db.from('tour_bookings').select('*').eq('id', params.id).eq('agency_id', aid).single();
  if (!bk) notFound();
  const [{ data: dep }, { data: pax }] = await Promise.all([
    db.from('tour_departures').select('*, tour_packages(name, days, inclusions, exclusions, ziyarat)').eq('id', bk.departure_id).single(),
    db.from('tour_passengers').select('*').eq('booking_id', bk.id).order('created_at'),
  ]);
  const [vs, hs, ks] = await Promise.all([
    db.from('tour_departure_vehicles').select('*').eq('agency_id', aid).eq('departure_id', bk.departure_id),
    db.from('tour_departure_hotels').select('*').eq('agency_id', aid).eq('departure_id', bk.departure_id),
    db.from('tour_departure_pickups').select('*').eq('agency_id', aid).eq('departure_id', bk.departure_id),
  ]);
  const veh = new Map((vs?.data || []).map((v: any) => [v.id, v]));
  const pickup = new Map((ks?.data || []).map((k: any) => [k.id, k]));
  const pkg = dep?.tour_packages;
  const ag = (ctx as any).agency || {};
  const cur = ag.currency;
  const list = pax || [];

  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href={`/dashboard/tour-sales/departure/${bk.departure_id}`}>← Back to departure</Link>
      <PageHeader title={`Booking voucher — ${bk.ref}`} subtitle={`${bk.group_name || bk.contact_name} · ${list.length} passenger(s)`}>
        <PrintButton />
      </PageHeader>

      <div className="card printable p-6">
        <div className="mb-4 border-b border-slate-200 pb-4 text-center">
          <h2 className="text-xl font-bold text-slate-900">{ag.name || 'Travel Agency'}</h2>
          <p className="text-xs text-slate-500">{ag.contact_email || ''} {ag.website || ''}</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Tour booking voucher</p>
        </div>

        <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <p><b>Voucher:</b> {bk.ref}</p>
          <p><b>Tour:</b> {pkg?.name || '—'}</p>
          <p><b>Dates:</b> {dep?.departure_date} → {dep?.return_date || '—'}</p>
          <p><b>Group / lead:</b> {bk.group_name || '—'} · {bk.contact_name} {bk.contact_phone ? `(${bk.contact_phone})` : ''}</p>
          <p><b>Status:</b> <StatusBadge status={bk.status} /> · Payment: <StatusBadge status={bk.payment_status} /></p>
          <p><b>Paid:</b> {money(Number(bk.amount_paid || 0), cur)} of {money(Number(bk.sale_price || 0), cur)}{Number(bk.balance) > 0 ? ` · Balance: ${money(Number(bk.balance), cur)}` : ''}</p>
        </div>

        <h3 className="mb-2 text-sm font-bold text-slate-900">Passengers — seats, rooms & pickups</h3>
        <table className="mb-4 w-full border-collapse text-xs">
          <thead><tr className="border-b border-slate-300 text-left">
            <th className="p-1">#</th><th className="p-1">Passenger</th><th className="p-1">Vehicle · seat</th>
            <th className="p-1">Hotel · room · bed</th><th className="p-1">Pickup</th><th className="p-1">Status</th>
          </tr></thead>
          <tbody>
            {list.map((p: any, i: number) => {
              const v = p.seat_vehicle_id ? veh.get(p.seat_vehicle_id) : null;
              const k = p.pickup_id ? pickup.get(p.pickup_id) : null;
              return (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="p-1">{i + 1}</td>
                  <td className="p-1 font-semibold">{p.full_name}<span className="font-normal text-slate-400"> {p.gender === 'female' ? 'F' : 'M'}{p.age ? ` · ${p.age}` : ''}{p.passport_no ? ` · PP ${p.passport_no}` : ''}</span></td>
                  <td className="p-1">{v ? `${v.vehicle_label || v.vehicle_type} · seat ${p.seat_no}` : '—'}</td>
                  <td className="p-1">{p.hotel_room ? `${p.hotel_room} · bed ${p.bed_label || '—'}${p.room_preference && p.room_preference !== 'shared' ? ` (${p.room_preference})` : ''}` : '—'}</td>
                  <td className="p-1">{k ? `${k.location}${k.pickup_time ? ` (${k.pickup_time})` : ''}` : '—'}</td>
                  <td className="p-1">{(p.checkin_status || 'booked').replace('_', ' ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3 className="mb-1 text-sm font-bold text-slate-900">Hotels</h3>
        {(hs?.data || []).map((h: any) => (
          <p key={h.id} className="text-xs text-slate-600">{h.hotel_name}{h.city ? `, ${h.city}` : ''} — {h.check_in} → {h.check_out}</p>
        ))}
        <p className="mb-3 text-xs text-slate-400">Rooms: single {dep ? '' : ''}</p>

        {pkg?.inclusions && <p className="mb-1 text-xs text-slate-600"><b>Inclusions:</b> {pkg.inclusions}</p>}
        {pkg?.exclusions && <p className="mb-1 text-xs text-slate-600"><b>Exclusions:</b> {pkg.exclusions}</p>}
        {pkg?.ziyarat && <p className="mb-1 text-xs text-slate-600"><b>Ziyarat included:</b> {pkg.ziyarat}</p>}

        <p className="mt-4 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
          {bk.notes ? `Notes: ${bk.notes} · ` : ''}Issued {new Date(bk.created_at).toLocaleDateString()} · {ag.name || 'Agency'}
        </p>
      </div>
    </div>
  );
}
