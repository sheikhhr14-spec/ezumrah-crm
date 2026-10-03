'use client';
import CustomFieldInputs from '@/components/custom-field-inputs';
import { groupCustomSections } from '@/lib/custom-fields';
import CustomerPicker from '@/components/customer-picker';
import { useState } from 'react';
import { createServiceSale, updateServiceSaleFull } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';
import { money as fmtMoney } from '@/lib/format';
import type { SvcField } from '@/lib/service-sales';

const SECT = "mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1";
const ANCHORS = ['top', 'customer', 'phone', 'whatsapp', 'country', 'passport', 'bottom'];
const curSym = (c?: string | null) => {
  const code = (c || 'USD').toUpperCase();
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value || code; } catch { return code; }
};

export default function ServiceSaleForm({
  table, fields, customers, currency, taxRate, customFields, sale, saleExtras,
}: { table: string; fields: SvcField[]; customers: { id: string; full_name: string }[]; currency?: string | null; taxRate?: number; customFields?: { id: string; label: string; field_type: string; section?: string; anchor?: string }[]; sale?: any; saleExtras?: any[] }) {
  const cfFields = customFields || [];
  const cur = currency;
  const sym = curSym(currency);
  const symPad = sym.length <= 1 ? '2rem' : sym.length === 2 ? '2.6rem' : sym.length === 3 ? '3.3rem' : '3.8rem';
  const edit = !!sale?.id;
  const s2 = (v: any) => v === null || v === undefined ? '' : String(v);
  // stored sale_price/cost cover the primary hotel only — extras are separate stays/legs rows
  const mainPrice = edit ? String(Number(sale.sale_price || 0)) : '';
  const mainCost = edit ? String(Number(sale.cost || 0)) : '';
  const [useExisting, setUseExisting] = useState(!!edit);
  const [dates, setDates] = useState(edit ? { ci: s2(sale.check_in), co: s2(sale.check_out) } : { ci: '', co: '' });
  const hasStay = fields.some((f) => f.name === 'check_in') && fields.some((f) => f.name === 'check_out');
  const nights = dates.ci && dates.co ? Math.round((new Date(dates.co).getTime() - new Date(dates.ci).getTime()) / 86400000) : null;
  const [money, setMoney] = useState(edit
    ? { sale_price: mainPrice, cost: mainCost, admin_fee: s2(sale.admin_fee), discount: s2(sale.discount), tax: s2(sale.tax), commission: s2(sale.commission), paid: s2(sale.amount_paid) }
    : { sale_price: '', cost: '', admin_fee: '', discount: '', tax: '', commission: '', paid: '' });
  const [cf, setCf] = useState<Record<string, string>>(edit ? ((sale.custom_data as any) || {}) : {});
  const sec = (s: string) => cfFields.filter((f) => (f.section || 'general') === s);
  const cfa = (a: string) => sec('customer').filter((f) => (f.anchor || 'bottom') === a);
  const custBottom = sec('customer').filter((f) => { const a = f.anchor || 'bottom'; return a === 'bottom' || !ANCHORS.includes(a); });

  const isHotel = table === 'hotel_sales';
  const isTransport = table === 'transport_sales';
  const HOTEL_EXTRA = () => ({ ...Object.fromEntries(fields.filter((f) => f.name !== 'nights').map((f) => [f.name, ''])), sale_price: '', cost: '' });
  const TRANS_EXTRA = () => ({ from_location: '', to_location: '', transport_date: '', transport_time: '', vehicle_type: '', seats: '', driver_name: '', driver_phone: '', sale_price: '', cost: '' });
  const extraFrom = (x: any): Record<string, string> => table === 'hotel_sales'
    ? { ...Object.fromEntries(fields.filter((f) => f.name !== 'nights').map((f) => [f.name, s2(x[f.name])])), sale_price: s2(x.sale_price), cost: s2(x.cost) }
    : { from_location: s2(x.from_location), to_location: s2(x.to_location), transport_date: s2(x.transport_date), transport_time: s2(x.transport_time), vehicle_type: s2(x.vehicle_type), seats: s2(x.seats), driver_name: s2(x.driver_name), driver_phone: s2(x.driver_phone), sale_price: s2(x.sale_price), cost: s2(x.cost) };
  const [extras, setExtras] = useState<Record<string, string>[]>(edit ? (saleExtras || []).map(extraFrom) : []);
  const GUEST = () => ({ name: '', passport_no: '' });
  const [guests, setGuests] = useState<{ name: string; passport_no: string }[]>(
    edit && Array.isArray(sale.guests) && sale.guests.length ? sale.guests.map((g: any) => ({ name: g.name || '', passport_no: g.passport_no || '' }))
      : [{ name: edit ? (sale.customer_name || '') : '', passport_no: '' }]);
  const setG = (i: number, k: string) => (e: any) => setGuests(guests.map((g, j) => (j === i ? { ...g, [k]: e.target.value } : g)));
  const up = (i: number, k: string) => (e: any) => setExtras(extras.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
  const n = (v: string) => Number(v) || 0;
  const extrasPrice = extras.reduce((sm, x) => sm + n(x.sale_price), 0);
  const extrasCost = extras.reduce((sm, x) => sm + n(x.cost), 0);
  const taxAuto = (n(money.sale_price) + n(money.admin_fee) - n(money.discount)) * (taxRate || 0) / 100;

  const cfAdj = cfFields.reduce((s, f) => {
    const v = Number(cf[f.id]) || 0;
    return s + (f.field_type === 'plus' ? v : f.field_type === 'minus' ? -v : 0);
  }, 0);
  const grand = n(money.sale_price) + extrasPrice + n(money.admin_fee) - n(money.discount) + (money.tax !== '' ? n(money.tax) : Math.round(taxAuto * 100) / 100) + cfAdj;
  const profit = grand + n(money.commission) - (n(money.cost) + extrasCost);
  const balance = grand - n(money.paid);
  const pStatus = n(money.paid) <= 0 ? 'Unpaid' : n(money.paid) >= grand ? 'Fully paid' : 'Partial';

  const set = (k: string, v: string) => setMoney({ ...money, [k]: v });

  return (
    <form action={edit ? updateServiceSaleFull : createServiceSale} className="space-y-6">
      <input type="hidden" name="table" value={table} />
      {edit && <input type="hidden" name="id" value={sale.id} />}

<p className={SECT}>1 · Customer</p>
      {/* customer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <CustomerPicker customers={customers} initialId={edit ? sale.customer_id : undefined} onPick={(id) => setUseExisting(!!id)} />
        </div>
        {!useExisting && (
          <>
            <L label="Customer name *" name="customer_name" />
            {cfa('customer').length > 0 && <CustomFieldInputs fields={cfa('customer')} cf={cf} setCf={setCf} />}
            <L label="Phone" name="phone" />
            {cfa('phone').length > 0 && <CustomFieldInputs fields={cfa('phone')} cf={cf} setCf={setCf} />}
            <L label="WhatsApp" name="whatsapp" />
            {cfa('whatsapp').length > 0 && <CustomFieldInputs fields={cfa('whatsapp')} cf={cf} setCf={setCf} />}
            <L label="Country" name="country" />
            {cfa('country').length > 0 && <CustomFieldInputs fields={cfa('country')} cf={cf} setCf={setCf} />}
            <L label="Passport no." name="passport_no" />
            {cfa('passport').length > 0 && <CustomFieldInputs fields={cfa('passport')} cf={cf} setCf={setCf} />}
          </>
        )}
      </div>

      {custBottom.length > 0 && <CustomFieldInputs fields={custBottom} cf={cf} setCf={setCf} />}
      {cfa('top').length > 0 && <CustomFieldInputs fields={cfa('top')} cf={cf} setCf={setCf} />}

<p className={SECT}>2 · Sale details</p>
      {/* service fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f.name} className="block"><span className="text-xs font-semibold text-slate-600">{f.label}</span>
            {hasStay && (f.name === 'check_in' || f.name === 'check_out') ? (
              <input className="input" name={f.name} type="date" required={f.req} value={f.name === 'check_in' ? dates.ci : dates.co}
                onChange={(e) => setDates({ ...dates, [f.name === 'check_in' ? 'ci' : 'co']: e.target.value })} />
            ) : f.type === 'select' ? (
              <select className="input" name={f.name} required={f.req} defaultValue={edit ? ((sale as any)[f.name] || '') : ''}>
                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input className="input" name={f.name} required={f.req} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                step={f.type === 'number' ? '0.01' : undefined} placeholder={f.ph || ''} defaultValue={edit ? s2((sale as any)[f.name]) : ''} />
            )}
          </label>
        ))}
      </div>
      {hasStay && nights !== null && nights > 0 && (
        <p className="-mt-4 text-xs font-semibold accent">✓ Auto-calculated: {nights} night(s)</p>
      )}

      {/* guests repeater (hotel) — every occupant, not just the lead customer */}
      {isHotel && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Guests on this booking ({guests.filter((g) => g.name.trim()).length})</h3>
            <button type="button" className="btn-secondary text-xs" onClick={() => setGuests([...guests, GUEST()])}>＋ Add guest</button>
          </div>
          <div className="space-y-2">
            {guests.map((g, i) => (
              <div key={i} className="flex items-end gap-2">
                <label className="flex-1"><span className="text-xs text-slate-500">Guest {i + 1} name</span>
                  <input className="input" name={`guest_name_${i}`} placeholder="full name" value={g.name} onChange={setG(i, 'name')} />
                </label>
                <label className="w-40"><span className="text-xs text-slate-500">Passport no.</span>
                  <input className="input" name={`guest_pass_${i}`} placeholder="optional" value={g.passport_no} onChange={setG(i, 'passport_no')} />
                </label>
                <button type="button" className="btn-secondary text-xs text-red-500" onClick={() => setGuests(guests.filter((_, j) => j !== i))} title="Remove this guest">✕</button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">The first guest is usually the customer. Names flow to the booking confirmation and PDF invoice.</p>
        </div>
      )}

      {isHotel && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600">More hotels in this sale (Makkah + Madinah etc.) — complete details per hotel, same as Hotel 1.</p>
          {extras.map((x, i) => {
            const en = x.check_in && x.check_out ? Math.round((new Date(x.check_out).getTime() - new Date(x.check_in).getTime()) / 86400000) : 0;
            return (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Hotel {i + 2}{edit ? ' (saved)' : ''}</h3>
                  <button type="button" onClick={() => setExtras(extras.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">✕ remove</button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {fields.filter((f) => f.name !== 'nights').map((f) => (
                    <label key={f.name} className="block"><span className="text-xs font-semibold text-slate-600">{f.label}</span>
                      <input className="input" name={`extra_${f.name}_${i}`}
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        step={f.type === 'number' ? '0.01' : undefined}
                        placeholder={f.ph || ''} required={f.req}
                        value={x[f.name] || ''} onChange={up(i, f.name)} />
                    </label>
                  ))}
                </div>
                {en > 0 && <p className="-mt-2 text-xs font-semibold accent">✓ Auto-calculated: {en} night(s)</p>}
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} type="number" step="0.01" placeholder={`Sale price${cur ? ' (' + cur + ')' : ''}`} value={x.sale_price} onChange={up(i, 'sale_price')} name={`extra_sale_price_${i}`} /></div>
                  <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} type="number" step="0.01" placeholder="Our cost" value={x.cost} onChange={up(i, 'cost')} name={`extra_cost_${i}`} /></div>
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-secondary text-xs" onClick={() => setExtras([...extras, HOTEL_EXTRA()])}>＋ Add another hotel</button>
            {extras.length > 0 && <p className="text-xs text-slate-500">Adds {fmtMoney(extrasPrice, cur)} to the sale total automatically.</p>}
          </div>
        </div>
      )}

      <p className={SECT}>3 · Pricing & payment</p>
      {/* payment */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <M label="Sale price (to customer)" k="sale_price" money={money} set={set} sym={sym} />
          <M label="Cost (our price)" k="cost" money={money} set={set} sym={sym} />
          <M label="Admin fee" k="admin_fee" money={money} set={set} sym={sym} />
          <M label="Discount (-)" k="discount" money={money} set={set} sym={sym} />
          <M label="Tax / VAT" k="tax" money={money} set={set} sym={sym} />
          <M label="Commission (from supplier, +)" k="commission" money={money} set={set} sym={sym} />
          <M label="Amount paid" k="paid" money={money} set={set} sym={sym} />
          <label className="block"><span className="text-xs font-semibold text-slate-600">Payment method</span>
            <select className="input" name="payment_method" defaultValue={edit ? (sale.payment_method || '') : ''}>
              <option value="">— none yet —</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </label>

      {/* custom fields (owner-defined) */}
      {groupCustomSections(cfFields).map((grp) => (
        <div key={grp.title} className="rounded-xl border border-gold/30 bg-gold/5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{grp.title}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <CustomFieldInputs fields={grp.fields} cf={cf} setCf={setCf} />
          </div>
        </div>
      ))}
          <CustomFieldInputs fields={[...sec('money'), ...sec('payment')]} cf={cf} setCf={setCf} />
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
        {isTransport && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Add more trips to this sale (Ziyarat, return transfers etc.)</p>
            {extras.map((x, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500">Trip / Ziyarat {i + 2}{edit ? ' (saved)' : ''}</p>
                  <button type="button" onClick={() => setExtras(extras.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">✕ remove</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="input" placeholder="From" value={x.from_location} onChange={up(i, 'from_location')} name={`extra_from_${i}`} />
                  <input className="input" placeholder="To" value={x.to_location} onChange={up(i, 'to_location')} name={`extra_to_${i}`} />
                  <input className="input" type="date" title="Date" value={x.transport_date} onChange={up(i, 'transport_date')} name={`extra_date_${i}`} />
                  <input className="input" type="time" title="Time" value={x.transport_time} onChange={up(i, 'transport_time')} name={`extra_time_${i}`} />
                  <input className="input" placeholder="Vehicle (Hiace / bus)" value={x.vehicle_type} onChange={up(i, 'vehicle_type')} name={`extra_vehicle_${i}`} />
                  <input className="input" type="number" title="Seats" placeholder="Seats" value={x.seats} onChange={up(i, 'seats')} name={`extra_seats_${i}`} />
                  <input className="input" placeholder="Driver name" value={x.driver_name} onChange={up(i, 'driver_name')} name={`extra_driver_${i}`} />
                  <input className="input" placeholder="Driver phone" value={x.driver_phone} onChange={up(i, 'driver_phone')} name={`extra_phone_${i}`} />
                  <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} type="number" step="0.01" placeholder={`Sale price${cur ? ' (' + cur + ')' : ''}`} value={x.sale_price} onChange={up(i, 'sale_price')} name={`extra_sale_price_${i}`} /></div>
                  <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} type="number" step="0.01" placeholder="Our cost" value={x.cost} onChange={up(i, 'cost')} name={`extra_cost_${i}`} /></div>
                </div>
              </div>
            ))}
            <button type="button" className="btn-secondary text-xs" onClick={() => setExtras([...extras, TRANS_EXTRA()])}>＋ Add another trip / Ziyarat</button>
            {extras.length > 0 && <p className="text-xs text-slate-500">Adds {fmtMoney(extrasPrice, cur)} to the sale total automatically.</p>}
          </div>
        )}
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Tax / VAT</p><p className="font-bold">{fmtMoney(money.tax !== '' ? n(money.tax) : Math.round(taxAuto * 100) / 100, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">{isHotel ? 'More hotels' : 'More trips'}</p><p className="font-bold">{fmtMoney(extrasPrice, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total (incl. extras + tax)</p><p className="font-bold">{fmtMoney(grand, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmtMoney(balance, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Profit</p><p className="font-bold accent">{fmtMoney(profit, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Status</p><p className="font-semibold accent">{pStatus}</p></div>
        </div>
      </div>

      <SubmitButton pendingText={edit ? "Updating sale…" : "Saving sale…"}>{edit ? "Update sale" : "Save sale"}</SubmitButton>
    </form>
  );
}

function L({ label, name, def }: { label: string; name: string; def?: string }) {
  return (
    <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
      <input className="input" name={name} defaultValue={def} />
    </label>
  );
}

function M({ label, k, money, set, sym }: { label: string; k: string; money: any; set: (k: string, v: string) => void; sym?: string }) {
  const name = k === 'paid' ? 'amount_paid' : k;
  const s2 = sym || '';
  const symPad = s2.length <= 1 ? '2rem' : s2.length === 2 ? '2.6rem' : s2.length === 3 ? '3.3rem' : '3.8rem';
  return (
    <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
      <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} name={name} type="number" step="0.01" value={money[k]} onChange={(e) => set(k, e.target.value)} /></div>
    </label>
  );
}
