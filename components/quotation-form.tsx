'use client';

import { useState } from 'react';
import { createQuotation } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';

type Item = { desc: string; qty: string; unit: string };
const emptyItem = (): Item => ({ desc: '', qty: '1', unit: '' });
const n = (v: string) => Number(v) || 0;

export default function QuotationForm({ customers, currency }: { customers: { id: string; full_name: string }[]; currency: string }) {
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');

  const subtotal = items.reduce((s, it) => s + n(it.qty) * n(it.unit), 0);
  const total = subtotal - n(discount) + n(tax);

  return (
    <form action={createQuotation} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="q-title">Service / quotation title</label>
          <input className="input" id="q-title" name="title" required placeholder="Umrah package — December group, 4 stars" />
        </div>
        <div>
          <label className="label" htmlFor="q-cust">Customer</label>
          <select className="input" id="q-cust" name="customer_id" required defaultValue="">
            <option value="" disabled>— select customer —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Line items</p>
          <button type="button" className="btn-secondary text-xs" onClick={() => setItems([...items, emptyItem()])}>+ Add item</button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-12">
              <input className="input sm:col-span-6" name={`qi_desc_${i}`} placeholder="Item description (e.g. Umrah visa + processing)" value={it.desc} required={i === 0}
                onChange={(e) => setItems(items.map((r, j) => j === i ? { ...r, desc: e.target.value } : r))} />
              <input className="input sm:col-span-2" name={`qi_qty_${i}`} type="number" placeholder="Qty" value={it.qty}
                onChange={(e) => setItems(items.map((r, j) => j === i ? { ...r, qty: e.target.value } : r))} />
              <input className="input sm:col-span-3" name={`qi_unit_${i}`} type="number" step="0.01" placeholder={`Unit price (${currency})`} value={it.unit}
                onChange={(e) => setItems(items.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))} />
              <div className="flex items-center justify-between gap-2 sm:col-span-1">
                <span className="text-xs font-semibold text-slate-600">{(n(it.qty) * n(it.unit)).toFixed(2)}</span>
                {items.length > 1 && (
                  <button type="button" className="rounded border border-red-200 px-1.5 text-xs text-red-400 hover:bg-red-50"
                    onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-2 text-right sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Subtotal</p><p className="font-bold">{currency} {subtotal.toFixed(2)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Total</p><p className="font-bold accent">{currency} {total.toFixed(2)}</p></div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="q-valid">Valid until</label>
          <input className="input" id="q-valid" name="valid_until" type="date" />
        </div>
        <div>
          <label className="label" htmlFor="q-disc">Discount ({currency})</label>
          <input className="input" id="q-disc" name="discount" type="number" step="0.01" placeholder="0.00" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="q-tax">Tax / VAT ({currency})</label>
          <input className="input" id="q-tax" name="tax_amount" type="number" step="0.01" placeholder="0.00" value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="q-notes">Internal notes</label>
          <textarea className="input min-h-16" id="q-notes" name="notes" placeholder="Visible to your team only" />
        </div>
        <div>
          <label className="label" htmlFor="q-terms">Terms & conditions (shown on the quotation)</label>
          <textarea className="input min-h-16" id="q-terms" name="terms" placeholder="50% advance to confirm. Prices subject to airline availability. Valid until the date above." />
        </div>
      </div>

      <SubmitButton className="btn-primary">Save quotation</SubmitButton>
    </form>
  );
}
