import { requireModule } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, StatusBadge } from '@/components/ui';
import { money } from '@/lib/format';
import PrintButton from '@/components/print-button';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const ctx = await requireModule('toursales');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const { data: bk } = await db.from('tour_bookings').select('*').eq('id', params.id).eq('agency_id', aid).single();
  if (!bk) notFound();
  const [{ data: dep }, { data: pax }, { data: vehs }] = await Promise.all([
    db.from('tour_departures').select('departure_date, return_date, package_id').eq('id', bk.departure_id).single(),
    db.from('tour_passengers').select('*').eq('booking_id', bk.id).order('created_at'),
    db.from('tour_departure_vehicles').select('*').eq('agency_id', aid).eq('departure_id', bk.departure_id),
  ]);
  const { data: pkg } = await db.from('tour_packages').select('name').eq('id', dep?.package_id || '').single();
  const vmap = new Map((vehs || []).map((v: any) => [v.id, v]));
  const ag = (ctx as any).agency || {};
  const cur = ag.currency;
  const list = pax || [];
  const total = Number(bk.sale_price || 0);
  const perPax = list.length ? total / list.length : total;
  const paid = Number(bk.amount_paid || 0);
  const balance = total - paid;
  const profit = total - Number(bk.cost || 0);

  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href={`/dashboard/tour-sales/departure/${bk.departure_id}`}>← Back to departure</Link>
      <PageHeader title={`Invoice — ${bk.ref}`} subtitle={`${bk.group_name || bk.contact_name} · ${list.length} passenger(s)`}>
        <PrintButton label="🖨 Print invoice" />
      </PageHeader>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{ag.name || 'Travel Agency'}</h2>
            <p className="text-xs text-slate-500">{ag.contact_email || ''} {ag.website || ''}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Invoice</p>
            <p className="text-lg font-bold text-slate-900">INV-{bk.ref}</p>
            <p className="text-xs text-slate-500">Issued {new Date(bk.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400">Bill to</p>
            <p className="font-semibold text-slate-900">{bk.group_name || bk.contact_name}</p>
            <p className="text-slate-600">{bk.contact_name} {bk.contact_phone ? `· ${bk.contact_phone}` : ''}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Tour</p>
            <p className="font-semibold text-slate-900">{pkg?.name || 'Tour'}</p>
            <p className="text-slate-600">{dep?.departure_date} → {dep?.return_date || '—'}</p>
          </div>
        </div>

        <h3 className="mb-2 text-sm font-bold text-slate-900">Passengers ({list.length})</h3>
        <table className="mb-4 w-full border-collapse text-xs">
          <thead><tr className="border-b border-slate-300 text-left">
            <th className="p-1">#</th><th className="p-1">Passenger</th><th className="p-1">Passport</th>
            <th className="p-1">Seat</th><th className="p-1">Room</th><th className="p-1 text-right">Amount</th>
          </tr></thead>
          <tbody>
            {list.map((p: any, i: number) => {
              const v = p.seat_vehicle_id ? vmap.get(p.seat_vehicle_id) : null;
              return (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="p-1">{i + 1}</td>
                  <td className="p-1 font-semibold">{p.full_name} <span className="font-normal text-slate-400">{p.gender === 'female' ? 'F' : 'M'}{p.age ? ` · ${p.age}` : ''}</span></td>
                  <td className="p-1">{p.passport_no || '—'}</td>
                  <td className="p-1">{v ? `${v.vehicle_label || v.vehicle_type} · ${p.seat_no}` : '—'}</td>
                  <td className="p-1">{p.hotel_room ? `${p.hotel_room} · ${p.bed_label || ''}` : '—'}</td>
                  <td className="p-1 text-right font-semibold">{money(perPax, cur)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal ({list.length} pax × {money(perPax, cur)})</span><b>{money(total, cur)}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Amount received</span><b className="text-emerald-600">{money(paid, cur)}</b></div>
            <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-semibold">Balance due{bk.due_date ? ` (${bk.due_date})` : ''}</span><b className="text-red-500">{money(balance, cur)}</b></div>
            <p className="pt-1 text-right"><StatusBadge status={bk.payment_status} /></p>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400">
          <span>Payment method: {bk.payment_method || '—'}</span>
          <span>Thank you for choosing {ag.name || 'us'}!</span>
        </div>

        <div className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 print:hidden">
          <b>Internal (not printed):</b> our cost {money(Number(bk.cost || 0), cur)} · profit {money(profit, cur)}
        </div>
      </div>
    </div>
  );
}
