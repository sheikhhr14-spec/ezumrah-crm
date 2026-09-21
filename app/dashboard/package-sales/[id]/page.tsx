import { sendSaleInvoiceEmail } from '@/lib/crm-actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import { updatePackageSale, deleteRecord, addPassenger, updatePassenger, deletePassenger, addTransportLeg, updateTransportLeg, deleteTransportLeg } from '@/lib/crm-actions';
import SaleDocuments from '@/components/sale-documents';
import SubmitButton from '@/components/submit-button';
import RowEdit from '@/components/row-edit';
import { PageHeader, StatusBadge } from '@/components/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function PackageSaleDetail({ params, searchParams }: { params: { id: string }; searchParams?: { emailed?: string } }) {
  const db = createAdminClient();
  const mctx: any = await requireModule('umrahsales');
  const aid0 = mctx.profile.agency_id;
  const cur = (mctx.agency || mctx.profile?.agencies || {}).currency;
  const { data: s } = await db.from('package_sales')
    .select('*, customers(full_name, phone, whatsapp, passport_no, country)')
    .eq('id', params.id).eq('agency_id', aid0).single();
  if (!s) notFound();
  // gate on the sale's own category module
  await requireModule(s.package_category === 'tour' ? 'toursales' : s.package_category === 'hajj' ? 'hajjsales' : 'umrahsales');
  const aid = aid0;
  const { data: docs } = await db.from('sale_documents').select('*')
    .eq('sale_table', 'package_sales').eq('sale_id', s.id);
  const { data: passengers } = await db.from('package_sale_passengers').select('*')
    .eq('package_sale_id', s.id).order('created_at');
  const { data: legs } = await db.from('package_sale_transports').select('*')
    .eq('package_sale_id', s.id).order('leg_date', { ascending: true });

  const { data: customers } = await db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name');
  const grand = Number(s.sale_price) + Number(s.supplement || 0) + Number(s.admin_fee || 0) - Number(s.discount || 0);
  const paid = Number(s.amount_paid);
  const balance = grand - paid;
  const profit = grand + Number(s.commission || 0) - Number(s.cost || 0);
  const capacity = Number(s.rooms_quint || 0) * 5 + Number(s.rooms_quad || 0) * 4 + Number(s.rooms_triple || 0) * 3 + Number(s.rooms_double || 0) * 2 + Number(s.rooms_single || 0);
  const dt = (v: string | null) => v ? new Date(v).toISOString().slice(0, 16) : '';

  const L = ({ label, name, def, type = 'text' }: { label: string; name: string; def?: any; type?: string }) => (
    <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
      <input className="input" name={name} type={type} defaultValue={def ?? ''} /></label>
  );

  return (
    <div>
      <div className="mb-2"><Link className="text-xs accent hover:underline" href={`/dashboard/${s.package_category === 'tour' ? 'tour' : s.package_category}-sales`}>← All {s.package_category} sales</Link></div>
      <PageHeader title={s.ref}
        subtitle={`${s.package_category} package — ${s.package_name || ''} · ${s.pax} pax${s.sold_by ? ` · sold by ${s.sold_by}` : ''}`} />
      {searchParams?.emailed === 'ok' && <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">✓ Invoice emailed to the customer.</p>}
      {searchParams?.emailed?.startsWith('err:') && <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">Email failed: {decodeURIComponent(searchParams.emailed.slice(4))}</p>}
      <form action={sendSaleInvoiceEmail} className="mb-3">
        <input type="hidden" name="table" value="package_sales" />
        <input type="hidden" name="id" value={s.id} />
        <button className="btn-secondary text-xs" type="submit">📧 Send invoice by email</button>
      </form>


      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { l: 'Package price', v: `${money(Number(s.sale_price), cur)}` },
          { l: 'Supplement (separate rooms)', v: `+${money(Number(s.supplement || 0), cur)}`, green: Number(s.supplement) > 0, hide: !Number(s.supplement) },
          { l: 'Discount', v: `-${money(Number(s.discount || 0), cur)}`, red: true, hide: !Number(s.discount) },
          { l: 'Grand total', v: `${money(grand, cur)}` },
          { l: 'Paid / Balance', v: `${money(paid, cur)} / ${money(balance, cur)}` },
          { l: `Profit (cost ${money(Number(s.cost || 0), cur)})`, v: `${money(profit, cur)}`, gold: true },
        ].filter((k) => !k.hide).map((k) => (
          <div key={k.l} className={`card p-4 ${k.gold ? 'accent-soft-bg' : ''}`}>
            <p className="text-xs text-slate-400">{k.l}</p>
            <p className={`mt-1 text-lg font-bold ${k.red ? 'text-red-500' : k.green ? 'text-emerald-600' : 'text-slate-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* passengers */}
      <div className="card mb-6 p-5">
        <h2 className="mb-1 text-lg font-semibold">🧍 Passengers — {passengers?.length || 0} on this booking</h2>
        <p className="mb-4 text-xs text-slate-400">Room sharing and bus seats per passenger. Lead passenger is the customer.</p>
        <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-8">
          <form action={addPassenger} className="contents">
            <input type="hidden" name="package_sale_id" value={s.id} />
            <label className="sm:col-span-2"><span className="text-[10px] font-semibold text-slate-500">Full name *</span>
              <input className="input px-2 py-1 text-xs" name="full_name" required placeholder="Add passenger" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Relationship</span>
              <select className="input px-2 py-1 text-xs" name="relationship">{['spouse', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'other'].map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Gender</span>
              <select className="input px-2 py-1 text-xs" name="gender">{['male', 'female'].map((g) => <option key={g} value={g}>{g}</option>)}</select></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Age</span>
              <input className="input px-2 py-1 text-xs" name="age" type="number" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Passport no.</span>
              <input className="input px-2 py-1 text-xs" name="passport_no" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Room</span>
              <select className="input px-2 py-1 text-xs" name="room_type">{['quint', 'quad', 'triple', 'double', 'single'].map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
            <label className="flex items-end"><span className="w-full"><span className="text-[10px] font-semibold text-slate-500">Seat</span>
              <input className="input px-2 py-1 text-xs" name="seat_no" placeholder="12A" /></span></label>
            <label className="flex items-end"><button className="btn-primary px-3 py-1.5 text-xs" type="submit">Add</button></label>
          </form>
        </div>
        {passengers?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Passenger</th><th className="px-2 py-2">Relationship</th><th className="px-2 py-2">Gender</th>
                <th className="px-2 py-2">Age</th><th className="px-2 py-2">Passport</th><th className="px-2 py-2">Room</th>
                <th className="px-2 py-2">Seat</th><th className="px-2 py-2">Actions</th>
              </tr></thead>
              <tbody>
                {passengers.map((px: any) => (
                  <tr key={px.id} className="border-b border-slate-50">
                    <td className="px-2 py-2 font-semibold">{px.full_name}{px.relationship === 'lead' && <span className="ml-1 badge accent-soft-bg accent">lead</span>}</td>
                    <td className="px-2 py-2 capitalize">{px.relationship || '—'}</td>
                    <td className="px-2 py-2">{px.gender || '—'}</td>
                    <td className="px-2 py-2">{px.age || '—'}</td>
                    <td className="px-2 py-2">{px.passport_no || '—'}</td>
                    <td className="px-2 py-2">{px.room_type || '—'}</td>
                    <td className="px-2 py-2">{px.seat_no || '—'}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-3">
                        <RowEdit table="package_sale_passengers" id={px.id} title="Edit passenger" action={updatePassenger}>
                          <label className="text-[10px] text-slate-400">Full name</label><input className="input px-2 py-1 text-xs" name="full_name" defaultValue={px.full_name || ''} />
                          <label className="text-[10px] text-slate-400">Relationship</label><input className="input px-2 py-1 text-xs" name="relationship" defaultValue={px.relationship || ''} />
                          <label className="text-[10px] text-slate-400">Gender</label>
                          <select className="input px-2 py-1 text-xs" name="gender" defaultValue={px.gender || ''}>{['male', 'female'].map((g) => <option key={g} value={g}>{g}</option>)}</select>
                          <label className="text-[10px] text-slate-400">Age</label><input className="input px-2 py-1 text-xs" name="age" type="number" defaultValue={px.age || ''} />
                          <label className="text-[10px] text-slate-400">Passport no.</label><input className="input px-2 py-1 text-xs" name="passport_no" defaultValue={px.passport_no || ''} />
                          <label className="text-[10px] text-slate-400">Room sharing</label>
                          <select className="input px-2 py-1 text-xs" name="room_type" defaultValue={px.room_type || 'quad'}>{['quint', 'quad', 'triple', 'double', 'single'].map((r) => <option key={r} value={r}>{r}</option>)}</select>
                          <label className="text-[10px] text-slate-400">Bus seat</label><input className="input px-2 py-1 text-xs" name="seat_no" defaultValue={px.seat_no || ''} />
                        </RowEdit>
                        <form action={deletePassenger}><input type="hidden" name="id" value={px.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-xs text-slate-400">No passengers listed yet.</p>}
      </div>

      {/* transport legs */}
      <div className="card mb-6 p-5">
        <h2 className="mb-1 text-lg font-semibold">🚌 Transport legs</h2>
        <p className="mb-4 text-xs text-slate-400">Arrival, intercity (Makkah–Madinah), departure and ziyarat transfers — with seat assignments per leg.</p>
        <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-8">
          <form action={addTransportLeg} className="contents">
            <input type="hidden" name="package_sale_id" value={s.id} />
            <label><span className="text-[10px] font-semibold text-slate-500">Leg</span>
              <select className="input px-2 py-1 text-xs" name="leg_type">{['arrival', 'intercity', 'departure', 'ziyarat_transfer', 'other'].map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}</select></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Mode</span>
              <select className="input px-2 py-1 text-xs" name="mode">{['bus', 'van', 'private_car', 'train', 'taxi', 'other'].map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}</select></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Company</span>
              <input className="input px-2 py-1 text-xs" name="company" placeholder="SAPTCO" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">From</span>
              <input className="input px-2 py-1 text-xs" name="from_location" placeholder="Jeddah airport" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">To</span>
              <input className="input px-2 py-1 text-xs" name="to_location" placeholder="Makkah hotel" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Date</span>
              <input className="input px-2 py-1 text-xs" name="leg_date" type="date" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Seats</span>
              <input className="input px-2 py-1 text-xs" name="seats" placeholder="12A, 12B" /></label>
            <label className="flex items-end"><button className="btn-primary px-3 py-1.5 text-xs" type="submit">Add leg</button></label>
          </form>
        </div>
        {legs?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Leg</th><th className="px-2 py-2">Mode</th><th className="px-2 py-2">Company</th>
                <th className="px-2 py-2">Route</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Seats</th><th className="px-2 py-2">Actions</th>
              </tr></thead>
              <tbody>
                {legs.map((t: any) => (
                  <tr key={t.id} className="border-b border-slate-50">
                    <td className="px-2 py-2 font-semibold capitalize">{(t.leg_type || '').replace('_', ' ')}</td>
                    <td className="px-2 py-2 capitalize">{(t.mode || '').replace('_', ' ')}</td>
                    <td className="px-2 py-2">{t.company || '—'}</td>
                    <td className="px-2 py-2">{t.from_location || '—'} → {t.to_location || '—'}</td>
                    <td className="px-2 py-2">{t.leg_date || '—'}</td>
                    <td className="px-2 py-2">{t.seats || '—'}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-3">
                        <RowEdit table="package_sale_transports" id={t.id} title="Edit transport leg" action={updateTransportLeg}>
                          <label className="text-[10px] text-slate-400">Leg</label>
                          <select className="input px-2 py-1 text-xs" name="leg_type" defaultValue={t.leg_type}>{['arrival', 'intercity', 'departure', 'ziyarat_transfer', 'other'].map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}</select>
                          <label className="text-[10px] text-slate-400">Mode</label>
                          <select className="input px-2 py-1 text-xs" name="mode" defaultValue={t.mode}>{['bus', 'van', 'private_car', 'train', 'taxi', 'other'].map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}</select>
                          <label className="text-[10px] text-slate-400">Company</label><input className="input px-2 py-1 text-xs" name="company" defaultValue={t.company || ''} />
                          <label className="text-[10px] text-slate-400">From</label><input className="input px-2 py-1 text-xs" name="from_location" defaultValue={t.from_location || ''} />
                          <label className="text-[10px] text-slate-400">To</label><input className="input px-2 py-1 text-xs" name="to_location" defaultValue={t.to_location || ''} />
                          <label className="text-[10px] text-slate-400">Date</label><input className="input px-2 py-1 text-xs" type="date" name="leg_date" defaultValue={t.leg_date || ''} />
                          <label className="text-[10px] text-slate-400">Seats</label><input className="input px-2 py-1 text-xs" name="seats" defaultValue={t.seats || ''} />
                          <label className="text-[10px] text-slate-400">Notes</label><input className="input px-2 py-1 text-xs" name="notes" defaultValue={t.notes || ''} />
                        </RowEdit>
                        <form action={deleteTransportLeg}><input type="hidden" name="id" value={t.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-xs text-slate-400">No transport legs yet.</p>}
      </div>

      {/* itinerary summary */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">✈️ Group flight</h3>
          <p className="text-sm">{s.airline || '—'} {s.flight_no || ''}</p>
          <p className="text-xs text-slate-500">{s.from_airport || '—'} → {s.to_airport || '—'} {s.depart_at ? `· ${dt(s.depart_at).replace('T', ' ')}` : ''}</p>
          {s.return_flight_no && <p className="text-xs text-slate-500">Return: {s.return_flight_no}</p>}
          {s.pnr && <p className="mt-1 text-xs font-semibold accent">PNR {s.pnr}</p>}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">🚌 Transport — {legs?.length || 0} leg{legs?.length === 1 ? '' : 's'}</h3>
          {legs?.length ? legs.map((t: any) => (
            <div key={t.id} className="mb-2 border-b border-slate-100 pb-2 last:border-0">
              <p className="text-sm font-semibold capitalize">{(t.leg_type || '').replace('_', ' ')} · {t.mode ? t.mode.replace('_', ' ') : 'transport'}</p>
              <p className="text-xs text-slate-500">{t.company ? `${t.company} · ` : ''}{t.from_location || '—'} → {t.to_location || '—'}{t.leg_date ? ` · ${t.leg_date}` : ''}</p>
              {t.seats && <p className="text-xs font-semibold accent">Seats: {t.seats}</p>}
              {t.notes && <p className="text-xs text-slate-400">{t.notes}</p>}
            </div>
          )) : <p className="text-xs text-slate-400">No transport legs booked.</p>}
        </div>
        {s.package_category !== 'tour' && (
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">🕌 Ziyarat</h3>
            {s.ziyarat_scope === 'none' || !s.ziyarat_scope ? (
              <p className="text-xs text-slate-400">Not included</p>
            ) : (<>
              <p className="text-sm font-semibold">{s.ziyarat_scope === 'both' ? 'Makkah + Madinah' : s.ziyarat_scope === 'makkah' ? 'Makkah only' : 'Madinah only'}</p>
              {s.ziyarat_date && <p className="text-xs text-slate-500">Date: {s.ziyarat_date}</p>}
              {s.ziyarat_guide && <p className="text-xs font-semibold accent">Guide included</p>}
              {s.ziyarat_notes && <p className="text-xs text-slate-400">{s.ziyarat_notes}</p>}
            </>)}
          </div>
        )}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">🏨 Hotels & rooms</h3>
          {s.tour_destination ? (
            <p className="text-sm">{s.tour_hotel || '—'} · {s.tour_destination}</p>
          ) : (<>
            <p className="text-sm">Makkah: {s.makkah_hotel || '—'} {s.makkah_nights ? `(${s.makkah_nights}n)` : ''}</p>
            <p className="text-sm">Madinah: {s.madinah_hotel || '—'} {s.madinah_nights ? `(${s.madinah_nights}n)` : ''}</p>
          </>)}
          <p className="mt-1 text-xs">
            {[s.rooms_quint && `${s.rooms_quint}× quint`, s.rooms_quad && `${s.rooms_quad}× quad`, s.rooms_triple && `${s.rooms_triple}× triple`,
              s.rooms_double && `${s.rooms_double}× double`, s.rooms_single && `${s.rooms_single}× single`].filter(Boolean).join(', ') || 'no rooms set'}
            {capacity ? <span className={capacity === Number(s.pax) ? 'text-emerald-600' : 'text-red-500'}> · capacity {capacity} pax</span> : null}
          </p>
        </div>
      </div>

      {/* full edit */}
      <div className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold">✏️ Edit package sale</h2>
        <form action={updatePackageSale} className="space-y-6">
          <input type="hidden" name="id" value={s.id} />
          <div className="grid gap-4 sm:grid-cols-4">
            <L label="Package category" name="package_category" def={s.package_category} />
            <L label="Package name" name="package_name" def={s.package_name} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Customer</span>
              <select className="input" name="customer_id" defaultValue={s.customer_id || ''}>
                <option value="">— none —</option>
                {(customers || []).map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select></label>
            <L label="Pax" name="pax" type="number" def={s.pax} />
            <L label="Departure" name="departure_date" type="date" def={s.departure_date} />
            <L label="Return" name="return_date" type="date" def={s.return_date} />
            <L label="Airline" name="airline" def={s.airline} />
            <L label="Outbound flight" name="flight_no" def={s.flight_no} />
            <L label="From" name="from_airport" def={s.from_airport} />
            <L label="To" name="to_airport" def={s.to_airport} />
            <L label="Departure time" name="depart_at" type="datetime-local" def={dt(s.depart_at)} />
            <L label="Return flight" name="return_flight_no" def={s.return_flight_no} />
            <L label="Group PNR" name="pnr" def={s.pnr} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Ziyarat cities</span>
              <select className="input" name="ziyarat_scope" defaultValue={s.ziyarat_scope || 'none'}>
                <option value="none">Not included</option><option value="makkah">Makkah only</option>
                <option value="madinah">Madinah only</option><option value="both">Makkah + Madinah</option>
              </select></label>
            <L label="Ziyarat date" name="ziyarat_date" type="date" def={s.ziyarat_date} />
            <label className="flex items-end gap-2 pb-2"><input type="checkbox" name="ziyarat_guide" className="h-4 w-4" defaultChecked={!!s.ziyarat_guide} />
              <span className="text-xs font-semibold text-slate-600">Ziyarat guide included</span></label>
            <L label="Ziyarat notes" name="ziyarat_notes" def={s.ziyarat_notes} />
            <L label="Makkah hotel" name="makkah_hotel" def={s.makkah_hotel} />
            <L label="Makkah nights" name="makkah_nights" type="number" def={s.makkah_nights} />
            <L label="Madinah hotel" name="madinah_hotel" def={s.madinah_hotel} />
            <L label="Madinah nights" name="madinah_nights" type="number" def={s.madinah_nights} />
            <L label="Tour destination" name="tour_destination" def={s.tour_destination} />
            <L label="Tour hotel" name="tour_hotel" def={s.tour_hotel} />
            <L label="Tour nights" name="tour_nights" type="number" def={s.tour_nights} />
            <L label="Quint rooms (5)" name="rooms_quint" type="number" def={s.rooms_quint} />
            <L label="Quad rooms (4)" name="rooms_quad" type="number" def={s.rooms_quad} />
            <L label="Triple rooms" name="rooms_triple" type="number" def={s.rooms_triple} />
            <L label="Double rooms" name="rooms_double" type="number" def={s.rooms_double} />
            <L label="Single rooms" name="rooms_single" type="number" def={s.rooms_single} />
            <L label="Package price" name="sale_price" type="number" def={s.sale_price} />
            <L label="Supplement" name="supplement" type="number" def={s.supplement} />
            <L label="Admin fee" name="admin_fee" type="number" def={s.admin_fee} />
            <L label="Discount" name="discount" type="number" def={s.discount} />
            <L label="Cost" name="cost" type="number" def={s.cost} />
            <L label="Commission" name="commission" type="number" def={s.commission} />
            <L label="Amount paid" name="amount_paid" type="number" def={s.amount_paid} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Payment method</span>
              <select className="input" name="payment_method" defaultValue={s.payment_method || ''}>
                <option value="">— none —</option>
                <option value="cash">Cash</option><option value="bank">Bank transfer</option>
                <option value="card">Card</option><option value="online">Online</option>
              </select></label>
            <L label="Payment due date" name="due_date" type="date" def={s.due_date} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Status</span>
              <select className="input" name="status" defaultValue={s.status}>
                <option value="pending">Pending</option><option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select></label>
            <L label="Notes" name="notes" def={s.notes} />
          </div>
          <div className="flex items-end gap-3">
            <SubmitButton className="btn-primary px-4 py-2 text-xs">Save package sale</SubmitButton>
            <a className="btn-secondary px-4 py-2 text-xs" href={`/api/invoice-pdf?type=package_sale&id=${s.id}`}>⬇ Download PDF invoice</a>
            <form action={deleteRecord}>
              <input type="hidden" name="table" value="package_sales" />
              <input type="hidden" name="id" value={s.id} />
              <button className="btn-secondary px-4 py-2 text-xs text-red-500" type="submit">Delete sale</button>
            </form>
          </div>
        </form>
      </div>

      <SaleDocuments table="package_sales" saleId={s.id} docs={docs || []} />
    </div>
  );
}
