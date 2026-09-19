'use client';
import { useState } from 'react';
import { createFlightSale } from '@/lib/crm-actions';

type Leg = { fare: string; tax: string; cost: string };
const emptyLeg = () => ({ fare: '', tax: '', cost: '' });

export default function FlightSaleForm({ customers }: { customers: { id: string; full_name: string }[] }) {
  const [kind, setKind] = useState('oneway');
  const [legs, setLegs] = useState<Leg[]>([emptyLeg()]);
  const [adminFee, setAdminFee] = useState('');
  const [paid, setPaid] = useState('');
  const [useExisting, setUseExisting] = useState(false);

  const setLegCount = (k: string) => {
    setKind(k);
    if (k === 'oneway') setLegs([legs[0] || emptyLeg()]);
    else if (k === 'return' && legs.length < 2) setLegs([...legs, emptyLeg(), emptyLeg()].slice(0, 2));
    else if (legs.length < 2) setLegs([...legs, emptyLeg(), emptyLeg()]);
  };

  const n = (v: string) => Number(v) || 0;
  const saleTotal = legs.reduce((s, l) => s + n(l.fare) + n(l.tax), 0);
  const costTotal = legs.reduce((s, l) => s + n(l.cost), 0);
  const grand = saleTotal + n(adminFee);
  const profit = grand - costTotal;
  const balance = grand - n(paid);
  const pStatus = n(paid) <= 0 ? 'Unpaid' : n(paid) >= grand ? 'Fully paid' : 'Partial';

  const L = ({ label, name, type = 'text', ph = '' }: { label: string; name: string; type?: string; ph?: string }) => (
    <label className="block"><span className="text-xs text-slate-500">{label}</span>
      <input className="input" name={name} type={type} placeholder={ph} />
    </label>
  );

  return (
    <form action={createFlightSale} className="space-y-6">
      {/* customer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="text-xs font-semibold text-slate-600">Existing customer</span>
          <select className="input" name="existing_customer_id" value={useExisting ? undefined : ''} onChange={(e) => setUseExisting(!!e.target.value)}>
            <option value="">— New customer —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </label>
        {!useExisting && (
          <>
            <L label="Customer name *" name="customer_name" />
            <L label="Phone" name="phone" />
            <L label="WhatsApp" name="whatsapp" />
            <L label="Country" name="country" />
            <L label="Passport no." name="passport_no" />
          </>
        )}
      </div>

      {/* trip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="text-xs font-semibold text-slate-600">Trip type</span>
          <select className="input" name="trip_kind" value={kind} onChange={(e) => setLegCount(e.target.value)}>
            <option value="oneway">One-way</option>
            <option value="return">Return</option>
            <option value="multicity">Multi-city</option>
          </select>
        </label>
        <L label="Passengers" name="pax" type="number" />
      </div>

      {/* legs */}
      {legs.map((l, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Leg {i + 1} {kind === 'return' && i === 1 ? '(return)' : ''}
            {kind === 'multicity' && legs.length > 2 && i >= 1 && (
              <button type="button" className="ml-2 text-red-400 hover:underline"
                onClick={() => setLegs(legs.filter((_, j) => j !== i))}>remove</button>
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <L label="Airline *" name={`leg_airline_${i}`} />
            <L label="Flight no." name={`leg_flight_${i}`} />
            <L label="From *" name={`leg_from_${i}`} ph="JED" />
            <L label="To *" name={`leg_to_${i}`} ph="MED" />
            <L label="Departure" name={`leg_depart_${i}`} type="datetime-local" />
            <L label="Arrival" name={`leg_arrive_${i}`} type="datetime-local" />
            <L label="Cabin" name={`leg_cabin_${i}`} ph="economy" />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Fare (sale)</span>
              <input className="input" name={`leg_fare_${i}`} type="number" step="0.01" value={l.fare}
                onChange={(e) => setLegs(legs.map((x, j) => j === i ? { ...x, fare: e.target.value } : x))} />
            </label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Tax</span>
              <input className="input" name={`leg_tax_${i}`} type="number" step="0.01" value={l.tax}
                onChange={(e) => setLegs(legs.map((x, j) => j === i ? { ...x, tax: e.target.value } : x))} />
            </label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Cost (our price)</span>
              <input className="input" name={`leg_cost_${i}`} type="number" step="0.01" value={l.cost}
                onChange={(e) => setLegs(legs.map((x, j) => j === i ? { ...x, cost: e.target.value } : x))} />
            </label>
            <div className="flex items-end text-xs font-semibold accent">
              Leg: ${n(l.fare) + n(l.tax)} · profit ${(n(l.fare) + n(l.tax)) - n(l.cost)}
            </div>
          </div>
        </div>
      ))}
      {kind === 'multicity' && (
        <button type="button" className="btn-secondary text-xs" onClick={() => setLegs([...legs, emptyLeg()])}>+ Add leg</button>
      )}

      {/* payment */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Payment</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block"><span className="text-xs font-semibold text-slate-600">Admin fee</span>
            <input className="input" name="admin_fee" type="number" step="0.01" value={adminFee}
              onChange={(e) => setAdminFee(e.target.value)} />
          </label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Amount paid</span>
            <input className="input" name="amount_paid" type="number" step="0.01" value={paid}
              onChange={(e) => setPaid(e.target.value)} />
          </label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Payment method</span>
            <select className="input" name="payment_method">
              <option value="">— none yet —</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </label>
          <L label="Notes" name="notes" />
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Sale total</p><p className="font-bold">${saleTotal.toFixed(2)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Admin fee</p><p className="font-bold">${n(adminFee).toFixed(2)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total</p><p className="font-bold">${grand.toFixed(2)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${balance.toFixed(2)}</p></div>
          <div className="rounded-lg accent-soft-bg p-3"><p className="text-xs text-slate-400">Profit (after cost ${costTotal.toFixed(2)})</p><p className="font-bold accent">${profit.toFixed(2)}</p></div>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">Payment status: <span className="accent">{pStatus}</span></p>
      </div>

      <button className="btn-primary" type="submit">Save flight sale</button>
    </form>
  );
}
