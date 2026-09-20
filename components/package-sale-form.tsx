'use client';
import { useState } from 'react';
import { createPackageSale } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';

const n = (v: string) => Number(v) || 0;

export default function PackageSaleForm({ customers }: { customers: { id: string; full_name: string }[] }) {
  const [category, setCategory] = useState('umrah');
  const [pax, setPax] = useState('1');
  const [rooms, setRooms] = useState({ quint: '', quad: '', triple: '', double: '', single: '' });
  const [money, setMoney] = useState({ sale: '', supp: '', fee: '', discount: '', commission: '', cost: '', paid: '' });

  const capacity = n(rooms.quint) * 5 + n(rooms.quad) * 4 + n(rooms.triple) * 3 + n(rooms.double) * 2 + n(rooms.single);
  const grand = n(money.sale) + n(money.supp) + n(money.fee) - n(money.discount);
  const profit = grand + n(money.commission) - n(money.cost);
  const balance = grand - n(money.paid);
  const set = (k: keyof typeof money) => (e: React.ChangeEvent<HTMLInputElement>) => setMoney({ ...money, [k]: e.target.value });
  const setR = (k: keyof typeof rooms) => (e: React.ChangeEvent<HTMLInputElement>) => setRooms({ ...rooms, [k]: e.target.value });

  const L = ({ label, name, type = 'text', ph = '' }: { label: string; name: string; type?: string; ph?: string }) => (
    <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
      <input className="input" name={name} type={type} placeholder={ph} /></label>
  );

  return (
    <form action={createPackageSale} className="space-y-6">
      {/* package + customer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="text-xs font-semibold text-slate-600">Package category *</span>
          <select className="input" name="package_category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="umrah">Umrah package</option>
            <option value="hajj">Hajj package</option>
            <option value="tour">Tour package</option>
          </select>
        </label>
        <L label="Package name *" name="package_name" ph="14-Day Deluxe Umrah / Hajj 2026 / Turkey Tour" />
        <label className="block"><span className="text-xs font-semibold text-slate-600">Customer *</span>
          <select className="input" name="existing_customer_id">
            <option value="">— create new customer below —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </label>
        <L label="New customer name (if new)" name="customer_name" />
        <L label="Phone" name="phone" />
        <L label="WhatsApp" name="whatsapp" />
        <L label="Country" name="country" />
        <L label="Passport no." name="passport_no" />
        <label className="block"><span className="text-xs font-semibold text-slate-600">Pilgrims / travelers</span>
          <input className="input" name="pax" type="number" min="1" value={pax} onChange={(e) => setPax(e.target.value)} /></label>
        <L label="Departure date" name="departure_date" type="date" />
        <L label="Return date" name="return_date" type="date" />
      </div>

      {/* group flight (bulk booking) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Group flight (bulk booking)</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <L label="Airline" name="airline" ph="Saudia / PIA / Flynas" />
          <L label="Outbound flight no." name="flight_no" />
          <L label="From airport" name="from_airport" />
          <L label="To airport" name="to_airport" />
          <L label="Departure" name="depart_at" type="datetime-local" />
          <L label="Return flight no." name="return_flight_no" />
          <L label="Group PNR" name="pnr" />
        </div>
      </div>

      {/* bus + seats */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Bus / transport (in-Saudi)</p>
        <div className="grid gap-4 sm:grid-cols-5">
          <L label="Bus company" name="bus_company" ph="SAPTCO / private" />
          <L label="From" name="bus_from" ph="Riyadh" />
          <L label="To" name="bus_to" ph="Makkah" />
          <L label="Bus date" name="bus_date" type="date" />
          <L label="Assigned seats" name="bus_seats" ph="e.g. 12A, 12B, 13A" />
        </div>
      </div>

      {/* hotels + rooms */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Hotels & room sharing</p>
        <div className="grid gap-4 sm:grid-cols-4">
          {category !== 'tour' ? (<>
            <L label="Makkah hotel" name="makkah_hotel" />
            <L label="Makkah nights" name="makkah_nights" type="number" />
            <L label="Madinah hotel" name="madinah_hotel" />
            <L label="Madinah nights" name="madinah_nights" type="number" />
          </>) : (<>
            <L label="Destination" name="tour_destination" ph="Turkey / Dubai / Egypt" />
            <L label="Hotel" name="tour_hotel" />
            <L label="Nights" name="tour_nights" type="number" />
          </>)}
          <label className="block"><span className="text-xs font-semibold text-slate-600">Quint rooms (5 sharing)</span>
            <input className="input" name="rooms_quint" type="number" value={rooms.quint} onChange={setR('quint')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Quad rooms (4 sharing)</span>
            <input className="input" name="rooms_quad" type="number" value={rooms.quad} onChange={setR('quad')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Triple rooms</span>
            <input className="input" name="rooms_triple" type="number" value={rooms.triple} onChange={setR('triple')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Double rooms (extra charge)</span>
            <input className="input" name="rooms_double" type="number" value={rooms.double} onChange={setR('double')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Single rooms (extra charge)</span>
            <input className="input" name="rooms_single" type="number" value={rooms.single} onChange={setR('single')} /></label>
        </div>
        <p className={`mt-3 text-xs font-semibold ${capacity === n(pax) ? 'text-emerald-600' : 'text-red-500'}`}>
          Room capacity: {capacity} pax {capacity === n(pax) ? '✓ matches travelers' : `⚠ does not match ${n(pax)} travelers`}
        </p>
      </div>

      {/* payment */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Payment</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block"><span className="text-xs font-semibold text-slate-600">Package price (total)</span>
            <input className="input" name="sale_price" type="number" step="0.01" value={money.sale} onChange={set('sale')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Separate-room supplement (+)</span>
            <input className="input" name="supplement" type="number" step="0.01" value={money.supp} onChange={set('supp')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Admin fee</span>
            <input className="input" name="admin_fee" type="number" step="0.01" value={money.fee} onChange={set('fee')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Discount (-)</span>
            <input className="input" name="discount" type="number" step="0.01" value={money.discount} onChange={set('discount')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Cost (our total cost)</span>
            <input className="input" name="cost" type="number" step="0.01" value={money.cost} onChange={set('cost')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Commission (from supplier, +)</span>
            <input className="input" name="commission" type="number" step="0.01" value={money.commission} onChange={set('commission')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Amount paid</span>
            <input className="input" name="amount_paid" type="number" step="0.01" value={money.paid} onChange={set('paid')} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Payment method</span>
            <select className="input" name="payment_method">
              <option value="">— none yet —</option>
              <option value="cash">Cash</option><option value="bank">Bank transfer</option>
              <option value="card">Card</option><option value="online">Online</option>
            </select></label>
          <L label="Payment due date" name="due_date" type="date" />
          <label className="block"><span className="text-xs font-semibold text-slate-600">Status</span>
            <select className="input" name="status" defaultValue="confirmed">
              <option value="confirmed">Confirmed</option><option value="pending">Pending</option>
              <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select></label>
          <L label="Notes" name="notes" />
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total</p><p className="font-bold">${grand.toFixed(2)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Per person</p><p className="font-bold">${n(pax) ? (grand / n(pax)).toFixed(2) : '0.00'}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${balance.toFixed(2)}</p></div>
          <div className="rounded-lg accent-soft-bg p-3"><p className="text-xs text-slate-400">Profit</p><p className="font-bold accent">${profit.toFixed(2)}</p></div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Payment status: <b className="accent">{n(money.paid) <= 0 ? 'Unpaid' : n(money.paid) >= grand ? 'Fully paid' : 'Partial'}</b></p>
      </div>
      <SubmitButton pendingText="Saving package sale…">Save package sale</SubmitButton>
    </form>
  );
}
