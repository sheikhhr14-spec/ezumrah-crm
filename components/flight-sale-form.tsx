'use client';
import { useState } from 'react';
import { createFlightSale, updateFlightSale } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';
import { money } from '@/lib/format';
import CustomFieldInputs from '@/components/custom-field-inputs';
import { groupCustomSections } from '@/lib/custom-fields';
import CustomerPicker from '@/components/customer-picker';

const SECT = "mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1";
const ANCHORS = ['top', 'customer', 'phone', 'whatsapp', 'country', 'passport', 'bottom'];
const curSym = (c?: string | null) => {
  const code = (c || 'USD').toUpperCase();
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value || code; } catch { return code; }
};

type Leg = Record<string, string>;
type Pax = { title: string; first: string; last: string; passport: string; nat: string; ticket: string; type: string; gender: string; dob: string; pnr: string; fare: string; ptax: string; tamt: string; oc: string; samt: string; pft: string };
const ageFrom = (d: string) => { if (!d) return ''; return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 86400000))); };
const emptyPax = () => ({ title: 'Mr', first: '', last: '', passport: '', nat: '', ticket: '', type: 'ADT', gender: '', dob: '', pnr: '', fare: '', ptax: '', tamt: '', oc: '', samt: '', pft: '' });
const TITLES = ['Mr', 'Mrs', 'Miss', 'Ms', 'Master', 'Mstr', 'Dr'];
const emptyLeg = () => ({});

function PaxMoneyField({ label, ph, name, value, onChange, sym, symPad, readOnly }: { label: string; ph: string; name: string; value: string | number; onChange?: (e: any) => void; sym: string; symPad: string; readOnly?: boolean }) {
  return (
    <fieldset className={`relative rounded-lg border px-2 pb-1.5 pt-0 transition ${readOnly ? 'accent-soft-bg border-gold/30' : 'border-slate-300 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20'}`}>
      <legend className="ml-0.5 px-1 text-[10px] font-semibold text-slate-500">{label}</legend>
      <div className="relative -mt-0.5 mb-0.5">
        <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span>
        <input
          className={`w-full border-0 bg-transparent p-0 text-sm outline-none ${readOnly ? 'font-semibold accent' : ''}`}
          style={{ paddingLeft: symPad }}
          name={name} type="number" placeholder={ph} value={value}
          onChange={onChange} readOnly={readOnly}
        />
      </div>
    </fieldset>
  );
}

export default function FlightSaleForm({ customers, currency, taxRate, customFields, sale, saleLegs, salePassengers }: {
  customers: { id: string; full_name: string }[]; currency?: string | null; taxRate?: number;
  customFields?: { id: string; label: string; field_type: string; section?: string; anchor?: string }[];
  sale?: any; saleLegs?: any[]; salePassengers?: any[];
}) {
  const cfFields = customFields || [];
  const sym = curSym(currency);
  const symPad = sym.length <= 1 ? '2rem' : sym.length === 2 ? '2.6rem' : sym.length === 3 ? '3.3rem' : '3.8rem';
  const cur = currency;
  const edit = !!sale?.id;
  const s2 = (v: any) => v === null || v === undefined ? '' : String(v);
  const dtv = (v: any) => v ? new Date(v).toISOString().slice(0, 16) : '';
  const dv = (v: any) => v ? String(v).slice(0, 10) : '';
  const toPax = (p: any): Pax => ({
    title: p.title || 'Mr',
    first: p.first_name || (p.full_name || '').split(' ')[0] || '',
    last: p.last_name !== undefined && p.last_name !== null ? p.last_name : (p.full_name || '').split(' ').slice(1).join(' '),
    passport: p.passport_no || '', nat: p.nationality || '', ticket: p.ticket_no || '',
    type: p.pax_type || 'ADT', gender: p.gender || '', dob: p.dob ? String(p.dob).slice(0, 10) : '',
    pnr: p.pnr || '', fare: s2(p.fare), ptax: s2(p.tax), oc: s2(p.other_charges),
    samt: s2(p.sale_amount), tamt: '', pft: '',
  });
  const [kind, setKind] = useState(edit ? (sale.trip_kind || 'oneway') : 'oneway');
  const [legs, setLegs] = useState<Leg[]>(
    edit && (saleLegs || []).length
      ? (saleLegs as any[]).map((l) => ({ airline: l.airline || '', flight: l.flight_no || '', from: l.from_airport || '', to: l.to_airport || '', depart: dtv(l.depart_at), arrive: dtv(l.arrive_at), cabin: l.cabin || '', baggage: l.baggage || '' }))
      : [emptyLeg()]);
  const [adminFee, setAdminFee] = useState(edit ? s2(sale.admin_fee) : '');
  const [discount, setDiscount] = useState(edit ? s2(sale.discount) : '');
  const [tax, setTax] = useState(edit ? s2(sale.tax) : '');
  const [commission, setCommission] = useState(edit ? s2(sale.commission) : '');
  const [paid, setPaid] = useState(edit ? s2(sale.amount_paid) : '');
  const [useExisting, setUseExisting] = useState(!!edit);
  const [paxRows, setPaxRows] = useState<Pax[]>(
    edit && (salePassengers || []).length ? (salePassengers as any[]).map(toPax) : [emptyPax()]);

  const setLegCount = (k: string) => {
    setKind(k);
    if (k === 'oneway') setLegs([legs[0] || emptyLeg()]);
    else if (k === 'return' && legs.length < 2) setLegs([...legs, emptyLeg(), emptyLeg()].slice(0, 2));
    else if (legs.length < 2) setLegs([...legs, emptyLeg(), emptyLeg()]);
  };

  const n = (v: string) => Number(v) || 0;
  const paxCost = (p: Pax) => n(p.fare) + n(p.ptax) + n(p.oc);
  const saleTotal = paxRows.reduce((s, p) => s + (n(p.samt) || paxCost(p)), 0);
  const costTotal = paxRows.reduce((s, p) => s + paxCost(p), 0);
  const taxAuto = (saleTotal + n(adminFee) - n(discount)) * (taxRate || 0) / 100;
  const [cf, setCf] = useState<Record<string, string>>(edit ? ((sale.custom_data as any) || {}) : {});
  const sec = (s: string) => cfFields.filter((f) => (f.section || 'general') === s);
  const cfa = (a: string) => sec('customer').filter((f) => (f.anchor || 'bottom') === a);
  const custBottom = sec('customer').filter((f) => { const a = f.anchor || 'bottom'; return a === 'bottom' || !ANCHORS.includes(a); });


  const cfAdj = cfFields.reduce((s, f) => {
    const v = Number(cf[f.id]) || 0;
    return s + (f.field_type === 'plus' ? v : f.field_type === 'minus' ? -v : 0);
  }, 0);
  const grand = saleTotal + n(adminFee) - n(discount) + n(tax) + cfAdj;
  const profit = grand + n(commission) - costTotal;
  const balance = grand - n(paid);
  const pStatus = n(paid) <= 0 ? 'Unpaid' : n(paid) >= grand ? 'Fully paid' : 'Partial';

  const L = ({ label, name, type = 'text', ph = '', def }: { label: string; name: string; type?: string; ph?: string; def?: string }) => (
    <label className="block"><span className="text-xs text-slate-500">{label}</span>
      <input className="input" name={name} type={type} placeholder={ph} defaultValue={def} />
    </label>
  );

  return (
    <form action={edit ? updateFlightSale : createFlightSale} className="space-y-6">
      {edit && <input type="hidden" name="id" value={sale.id} />}
<p className={SECT}>1 · Customer</p>
      {/* customer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <CustomerPicker customers={customers} initialId={edit ? sale.customer_id : undefined} onPick={(id) => { setUseExisting(!!id); const c = customers.find((x) => x.id === id); if (c) { const parts = c.full_name.split(' '); setPaxRows((rs) => rs.map((r, i) => i === 0 ? { ...r, first: parts[0] || '', last: parts.slice(1).join(' ') } : r)); } }} />
          <p className="mt-1 text-[10px] text-slate-400">Booked under this customer (lead passenger)</p>
        </div>
        {!useExisting && (
          <>
            <L label="Customer name *" name="customer_name" def={edit ? sale.customers?.full_name : ''} />
            {cfa('customer').length > 0 && <CustomFieldInputs fields={cfa('customer')} cf={cf} setCf={setCf} />}
            <L label="Phone" name="phone" def={edit ? sale.customers?.phone : ''} />
            {cfa('phone').length > 0 && <CustomFieldInputs fields={cfa('phone')} cf={cf} setCf={setCf} />}
            <L label="WhatsApp" name="whatsapp" def={edit ? sale.customers?.whatsapp : ''} />
            {cfa('whatsapp').length > 0 && <CustomFieldInputs fields={cfa('whatsapp')} cf={cf} setCf={setCf} />}
            <L label="Country" name="country" def={edit ? sale.customers?.country : ''} />
            {cfa('country').length > 0 && <CustomFieldInputs fields={cfa('country')} cf={cf} setCf={setCf} />}

          </>
        )}
      </div>

      {custBottom.length > 0 && <CustomFieldInputs fields={custBottom} cf={cf} setCf={setCf} />}
      {cfa('top').length > 0 && <CustomFieldInputs fields={cfa('top')} cf={cf} setCf={setCf} />}

      <p className={SECT}>2 · Passengers</p>
      {/* passengers */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Passengers ({paxRows.length}) — first row is the lead passenger</p>
          <button type="button" className="btn-secondary text-xs" onClick={() => setPaxRows([...paxRows, emptyPax()])}>+ Add passenger</button>
        </div>
        <div className="space-y-2">
          {paxRows.map((p, i) => (
            <div key={i} className={`grid gap-2 rounded-lg p-2 sm:grid-cols-7 ${i === 0 ? 'accent-soft-bg border border-gold/30' : 'bg-slate-50'}`}>
              {i === 0 && <p className="text-[10px] font-bold uppercase tracking-wide accent sm:col-span-7">⭐ Lead passenger (booked under customer)</p>}
              <select className="input" name={`pax_title_${i}`} value={p.title} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, title: e.target.value } : r))}>
                {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="input" name={`pax_gender_${i}`} value={p.gender} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, gender: e.target.value } : r))}>
                <option value="">Gender</option><option value="Male">Male</option><option value="Female">Female</option>
              </select>
              <select className="input" name={`pax_type_${i}`} value={p.type} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, type: e.target.value } : r))}>
                {[['ADT', 'Adult'], ['CHD', 'Child'], ['YTH', 'Youth'], ['INF', 'Infant']].map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
              </select>
              <input className="input" name={`pax_first_${i}`} placeholder="First name *" value={p.first} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, first: e.target.value } : r))} />
              <input className="input" name={`pax_last_${i}`} placeholder="Last name" value={p.last} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, last: e.target.value } : r))} />
              <div className="flex gap-1">
                <input className="input" name={`pax_passport_${i}`} placeholder="Passport no." value={p.passport} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, passport: e.target.value } : r))} />
              </div>
              <input className="input" name={`pax_nat_${i}`} placeholder="Nationality" value={p.nat} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, nat: e.target.value } : r))} />
              <input className="input" name={`pax_dob_${i}`} type="date" value={p.dob} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, dob: e.target.value } : r))} />
              <input className="input" readOnly placeholder="Age (auto)" value={ageFrom(p.dob) !== '' ? String(ageFrom(p.dob)) : ''} title="Auto-calculated from DOB" />
              <input type="hidden" name={`pax_age_${i}`} value={ageFrom(p.dob)} />
              <input className="input" name={`pax_pnr_${i}`} placeholder="PNR#" value={p.pnr} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, pnr: e.target.value } : r))} />
              <div className="flex gap-1">
                <input className="input" name={`pax_ticket_${i}`} placeholder="Ticket #" value={p.ticket} onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, ticket: e.target.value } : r))} />
                {i > 0 && <button type="button" className="rounded border border-red-200 px-2 text-red-400 hover:bg-red-50" onClick={() => setPaxRows(paxRows.filter((_, j) => j !== i))}>✕</button>}
              </div>
              <PaxMoneyField label="Fare" ph="Base airfare" sym={sym} symPad={symPad}
                name={`pax_fare_${i}`} value={p.fare}
                onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, fare: e.target.value } : r))} />
              <PaxMoneyField label="Tax" ph="Airline tax & fees" sym={sym} symPad={symPad}
                name={`pax_ptax_${i}`} value={p.ptax}
                onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, ptax: e.target.value } : r))} />
              <PaxMoneyField label="Other charges" ph="ATOL, insurance, etc." sym={sym} symPad={symPad}
                name={`pax_oc_${i}`} value={p.oc}
                onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, oc: e.target.value } : r))} />
              <PaxMoneyField label="Cost amount" ph="Fare + Tax + Other" sym={sym} symPad={symPad} readOnly
                name={`pax_tamt_${i}`} value={n(p.fare) + n(p.ptax) + n(p.oc) || ''} />
              <PaxMoneyField label="Sale amount" ph="Charged to customer" sym={sym} symPad={symPad}
                name={`pax_samt_${i}`} value={p.samt}
                onChange={(e) => setPaxRows(paxRows.map((r, j) => j === i ? { ...r, samt: e.target.value } : r))} />
              <PaxMoneyField label="Profit" ph="Sale − Cost" sym={sym} symPad={symPad} readOnly
                name={`pax_pft_${i}`} value={n(p.samt) ? n(p.samt) - (n(p.fare) + n(p.ptax) + n(p.oc)) : ''} />
            </div>
          ))}
        </div>
      </div>

<p className={SECT}>3 · Trip details — legs</p>
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
        <L label="PNR / airline booking ref" name="pnr" ph="XYZ123" def={edit ? sale.pnr : ''} />
        <L label="Supplier / consolidator" name="supplier" ph="GDS / consolidator name" def={edit ? sale.supplier : ''} />
        <L label="Ticket issue date" name="issue_date" type="date" def={edit ? dv(sale.issue_date) : ''} />
        <label className="block"><span className="text-xs font-semibold text-slate-600">Refundable?</span>
          <select className="input" name="refundable" defaultValue={edit ? (sale.refundable || 'non-refundable') : 'non-refundable'}>
            <option value="non-refundable">Non-refundable</option>
            <option value="refundable">Refundable</option>
            <option value="partially refundable">Partially refundable</option>
          </select>
        </label>
<label className="block"><span className="text-xs font-semibold text-slate-600">Fare basis</span><input className="input" name="fare_basis" placeholder="Y class / LXR7" defaultValue={edit ? sale.fare_basis || '' : ''} /></label>
<label className="block"><span className="text-xs font-semibold text-slate-600">Source / referral</span><input className="input" name="source" placeholder="website / referral" defaultValue={edit ? sale.source || '' : ''} /></label>
<label className="block"><span className="text-xs font-semibold text-slate-600">Tags</span><input className="input" name="tags" placeholder="vip, group" defaultValue={edit ? sale.tags || '' : ''} /></label>
<label className="block"><span className="text-xs font-semibold text-slate-600">Follow-up date</span><input className="input" name="follow_up_date" type="date" defaultValue={edit ? dv(sale.follow_up_date) : ''} /></label>
        <L label="Payment due date" name="due_date" type="date" def={edit ? dv(sale.due_date) : ''} />
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
            <L label="Airline *" name={`leg_airline_${i}`} def={l.airline} />
            <L label="Flight no." name={`leg_flight_${i}`} def={l.flight} />
            <L label="From *" name={`leg_from_${i}`} ph="JED" def={l.from} />
            <L label="To *" name={`leg_to_${i}`} ph="MED" def={l.to} />
            <L label="Departure" name={`leg_depart_${i}`} type="datetime-local" def={l.depart} />
            <L label="Arrival" name={`leg_arrive_${i}`} type="datetime-local" def={l.arrive} />
            <L label="Cabin" name={`leg_cabin_${i}`} ph="economy" def={l.cabin} />
                        <L label="Baggage" name={`leg_baggage_${i}`} ph="2 x 23kg" def={l.baggage} />
            
          </div>
        </div>
      ))}
      {kind === 'multicity' && (
        <button type="button" className="btn-secondary text-xs" onClick={() => setLegs([...legs, emptyLeg()])}>+ Add leg</button>
      )}

      <p className={SECT}>4 · Payment</p>
      {/* payment */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block"><span className="text-xs font-semibold text-slate-600">Admin fee</span>
            <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="admin_fee" type="number" step="0.01" value={adminFee}
              onChange={(e) => setAdminFee(e.target.value)} /></div>
          </label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Discount (-)</span>
            <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="discount" type="number" step="0.01" value={discount}
              onChange={(e) => setDiscount(e.target.value)} /></div>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Tax / VAT ({taxRate || 0}% auto)</span>
            <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="tax" type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} placeholder={String(Math.round(taxAuto * 100) / 100)} /></div>
          </label>
          </label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Commission (from supplier, +)</span>
            <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="commission" type="number" step="0.01" value={commission}
              onChange={(e) => setCommission(e.target.value)} /></div>
          </label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Amount paid</span>
            <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name="amount_paid" type="number" step="0.01" value={paid}
              onChange={(e) => setPaid(e.target.value)} /></div>
          </label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Payment method</span>
            <select className="input" name="payment_method" defaultValue={edit ? sale.payment_method || '' : ''}>
              <option value="">— none yet —</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </label>
          <L label="Notes" name="notes" def={edit ? sale.notes || '' : ''} />
          <label className="block"><span className="text-xs font-semibold text-slate-600">Sale status</span>
            <select className="input" name="status" defaultValue={edit ? (sale.status || 'confirmed') : 'confirmed'}>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      {[...sec('money'), ...sec('payment')].length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3"><CustomFieldInputs fields={[...sec('money'), ...sec('payment')]} cf={cf} setCf={setCf} /></div>
      )}

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Sale total</p><p className="font-bold">{money(saleTotal, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Admin fee</p><p className="font-bold">{money(n(adminFee), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Discount</p><p className="font-bold text-red-500">-{money(n(discount), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Tax / VAT</p><p className="font-bold">{money(n(tax) || Math.round(taxAuto * 100) / 100, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Supplier commission</p><p className="font-bold text-emerald-600">+{money(n(commission), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total (after discount)</p><p className="font-bold">{money(grand, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{money(balance, cur)}</p></div>
          <div className="rounded-lg accent-soft-bg p-3"><p className="text-xs text-slate-400">Profit (after cost {money(costTotal, cur)})</p><p className="font-bold accent">{money(profit, cur)}</p></div>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">Payment status: <span className="accent">{pStatus}</span></p>
      </div>


      {/* custom fields (owner-defined) */}
      {groupCustomSections(cfFields).map((grp) => (
        <div key={grp.title} className="rounded-xl border border-gold/30 bg-gold/5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{grp.title}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <CustomFieldInputs fields={grp.fields} cf={cf} setCf={setCf} />
          </div>
        </div>
      ))}
      <SubmitButton pendingText={edit ? "Updating flight sale…" : "Saving flight sale…"}>{edit ? "Update flight sale" : "Save flight sale"}</SubmitButton>
    </form>
  );
}
