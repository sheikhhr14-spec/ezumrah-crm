'use client';
import { useState } from 'react';
import { createServiceSale } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';
import { money as fmtMoney } from '@/lib/format';
import type { SvcField } from '@/lib/service-sales';

export default function ServiceSaleForm({
  table, fields, customers, currency, taxRate,
}: { table: string; fields: SvcField[]; customers: { id: string; full_name: string }[]; currency?: string | null; taxRate?: number }) {
  const cur = currency;
  const [useExisting, setUseExisting] = useState(false);
  const [dates, setDates] = useState({ ci: '', co: '' });
  const hasStay = fields.some((f) => f.name === 'check_in') && fields.some((f) => f.name === 'check_out');
  const nights = dates.ci && dates.co ? Math.round((new Date(dates.co).getTime() - new Date(dates.ci).getTime()) / 86400000) : null;
  const [money, setMoney] = useState({ sale_price: '', cost: '', admin_fee: '', discount: '', tax: '', commission: '', paid: '' });
  const n = (v: string) => Number(v) || 0;
  const taxAuto = (n(money.sale_price) + n(money.admin_fee) - n(money.discount)) * (taxRate || 0) / 100;
  const grand = n(money.sale_price) + n(money.admin_fee) - n(money.discount) + (money.tax !== '' ? n(money.tax) : Math.round(taxAuto * 100) / 100);
  const profit = grand + n(money.commission) - n(money.cost);
  const balance = grand - n(money.paid);
  const pStatus = n(money.paid) <= 0 ? 'Unpaid' : n(money.paid) >= grand ? 'Fully paid' : 'Partial';

  const set = (k: string, v: string) => setMoney({ ...money, [k]: v });

  return (
    <form action={createServiceSale} className="space-y-6">
      <input type="hidden" name="table" value={table} />

      {/* customer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Existing customer</span>
          <select className="input" name="existing_customer_id" onChange={(e) => setUseExisting(!!e.target.value)}>
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
          <M label="Sale price (to customer)" k="sale_price" money={money} set={set} />
          <M label="Cost (our price)" k="cost" money={money} set={set} />
          <M label="Admin fee" k="admin_fee" money={money} set={set} />
          <M label="Discount (-)" k="discount" money={money} set={set} />
          <M label="Tax / VAT" k="tax" money={money} set={set} />
          <M label="Commission (from supplier, +)" k="commission" money={money} set={set} />
          <M label="Amount paid" k="paid" money={money} set={set} />
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
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Tax / VAT</p><p className="font-bold">{fmtMoney(grand - n(money.sale_price) - n(money.admin_fee) + n(money.discount), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Grand total (with fee + tax)</p><p className="font-bold">${fmtMoney(grand, cur)}</p></div>
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

function M({ label, k, money, set }: { label: string; k: string; money: any; set: (k: string, v: string) => void }) {
  const name = k === 'paid' ? 'amount_paid' : k;
  return (
    <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
      <input className="input" name={name} type="number" step="0.01" value={money[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
}
