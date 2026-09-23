'use client';
import CustomerPicker from '@/components/customer-picker';
import { useState } from 'react';
import { createServiceSale } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';
import { money as fmtMoney } from '@/lib/format';
import type { SvcField } from '@/lib/service-sales';

const curSym = (c?: string | null) => {
  const code = (c || 'USD').toUpperCase();
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value || code; } catch { return code; }
};

export default function ServiceSaleForm({
  table, fields, customers, currency, taxRate,
}: { table: string; fields: SvcField[]; customers: { id: string; full_name: string }[]; currency?: string | null; taxRate?: number }) {
  const cur = currency;
  const sym = curSym(currency);
  const symPad = sym.length <= 1 ? '2rem' : sym.length === 2 ? '2.6rem' : sym.length === 3 ? '3.3rem' : '3.8rem';
  const [useExisting, setUseExisting] = useState(false);
  const [dates, setDates] = useState({ ci: '', co: '' });
  const hasStay = fields.some((f) => f.name === 'check_in') && fields.some((f) => f.name === 'check_out');
  const nights = dates.ci && dates.co ? Math.round((new Date(dates.co).getTime() - new Date(dates.ci).getTime()) / 86400000) : null;
  const [money, setMoney] = useState({ sale_price: '', cost: '', admin_fee: '', discount: '', tax: '', commission: '', paid: '' });
  const isHotel = table === 'hotel_sales';
  const isTransport = table === 'transport_sales';
  const HOTEL_EXTRA = () => ({ city: '', hotel_name: '', check_in: '', check_out: '', room_type: '', rooms_count: '', meal_plan: '', sale_price: '', cost: '' });
  const TRANS_EXTRA = () => ({ from_location: '', to_location: '', transport_date: '', transport_time: '', vehicle_type: '', seats: '', driver_name: '', driver_phone: '', sale_price: '', cost: '' });
  const [extras, setExtras] = useState<Record<string, string>[]>([]);
  const up = (i: number, k: string) => (e: any) => setExtras(extras.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
  const extrasPrice = extras.reduce((sm, x) => sm + n(x.sale_price), 0);
  const extrasCost = extras.reduce((sm, x) => sm + n(x.cost), 0);
  const n = (v: string) => Number(v) || 0;
  const taxAuto = (n(money.sale_price) + n(money.admin_fee) - n(money.discount)) * (taxRate || 0) / 100;
  const grand = n(money.sale_price) + extrasPrice + n(money.admin_fee) - n(money.discount) + (money.tax !== '' ? n(money.tax) : Math.round(taxAuto * 100) / 100);
  const profit = grand + n(money.commission) - (n(money.cost) + extrasCost);
  const balance = grand - n(money.paid);
  const pStatus = n(money.paid) <= 0 ? 'Unpaid' : n(money.paid) >= grand ? 'Fully paid' : 'Partial';

  const set = (k: string, v: string) => setMoney({ ...money, [k]: v });

  return (
    <form action={createServiceSale} className="space-y-6">
      <input type="hidden" name="table" value={table} />

      {/* customer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <CustomerPicker customers={customers} onPick={(id) => setUseExisting(!!id)} />
        </div>
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

      {/* service fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f.name} className="block"><span className="text-xs font-semibold text-slate-600">{f.label}</span>
            {hasStay && (f.name === 'check_in' || f.name === 'check_out') ? (
              <input className="input" name={f.name} type="date" value={f.name === 'check_in' ? dates.ci : dates.co}
                onChange={(e) => setDates({ ...dates, [f.name === 'check_in' ? 'ci' : 'co']: e.target.value })} />
            ) : f.type === 'select' ? (
              <select className="input" name={f.name} defaultValue="">
                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input className="input" name={f.name} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                step={f.type === 'number' ? '0.01' : undefined} placeholder={f.ph || ''} />
            )}
          </label>
        ))}
      </div>
      {hasStay && nights !== null && nights > 0 && (
        <p className="-mt-4 text-xs font-semibold accent">✓ Auto-calculated: {nights} night(s)</p>
      )}

      {/* payment */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Pricing & payment</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <M label="Sale price (to customer)" k="sale_price" money={money} set={set} sym={sym} />
          <M label="Cost (our price)" k="cost" money={money} set={set} sym={sym} />
          <M label="Admin fee" k="admin_fee" money={money} set={set} sym={sym} />
          <M label="Discount (-)" k="discount" money={money} set={set} sym={sym} />
          <M label="Tax / VAT" k="tax" money={money} set={set} sym={sym} />
          <M label="Commission (from supplier, +)" k="commission" money={money} set={set} sym={sym} />
          <M label="Amount paid" k="paid" money={money} set={set} sym={sym} />
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
        {(isHotel || isTransport) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">{isHotel ? 'Add more hotels to this sale (Makkah + Madinah etc.)' : 'Add more trips to this sale (Ziyarat, return transfers etc.)'}</p>
            {extras.map((x, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500">{isHotel ? `Hotel ${i + 2}` : `Trip / Ziyarat ${i + 2}`}</p>
                  <button type="button" onClick={() => setExtras(extras.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">✕ remove</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {isHotel ? (<>
                    <input className="input" placeholder="Hotel name" value={x.hotel_name} onChange={up(i, 'hotel_name')} name={`extra_hotel_${i}`} />
                    <input className="input" placeholder="City (Makkah / Madinah)" value={x.city} onChange={up(i, 'city')} name={`extra_city_${i}`} />
                    <input className="input" type="date" title="Check-in" value={x.check_in} onChange={up(i, 'check_in')} name={`extra_checkin_${i}`} />
                    <input className="input" type="date" title="Check-out" value={x.check_out} onChange={up(i, 'check_out')} name={`extra_checkout_${i}`} />
                    <input className="input" placeholder="Room type" value={x.room_type} onChange={up(i, 'room_type')} name={`extra_roomtype_${i}`} />
                    <input className="input" type="number" title="Rooms" placeholder="Rooms" value={x.rooms_count} onChange={up(i, 'rooms_count')} name={`extra_rooms_${i}`} />
                    <input className="input" placeholder="Meal plan (BB/HB/FB)" value={x.meal_plan} onChange={up(i, 'meal_plan')} name={`extra_meal_${i}`} />
                  </>) : (<>
                    <input className="input" placeholder="From" value={x.from_location} onChange={up(i, 'from_location')} name={`extra_from_${i}`} />
                    <input className="input" placeholder="To" value={x.to_location} onChange={up(i, 'to_location')} name={`extra_to_${i}`} />
                    <input className="input" type="date" title="Date" value={x.transport_date} onChange={up(i, 'transport_date')} name={`extra_date_${i}`} />
                    <input className="input" type="time" title="Time" value={x.transport_time} onChange={up(i, 'transport_time')} name={`extra_time_${i}`} />
                    <input className="input" placeholder="Vehicle (Hiace / bus)" value={x.vehicle_type} onChange={up(i, 'vehicle_type')} name={`extra_vehicle_${i}`} />
                    <input className="input" type="number" title="Seats" placeholder="Seats" value={x.seats} onChange={up(i, 'seats')} name={`extra_seats_${i}`} />
                    <input className="input" placeholder="Driver name" value={x.driver_name} onChange={up(i, 'driver_name')} name={`extra_driver_${i}`} />
                    <input className="input" placeholder="Driver phone" value={x.driver_phone} onChange={up(i, 'driver_phone')} name={`extra_phone_${i}`} />
                  </>)}
                  <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} type="number" step="0.01" placeholder={`Sale price${cur ? ' (' + cur + ')' : ''}`} value={x.sale_price} onChange={up(i, 'sale_price')} name={`extra_sale_price_${i}`} /></div>
                  <div className="relative"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold accent">{sym}</span><input className="input" style={{ paddingLeft: symPad }} type="number" step="0.01" placeholder="Our cost" value={x.cost} onChange={up(i, 'cost')} name={`extra_cost_${i}`} /></div>
                </div>
              </div>
            ))}
            <button type="button" className="btn-secondary text-xs" onClick={() => setExtras([...extras, isHotel ? HOTEL_EXTRA() : TRANS_EXTRA()])}>
              {isHotel ? '＋ Add another hotel' : '＋ Add another trip / Ziyarat'}
            </button>
            {extras.length > 0 && <p className="text-xs text-slate-500">Adds {fmtMoney(extrasPrice, cur)} to the sale total automatically.</p>}
          </div>
        )}
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Tax / VAT</p><p className="font-bold">{fmtMoney(grand - n(money.sale_price) - n(money.admin_fee) + n(money.discount), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">{isHotel ? 'More hotels' : 'More trips'}</p><p className="font-bold">{fmtMoney(extrasPrice, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total (incl. extras + tax)</p><p className="font-bold">${fmtMoney(grand, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${fmtMoney(balance, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Profit</p><p className="font-bold accent">${fmtMoney(profit, cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Status</p><p className="font-semibold accent">{pStatus}</p></div>
        </div>
      </div>

      <SubmitButton pendingText="Saving sale…">Save sale</SubmitButton>
    </form>
  );
}

function L({ label, name }: { label: string; name: string }) {
  return (
    <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
      <input className="input" name={name} />
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
