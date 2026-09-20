'use client';
import { useState } from 'react';
import { createPackageSale } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';

const n = (v: string | number) => Number(v) || 0;
const ROOM_TYPES = ['quint', 'quad', 'triple', 'double', 'single'];

type Pax = { full_name: string; relationship: string; gender: string; age: string; passport_no: string; room_type: string; seat_no: string };

const emptyPax = (name = ''): Pax => ({ full_name: name, relationship: '', gender: '', age: '', passport_no: '', room_type: 'quad', seat_no: '' });

const SECT = "mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1";

export default function PackageSaleForm({ category, customers }: {
  category: 'umrah' | 'hajj' | 'tour';
  customers: { id: string; full_name: string }[];
}) {
  const [pax, setPax] = useState<Pax[]>([emptyPax()]);
  const [money, setMoney] = useState({ perPerson: '', supp: '', fee: '', discount: '', commission: '', cost: '', paid: '' });

  const set = (k: keyof typeof money) => (e: React.ChangeEvent<HTMLInputElement>) => setMoney({ ...money, [k]: e.target.value });
  const setP = (i: number, k: keyof Pax) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const rows = [...pax]; rows[i] = { ...rows[i], [k]: e.target.value }; setPax(rows);
  };

  const travelers = pax.length;
  const base = n(money.perPerson) * travelers;
  const grand = base + n(money.supp) + n(money.fee) - n(money.discount);
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
      <input type="hidden" name="sale_price" value={base} />

      {/* 1 — CUSTOMER (lead passenger) */}
      <p className={SECT}>1 · Customer — lead passenger</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="text-xs font-semibold text-slate-600">Existing customer</span>
          <select className="input" name="existing_customer_id" onChange={(e) => {
            const rows = [...pax]; rows[0] = { ...rows[0], full_name: e.target.options[e.target.selectedIndex].text.split(' (')[0] === '— create new customer below —' ? '' : e.target.options[e.target.selectedIndex].text, relationship: 'lead' };
            setPax(rows);
          }}>
            <option value="">— create new customer below —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </label>
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

      {/* 6 — TRANSPORT & ZIYARAT */}
      <p className={SECT}>6 · Transport & Ziyarat</p>
      <div className="grid gap-4 sm:grid-cols-5">
        <L label="Bus company" name="bus_company" ph="SAPTCO / private" />
        <L label="From" name="bus_from" ph="Riyadh" />
        <L label="To" name="bus_to" ph="Makkah" />
        <L label="Bus date" name="bus_date" type="date" />
        <label className="block"><span className="text-xs font-semibold text-slate-600">Ziyarat included</span>
          <select className="input" name="ziyarat_included" defaultValue="true">
            <option value="true">Yes</option><option value="false">No</option>
          </select></label>
        <label className="block sm:col-span-4"><span className="text-xs font-semibold text-slate-600">Ziyarat / transport notes</span>
          <input className="input" name="ziyarat_notes" placeholder="Ziyarat schedule, pick-up points, group transport details…" /></label>
      </div>

      {/* 7 — PRICE SUMMARY */}
      <p className={SECT}>7 · Price summary</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block"><span className="text-xs font-semibold text-slate-600">Package price per person</span>
          <input className="input" name="price_per_person" type="number" step="0.01" value={money.perPerson} onChange={set('perPerson')} /></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Separate-room supplement (+)</span>
          <input className="input" name="supplement" type="number" step="0.01" value={money.supp} onChange={set('supp')} /></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Admin fee</span>
          <input className="input" name="admin_fee" type="number" step="0.01" value={money.fee} onChange={set('fee')} /></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Discount (-)</span>
          <input className="input" name="discount" type="number" step="0.01" value={money.discount} onChange={set('discount')} /></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Total cost to us</span>
          <input className="input" name="cost" type="number" step="0.01" value={money.cost} onChange={set('cost')} /></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Supplier commission (+)</span>
          <input className="input" name="commission" type="number" step="0.01" value={money.commission} onChange={set('commission')} /></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Amount paid</span>
          <input className="input" name="amount_paid" type="number" step="0.01" value={money.paid} onChange={set('paid')} /></label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Payment method</span>
          <select className="input" name="payment_method">
            <option value="">— none yet —</option><option value="cash">Cash</option>
            <option value="bank">Bank transfer</option><option value="card">Card</option><option value="online">Online</option>
          </select></label>
        <L label="Payment due date" name="due_date" type="date" />
        <label className="block"><span className="text-xs font-semibold text-slate-600">Status</span>
          <select className="input" name="status" defaultValue="confirmed">
            <option value="confirmed">Confirmed</option><option value="pending">Pending</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select></label>
        <L label="Notes" name="notes" />
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Package total ({travelers} pax)</p><p className="font-bold">${base.toFixed(2)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total</p><p className="font-bold">${grand.toFixed(2)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${balance.toFixed(2)}</p></div>
        <div className="rounded-lg accent-soft-bg p-3"><p className="text-xs text-slate-400">Profit</p><p className="font-bold accent">${profit.toFixed(2)}</p></div>
      </div>

      {/* 8 — DOCUMENTATION */}
      <p className={SECT}>8 · Documentation</p>
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
        📎 After saving, open the sale and upload passports, tickets, vouchers and receipts in its <b>Documents</b> section — every document stays attached to this booking.
      </p>

      <SubmitButton pendingText="Saving booking…">Save {category} booking</SubmitButton>
    </form>
  );
}
