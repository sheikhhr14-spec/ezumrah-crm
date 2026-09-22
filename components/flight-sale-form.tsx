'use client';
import { useState } from 'react';
import { createFlightSale } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';
import { money } from '@/lib/format';
import CustomerPicker from '@/components/customer-picker';

type Leg = { fare: string; tax: string; cost: string };
type Pax = { title: string; name: string; passport: string; age: string; nat: string; ticket: string; type: string; gender: string; dob: string; pnr: string; fare: string; ptax: string; samt: string; pft: string };
const emptyPax = () => ({ title: 'Mr', name: '', passport: '', age: '', nat: '', ticket: '', type: 'ADT', gender: '', dob: '', pnr: '', fare: '', ptax: '', samt: '', pft: '' });
const TITLES = ['Mr', 'Mrs', 'Miss', 'Ms', 'Master', 'Mstr', 'Dr'];
const emptyLeg = () => ({ fare: '', tax: '', cost: '' });

export default function FlightSaleForm({ customers, currency, taxRate }: { customers: { id: string; full_name: string }[]; currency?: string | null; taxRate?: number }) {
  const cur = currency;
  const [kind, setKind] = useState('oneway');
  const [legs, setLegs] = useState<Leg[]>([emptyLeg()]);
  const [adminFee, setAdminFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [commission, setCommission] = useState('');
  const [paid, setPaid] = useState('');
  const [useExisting, setUseExisting] = useState(false);
  const [paxRows, setPaxRows] = useState<Pax[]>([emptyPax()]);

  const setLegCount = (k: string) => {
    setKind(k);
    if (k === 'oneway') setLegs([legs[0] || emptyLeg()]);
    else if (k === 'return' && legs.length < 2) setLegs([...legs, emptyLeg(), emptyLeg()].slice(0, 2));
    else if (legs.length < 2) setLegs([...legs, emptyLeg(), emptyLeg()]);
  };

  const n = (v: string) => Number(v) || 0;
  const saleTotal = legs.reduce((s, l) => s + n(l.fare) + n(l.tax), 0);
  const costTotal = legs.reduce((s, l) => s + n(l.cost), 0);
  const taxAuto = (saleTotal + n(adminFee) - n(discount)) * (taxRate || 0) / 100;
  const grand = saleTotal + n(adminFee) - n(discount) + n(tax);
  const profit = grand + n(commission) - costTotal;
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
        <div className="sm:col-span-1">
          <CustomerPicker customers={customers} onPick={(id) => { setUseExisting(!!id); const c = customers.find((x) => x.id === id); if (c) setPaxRows((rs) => rs.map((r, i) => i === 0 ? { ...r, name: c.full_name } : r)); }} />
          <p className="mt-1 text-[10px] text-slate-400">Booked under this customer (lead passenger)</p>
        </div>
        {!useExisting && (
          <>
            <L label="Customer name *" name="customer_name" />
            <L label="Phone" name="phone" />
            <L label="WhatsApp" name="whatsapp" />
            <L label="Country" name="country" />

          </>
        )}
      </div>

      {/* passengers */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Passengers ({paxRows.length}) — first row is the lead passenger</p>
          <button type="button" className="btn-secondary text-xs" onClick={() => setPaxRows([...paxRows, emptyPax()])}>+ Add passenger</button>
        </div>
        <div className="space-y-2">
          {paxRows.map((p, i) => (
            <div key={i} className={`grid gap-2 rounded-lg p-2 sm:grid-cols-6 ${i === 0 ? 'accent-soft-bg border border-gold/30' : 'bg-slate-50'}`}>
              {i === 0 && <p className="text-[10px] font-bold uppercase tracking-wide accent sm:col-span-6">⭐ Lead passenger (booked under customer)</p>}
              <select className="input" name={`pax_title_${i}`} value={p.title} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, title: e.target.value } : r))}>
                {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input" name={`pax_name_${i}`} placeholder="Full name *" value={p.name} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} />
              <input className="input" name={`pax_passport_${i}`} placeholder="Passport no." value={p.passport} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, passport: e.target.value } : r))} />
              <input className="input" name={`pax_nat_${i}`} placeholder="Nationality" value={p.nat} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, nat: e.target.value } : r))} />
              <div className="flex gap-1">
                <input className="input" name={`pax_ticket_${i}`} placeholder="Ticket no." value={p.ticket} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, ticket: e.target.value } : r))} />
                {i > 0 && <button type="button" className="rounded border border-red-200 px-2 text-red-400 hover:bg-red-50" onClick={() => setPaxRows(paxRows.filter((_, j) => j !== i))}>✕</button>}
              </div>
              <select className="input" name={`pax_type_${i}`} value={p.type} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, type: e.target.value } : r))}>
                {[['ADT', 'Adult'], ['CHD', 'Child'], ['YTH', 'Youth'], ['INF', 'Infant']].map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
              </select>
              <select className="input" name={`pax_gender_${i}`} value={p.gender} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, gender: e.target.value } : r))}>
                <option value="">Gender</option><option value="Male">Male</option><option value="Female">Female</option>
              </select>
              <input className="input" name={`pax_dob_${i}`} type="date" value={p.dob} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, dob: e.target.value } : r))} />
              <input className="input" name={`pax_fare_${i}`} type="number" placeholder="Fare" value={p.fare} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, fare: e.target.value } : r))} />
              <input className="input" name={`pax_ptax_${i}`} type="number" placeholder="Tax" value={p.ptax} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, ptax: e.target.value } : r))} />
              <input className="input" name={`pax_samt_${i}`} type="number" placeholder="Sale amount" value={p.samt} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, samt: e.target.value } : r))} />
              <input className="input" name={`pax_pft_${i}`} type="number" placeholder="Profit" value={p.pft} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, pft: e.target.value } : r))} />
            </div>
          ))}
        </div>
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
        <input type="hidden" name="pax" value={paxRows.length} />
        <L label="PNR / airline booking ref" name="pnr" ph="XYZ123" />
        <L label="Supplier / consolidator" name="supplier" ph="GDS / consolidator name" />
        <L label="Ticket issue date" name="issue_date" type="date" />
        <label className="block"><span className="text-xs font-semibold text-slate-600">Refundable?</span>
          <select className="input" name="refundable" defaultValue="non-refundable">
            <option value="non-refundable">Non-refundable</option>
            <option value="refundable">Refundable</option>
            <option value="partially refundable">Partially refundable</option>
          </select>
        </label>
<label className="block"><span className="text-xs font-semibold text-slate-600">Fare basis</span><input className="input" name="fare_basis" placeholder="Y class / LXR7" /></label>
<label className="block"><span className="text-xs font-semibold text-slate-600">Source / referral</span><input className="input" name="source" placeholder="website / referral" /></label>
<label className="block"><span className="text-xs font-semibold text-slate-600">Tags</span><input className="input" name="tags" placeholder="vip, group" /></label>
<label className="block"><span className="text-xs font-semibold text-slate-600">Follow-up date</span><input className="input" name="follow_up_date" type="date" /></label>
        <L label="Payment due date" name="due_date" type="date" />
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
                        <L label="Baggage" name={`leg_baggage_${i}`} ph="2 x 23kg" />
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
          <label className="block"><span className="text-xs font-semibold text-slate-600">Discount (-)</span>
            <input className="input" name="discount" type="number" step="0.01" value={discount}
              onChange={(e) => setDiscount(e.target.value)} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Tax / VAT ({taxRate || 0}% auto)</span>
            <input className="input" name="tax" type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} placeholder={String(Math.round(taxAuto * 100) / 100)} />
          </label>
          </label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Commission (from supplier, +)</span>
            <input className="input" name="commission" type="number" step="0.01" value={commission}
              onChange={(e) => setCommission(e.target.value)} />
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
          <label className="block"><span className="text-xs font-semibold text-slate-600">Sale status</span>
            <select className="input" name="status" defaultValue="confirmed">
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Sale total</p><p className="font-bold">${money(saleTotal, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Admin fee</p><p className="font-bold">${money(n(adminFee), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Discount</p><p className="font-bold text-red-500">-${money(n(discount), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Tax / VAT</p><p className="font-bold">${money(n(tax) || Math.round(taxAuto * 100) / 100, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Supplier commission</p><p className="font-bold text-emerald-600">+${money(n(commission), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total (after discount)</p><p className="font-bold">${money(grand, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${money(balance, cur)}</p></div>
          <div className="rounded-lg accent-soft-bg p-3"><p className="text-xs text-slate-400">Profit (after cost ${money(costTotal, cur)})</p><p className="font-bold accent">${money(profit, cur)}</p></div>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">Payment status: <span className="accent">{pStatus}</span></p>
      </div>

      <SubmitButton pendingText="Saving flight sale…">Save flight sale</SubmitButton>
    </form>
  );
}
