'use client';
import CustomerPicker from '@/components/customer-picker';
import { useState } from 'react';
import { createPackageSale } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';
import { money as fmtMoney } from '@/lib/format';

const n = (v: string | number) => Number(v) || 0;
const ROOM_TYPES = ['quint', 'quad', 'triple', 'double', 'single'];

type Pax = { full_name: string; relationship: string; gender: string; age: string; passport_no: string; room_type: string; seat_no: string };
type Leg = { leg_type: string; mode: string; company: string; from_location: string; to_location: string; leg_date: string; seats: string; notes: string };

const emptyPax = (name = ''): Pax => ({ full_name: name, relationship: '', gender: '', age: '', passport_no: '', room_type: 'quad', seat_no: '' });
const emptyLeg = (leg_type = 'arrival'): Leg => ({ leg_type, mode: 'bus', company: '', from_location: '', to_location: '', leg_date: '', seats: '', notes: '' });
const curSym = (c?: string | null) => {
  const code = (c || 'USD').toUpperCase();
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value || code; } catch { return code; }
};

const LEG_TYPES = ['arrival', 'intercity', 'departure', 'ziyarat_transfer', 'other'];
const MODES = ['bus', 'van', 'private_car', 'train', 'taxi', 'other'];

const SECT = "mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1";

export default function PackageSaleForm({ category, customers, currency, taxRate }: {
  category: 'umrah' | 'hajj' | 'tour';
  customers: { id: string; full_name: string }[];
  currency?: string | null; taxRate?: number;
}) {
  const sym = curSym(currency);
  const symPad = sym.length <= 1 ? '2rem' : sym.length === 2 ? '2.6rem' : sym.length === 3 ? '3.3rem' : '3.8rem';
  const cur = currency;
  const [pax, setPax] = useState<Pax[]>([emptyPax()]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [ziyarat, setZiyarat] = useState({ scope: 'both', date: '', guide: false, notes: '' });
  const [money, setMoney] = useState({ perPerson: '', supp: '', fee: '', discount: '', tax: '', commission: '', cost: '', paid: '' });

  const set = (k: keyof typeof money) => (e: React.ChangeEvent<HTMLInputElement>) => setMoney({ ...money, [k]: e.target.value });
  const setP = (i: number, k: keyof Pax) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const rows = [...pax]; rows[i] = { ...rows[i], [k]: e.target.value }; setPax(rows);
  };
  const setL = (i: number, k: keyof Leg) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const rows = [...legs]; rows[i] = { ...rows[i], [k]: e.target.value }; setLegs(rows);
  };

  const travelers = pax.length;
  const base = n(money.perPerson) * travelers;
  const taxAuto = (base + n(money.supp) + n(money.fee) - n(money.discount)) * (taxRate || 0) / 100;
  const grand = base + n(money.supp) + n(money.fee) - n(money.discount) + (money.tax !== '' ? n(money.tax) : Math.round(taxAuto * 100) / 100);
  const profit = grand + n(money.commission) - n(money.cost);
  const balance = grand - n(money.paid);
  const rooms = ROOM_TYPES.map((rt) => ({ rt, count: pax.filter((p) => p.room_type === rt).length })).filter((r) => r.count);
  const capacity = pax.filter((p) => p.full_name.trim()).length;

  const L = ({ label, name, type = 'text', ph = '' }: { label: string; name: string; type?: string; ph?: string }) => (
    <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
      <input className="input" name={name} type={type} placeholder={ph} /></label>
  );

  return (
    <form action={createPackageSale} className="space-y-4">
      <input type="hidden" name="package_category" value={category} />
      <input type="hidden" name="passengers_json" value={JSON.stringify(pax)} />
      <input type="hidden" name="transports_json" value={JSON.stringify(legs)} />
      <input type="hidden" name="sale_price" value={base} />

      {/* 1 — CUSTOMER (lead passenger) */}
      <p className={SECT}>1 · Customer — lead passenger</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <CustomerPicker customers={customers} onPick={(id, name) => {
            const rows = [...pax]; rows[0] = { ...rows[0], full_name: id ? name : '', relationship: 'lead' };
            setPax(rows);
          }} />
        <L label="New customer name (if new)" name="customer_name" />
        <L label="Phone" name="phone" />
        <L label="WhatsApp" name="whatsapp" />
        <L label="Country" name="country" />
        <L label="Lead passport no." name="passport_no" />
      </div>

      {/* 2 — PASSENGERS */}
      <p className={SECT}>2 · Passengers — {capacity} traveler{capacity === 1 ? '' : 's'} on this booking</p>
      <div className="space-y-2">
        {pax.map((p, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-8">
            <label className="sm:col-span-2"><span className="text-[10px] font-semibold text-slate-500">Full name {i === 0 && '(lead)'}</span>
              <input className="input px-2 py-1 text-xs" value={p.full_name} onChange={setP(i, 'full_name')} placeholder="Passenger name" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Relationship</span>
              <select className="input px-2 py-1 text-xs" value={p.relationship} onChange={setP(i, 'relationship')}>
                {['lead', 'spouse', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'other'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Gender</span>
              <select className="input px-2 py-1 text-xs" value={p.gender} onChange={setP(i, 'gender')}>
                {['male', 'female'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Age</span>
              <input className="input px-2 py-1 text-xs" type="number" value={p.age} onChange={setP(i, 'age')} /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Passport no.</span>
              <input className="input px-2 py-1 text-xs" value={p.passport_no} onChange={setP(i, 'passport_no')} /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Room sharing</span>
              <select className="input px-2 py-1 text-xs" value={p.room_type} onChange={setP(i, 'room_type')}>
                {ROOM_TYPES.map((rt) => <option key={rt} value={rt}>{rt} ({({ quint: 5, quad: 4, triple: 3, double: 2, single: 1 })[rt]})</option>)}
              </select></label>
            <label className="flex items-end gap-2"><span className="flex-1"><span className="text-[10px] font-semibold text-slate-500">Bus seat</span>
              <input className="input px-2 py-1 text-xs" value={p.seat_no} onChange={setP(i, 'seat_no')} placeholder="12A" /></span>
              {pax.length > 1 && <button type="button" className="pb-2 text-xs font-bold text-red-500" onClick={() => setPax(pax.filter((_, j) => j !== i))}>✕</button>}</label>
          </div>
        ))}
        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setPax([...pax, emptyPax()])}>+ Add passenger</button>
        {rooms.length > 0 && (
          <p className="text-xs text-slate-500">Rooms needed: {rooms.map((r) => `${r.count}× ${r.rt}`).join(', ')}
            {rooms.some((r) => r.rt === 'double' || r.rt === 'single') && <span className="text-amber-600"> · double/single rooms usually carry a supplement (add it in the price summary)</span>}
          </p>
        )}
      </div>

      {/* 3 — PACKAGE */}
      <p className={SECT}>3 · {category} package</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <L label="Package name *" name="package_name" ph={category === 'tour' ? 'Turkey 7-Day Tour' : '14-Day Deluxe'} />
        <L label="Departure date" name="departure_date" type="date" />
        <L label="Return date" name="return_date" type="date" />
      </div>

      {/* 4 — FLIGHT */}
      <p className={SECT}>4 · Group flight (bulk booking)</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <L label="Airline" name="airline" ph="Saudia / PIA / Flynas" />
        <L label="Outbound flight no." name="flight_no" />
        <L label="From" name="from_airport" />
        <L label="To" name="to_airport" />
        <L label="Departure" name="depart_at" type="datetime-local" />
        <L label="Return flight no." name="return_flight_no" />
        <L label="Group PNR" name="pnr" />
      </div>

      {/* 5 — HOTEL */}
      <p className={SECT}>5 · Hotels</p>
      {category === 'tour' ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <L label="Destination" name="tour_destination" ph="Turkey / Dubai / Egypt" />
          <L label="Hotel" name="tour_hotel" />
          <L label="Nights" name="tour_nights" type="number" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <L label="Makkah hotel" name="makkah_hotel" />
          <L label="Makkah nights" name="makkah_nights" type="number" />
          <L label="Madinah hotel" name="madinah_hotel" />
          <L label="Madinah nights" name="madinah_nights" type="number" />
        </div>
      )}

      {/* 6 — TRANSPORT */}
      <p className={SECT}>6 · Transport — {legs.length} leg{legs.length === 1 ? '' : 's'} booked</p>
      <div className="space-y-2">
        {legs.map((t, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-8">
            <label><span className="text-[10px] font-semibold text-slate-500">Leg</span>
              <select className="input px-2 py-1 text-xs" value={t.leg_type} onChange={setL(i, 'leg_type')}>
                {LEG_TYPES.map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
              </select></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Mode</span>
              <select className="input px-2 py-1 text-xs" value={t.mode} onChange={setL(i, 'mode')}>
                {MODES.map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
              </select></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Company</span>
              <input className="input px-2 py-1 text-xs" value={t.company} onChange={setL(i, 'company')} placeholder="SAPTCO / private" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">From</span>
              <input className="input px-2 py-1 text-xs" value={t.from_location} onChange={setL(i, 'from_location')} placeholder="Jeddah airport" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">To</span>
              <input className="input px-2 py-1 text-xs" value={t.to_location} onChange={setL(i, 'to_location')} placeholder="Makkah hotel" /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Date</span>
              <input className="input px-2 py-1 text-xs" type="date" value={t.leg_date} onChange={setL(i, 'leg_date')} /></label>
            <label><span className="text-[10px] font-semibold text-slate-500">Seats</span>
              <input className="input px-2 py-1 text-xs" value={t.seats} onChange={setL(i, 'seats')} placeholder="12A, 12B…" /></label>
            <label className="flex items-end gap-2"><span className="flex-1"><span className="text-[10px] font-semibold text-slate-500">Notes</span>
              <input className="input px-2 py-1 text-xs" value={t.notes} onChange={setL(i, 'notes')} /></span>
              <button type="button" className="pb-2 text-xs font-bold text-red-500" onClick={() => setLegs(legs.filter((_, j) => j !== i))}>✕</button></label>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setLegs([...legs, emptyLeg('arrival')])}>+ Arrival transfer</button>
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setLegs([...legs, emptyLeg('intercity')])}>+ Makkah–Madinah leg</button>
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setLegs([...legs, emptyLeg('departure')])}>+ Departure transfer</button>
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setLegs([...legs, emptyLeg('other')])}>+ Other leg</button>
        </div>
      </div>

      {/* 7 — ZIYARAT (umrah & hajj) */}
      {category !== 'tour' && (<>
        <p className={SECT}>7 · Ziyarat</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="block"><span className="text-xs font-semibold text-slate-600">Ziyarat cities</span>
            <select className="input" name="ziyarat_scope" value={ziyarat.scope} onChange={(e) => setZiyarat({ ...ziyarat, scope: e.target.value })}>
              <option value="none">Not included</option>
              <option value="makkah">Makkah only</option>
              <option value="madinah">Madinah only</option>
              <option value="both">Makkah + Madinah</option>
            </select></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Ziyarat date</span>
            <input className="input" name="ziyarat_date" type="date" value={ziyarat.date} onChange={(e) => setZiyarat({ ...ziyarat, date: e.target.value })} /></label>
          <label className="flex items-end gap-2 pb-1"><input type="checkbox" name="ziyarat_guide" className="h-4 w-4" checked={ziyarat.guide} onChange={(e) => setZiyarat({ ...ziyarat, guide: e.target.checked })} />
            <span className="text-xs font-semibold text-slate-600">Guide included</span></label>
          <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Ziyarat notes</span>
            <input className="input" name="ziyarat_notes" value={ziyarat.notes} onChange={(e) => setZiyarat({ ...ziyarat, notes: e.target.value })} placeholder="Sites visited, schedule, pick-up point…" /></label>
        </div>
      </>)}
      {/* PRICE SUMMARY */}
      <p className={SECT}>{category === 'tour' ? '7' : '8'} · Price summary</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block"><span className="text-xs font-semibold text-slate-600">Package price per person</span>
          <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="price_per_person" type="number" step="0.01" value={money.perPerson} onChange={set('perPerson')} /></div></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Separate-room supplement (+)</span>
          <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="supplement" type="number" step="0.01" value={money.supp} onChange={set('supp')} /></div></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Admin fee</span>
          <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="admin_fee" type="number" step="0.01" value={money.fee} onChange={set('fee')} /></div></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Discount (-)</span>
          <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="discount" type="number" step="0.01" value={money.discount} onChange={set('discount')} /></div></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Tax / VAT ({taxRate || 0}% auto)</span>
            <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="tax" type="number" step="0.01" value={money.tax} onChange={set('tax')} placeholder={String(Math.round(taxAuto * 100) / 100)} /></div>
          </label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Total cost to us</span>
          <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="cost" type="number" step="0.01" value={money.cost} onChange={set('cost')} /></div></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Supplier commission (+)</span>
          <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="commission" type="number" step="0.01" value={money.commission} onChange={set('commission')} /></div></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Amount paid</span>
          <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="amount_paid" type="number" step="0.01" value={money.paid} onChange={set('paid')} /></div></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Payment method</span>
          <select className="input" name="payment_method">
            <option value="">— none yet —</option><option value="cash">Cash</option>
            <option value="bank">Bank transfer</option><option value="card">Card</option><option value="online">Online</option>
          </select></label>
        <L label="Payment due date" name="due_date" type="date" />
        <L label="Source / referral" name="source" />
        <L label="Tags" name="tags" />
        <L label="Follow-up date" name="follow_up_date" type="date" />
        <label className="block"><span className="text-xs font-semibold text-slate-600">Status</span>
          <select className="input" name="status" defaultValue="confirmed">
            <option value="confirmed">Confirmed</option><option value="pending">Pending</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select></label>
        <L label="Notes" name="notes" />
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Package total ({travelers} pax)</p><p className="font-bold">${fmtMoney(base, cur)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total</p><p className="font-bold">${fmtMoney(grand, cur)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${fmtMoney(balance, cur)}</p></div>
        <div className="rounded-lg accent-soft-bg p-3"><p className="text-xs text-slate-400">Profit</p><p className="font-bold accent">${fmtMoney(profit, cur)}</p></div>
      </div>

      {/* 8 — DOCUMENTATION */}
      <p className={SECT}>{category === 'tour' ? '8' : '9'} · Documentation</p>
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
        📎 After saving, open the sale and upload passports, tickets, vouchers and receipts in its <b>Documents</b> section — every document stays attached to this booking.
      </p>

      <SubmitButton pendingText="Saving booking…">Save {category} booking</SubmitButton>
    </form>
  );
}
