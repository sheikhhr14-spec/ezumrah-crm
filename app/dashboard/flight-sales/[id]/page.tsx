import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import { Table, Empty, StatusBadge } from '@/components/ui';
import { updateSale, updateSaleLeg, addSaleLeg, deleteSaleLeg, deleteRecord } from '@/lib/crm-actions';
import Link from 'next/link';
import SaleDocuments from '@/components/sale-documents';
import SubmitButton from '@/components/submit-button';
import { notFound } from 'next/navigation';

const L = ({ label, name, def, type = 'text', ph = '' }: { label: string; name: string; def?: string | null; type?: string; ph?: string }) => (
  <label className="block"><span className="text-xs text-slate-500">{label}</span>
    <input className="input" name={name} type={type} placeholder={ph} defaultValue={def || ''} />
  </label>
);

export default async function FlightSaleDetail({ params }: { params: { id: string } }) {
  const ctx = await requireModule('flightsales');
  const cur = (ctx as any).agency?.currency;
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();

  const { data: sale } = await db.from('flight_sales').select('*, customers(full_name, phone, whatsapp, country, passport_no)')
    .eq('id', params.id).eq('agency_id', aid).single();
  if (!sale) notFound();

  const [{ data: legs }, { data: customers }, { data: docs }] = await Promise.all([
    db.from('flight_sale_legs').select('*').eq('flight_sale_id', sale.id).order('leg_no'),
    db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name').limit(500),
    db.from('sale_documents').select('*').eq('sale_table', 'flight_sales').eq('sale_id', sale.id).order('created_at'),
  ]);

  const discount = Number(sale.discount || 0);
  const commission = Number(sale.commission || 0);
  const grand = Number(sale.sale_total) + Number(sale.admin_fee) - discount;
  const paid = Number(sale.amount_paid);
  const balance = grand - paid;
  const profit = grand + commission - Number(sale.cost_total);
  const dt = (v: string | null) => v ? new Date(v).toISOString().slice(0, 16) : '';

  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href="/dashboard/flight-sales">← All flight sales</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sale.ref}</h1>
          <p className="text-sm text-slate-500">
            {sale.customers?.full_name || '—'} · {(sale.trip_kind || '').replace('multicity', 'multi-city')} · {sale.pax} pax
            {sale.supplier ? ` · via ${sale.supplier}` : ''}{sale.refundable ? ` · ${sale.refundable}` : ''}{sale.sold_by ? ` · sold by ${sale.sold_by}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a className="btn-primary" href={`/api/invoice-pdf?type=flightsale&id=${sale.id}`}>⬇ Download PDF invoice</a>
          <form action={deleteRecord}>
            <input type="hidden" name="table" value="flight_sales" />
            <input type="hidden" name="id" value={sale.id} />
            <button className="btn-secondary text-red-500" type="submit">Delete sale</button>
          </form>
        </div>
      </div>

      {/* money summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { l: 'Legs sale total', v: `${money(Number(sale.sale_total), cur)}` },
          { l: 'Admin fee', v: `${money(Number(sale.admin_fee), cur)}` },
          { l: 'Discount', v: `-${money(discount, cur)}`, red: true, hide: discount <= 0 },
          { l: 'Supplier commission', v: `+${money(commission, cur)}`, green: true, hide: commission <= 0 },
          { l: 'Grand total', v: `${money(grand, cur)}` },
          { l: 'Paid', v: `${money(paid, cur)}` },
          { l: 'Balance', v: `${money(balance, cur)}`, red: balance > 0 },
          { l: 'Profit (cost $' + Number(sale.cost_total).toFixed(2) + ')', v: `${money(profit, cur)}`, gold: true },
        ].filter((k) => !k.hide).map((k) => (
          <div key={k.l} className={`card p-4 ${k.gold ? 'accent-soft-bg' : ''}`}>
            <p className="text-xs text-slate-400">{k.l}</p>
            <p className={`mt-1 text-lg font-bold ${k.red ? 'text-red-500' : k.green ? 'text-emerald-600' : 'text-slate-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* customer */}
      <div className="card mb-8 p-5">
        <h2 className="mb-3 text-lg font-semibold">Customer</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-5">
          <p><span className="text-slate-400">Name:</span> <b>{sale.customers?.full_name || '—'}</b></p>
          <p><span className="text-slate-400">Phone:</span> {sale.customers?.phone || '—'}</p>
          <p><span className="text-slate-400">WhatsApp:</span> {sale.customers?.whatsapp || '—'}</p>
          <p><span className="text-slate-400">Country:</span> {sale.customers?.country || '—'}</p>
          <p><span className="text-slate-400">Passport:</span> {sale.customers?.passport_no || '—'}</p>
        </div>
      </div>

      {/* legs */}
      <h2 className="mb-3 text-lg font-semibold">Itinerary — {(sale.trip_kind || '').replace('multicity', 'multi-city')}</h2>
      <div className="space-y-4">
        {(legs || []).map((l: any) => (
          <form key={l.id} action={updateSaleLeg} className="card p-4">
            <input type="hidden" name="leg_id" value={l.id} />
            <input type="hidden" name="sale_id" value={sale.id} />
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Leg {l.leg_no}</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <L label="Airline" name="airline" def={l.airline} />
              <L label="Flight no." name="flight_no" def={l.flight_no} />
              <L label="From" name="from_airport" def={l.from_airport} />
              <L label="To" name="to_airport" def={l.to_airport} />
              <L label="Departure" name="depart_at" def={dt(l.depart_at)} type="datetime-local" />
              <L label="Arrival" name="arrive_at" def={dt(l.arrive_at)} type="datetime-local" />
              <L label="Cabin" name="cabin" def={l.cabin} />
              <L label="Fare (sale)" name="fare" def={l.fare} type="number" />
              <L label="Tax" name="tax" def={l.tax} type="number" />
              <L label="Cost (our price)" name="cost" def={l.cost} type="number" />
              <div className="flex items-end gap-3">
                <SubmitButton className="btn-primary px-4 py-2 text-xs">Save leg</SubmitButton>
              </div>
              <div className="flex items-end">
                <span className="text-xs font-semibold accent">Leg profit: ${money((Number(l.fare) + Number(l.tax) - Number(l.cost)), cur)}</span>
              </div>
            </div>
            <div className="mt-2">
              <button className="text-xs font-semibold text-red-500 hover:underline" type="submit"
                formAction={deleteSaleLeg} formNoValidate>Remove leg</button>
            </div>
          </form>
        ))}
      </div>

      {/* add leg */}
      <details className="mt-4">
        <summary className="cursor-pointer select-none text-sm font-semibold accent hover:underline">+ Add another leg</summary>
        <form action={addSaleLeg} className="card mt-2 grid gap-3 p-4 sm:grid-cols-4">
          <input type="hidden" name="sale_id" value={sale.id} />
          <L label="Airline" name="airline" />
          <L label="Flight no." name="flight_no" />
          <L label="From" name="from_airport" />
          <L label="To" name="to_airport" />
          <L label="Departure" name="depart_at" type="datetime-local" />
          <L label="Arrival" name="arrive_at" type="datetime-local" />
          <L label="Cabin" name="cabin" />
          <L label="Fare (sale)" name="fare" type="number" />
          <L label="Tax" name="tax" type="number" />
          <L label="Cost" name="cost" type="number" />
          <div className="flex items-end"><SubmitButton className="btn-primary px-4 py-2 text-xs">Add leg</SubmitButton></div>
        </form>
      </details>

      {/* payment */}
      <h2 className="mb-3 mt-8 text-lg font-semibold">Payment</h2>
      <form action={updateSale} className="card grid gap-4 p-5 sm:grid-cols-4">
        <input type="hidden" name="id" value={sale.id} />
        <L label="Admin fee" name="admin_fee" def={sale.admin_fee} type="number" />
        <L label="Discount" name="discount" def={sale.discount} type="number" />
        <L label="Commission (from supplier)" name="commission" def={sale.commission} type="number" />
        <L label="Amount paid" name="amount_paid" def={sale.amount_paid} type="number" />
        <L label="Payment due date" name="due_date" def={sale.due_date ? String(sale.due_date).slice(0, 10) : ''} type="date" />
        <label className="block"><span className="text-xs text-slate-500">Payment method</span>
          <select className="input" name="payment_method" defaultValue={sale.payment_method || ''}>
            <option value="">— none —</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank transfer</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>
        </label>
        <label className="block"><span className="text-xs text-slate-500">Payment status</span>
          <select className="input" name="payment_status" defaultValue={sale.payment_status}>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label className="block"><span className="text-xs text-slate-500">Sale status</span>
          <select className="input" name="status" defaultValue={sale.status}>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="block"><span className="text-xs text-slate-500">Customer (re-link)</span>
          <select className="input" name="customer_id" defaultValue={sale.customer_id || ''}>
            <option value="">— none —</option>
            {(customers || []).map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </label>
        <L label="Notes" name="notes" def={sale.notes} />
        <div className="flex items-end"><SubmitButton className="btn-primary px-4 py-2 text-xs">Save payment</SubmitButton></div>
        <div className="flex items-end"><span className="text-xs"><StatusBadge status={sale.payment_status} /> · Profit <b className="accent">{money(profit, cur)}</b></span></div>
      </form>

      <SaleDocuments table="flight_sales" saleId={sale.id} docs={docs || []} />
    </div>
  );
}
