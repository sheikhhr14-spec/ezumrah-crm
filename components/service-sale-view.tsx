import RecordActivity from '@/components/record-activity';
import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import { StatusBadge } from '@/components/ui';
import { updateServiceSale, deleteRecord, sendSaleInvoiceEmail } from '@/lib/crm-actions';
import { SERVICE_SALES, SALE_PAYMENT_FIELDS } from '@/lib/service-sales';
import Link from 'next/link';
import SaleDocuments from '@/components/sale-documents';
import SubmitButton from '@/components/submit-button';
import { notFound } from 'next/navigation';

const MODULE_KEY: Record<string, string> = {
  hotel_sales: 'hotelsales',
  visa_sales: 'visasales',
  transport_sales: 'transportsales',
};

const PDF_TYPE: Record<string, string> = {
  hotel_sales: 'hotel_sale',
  visa_sales: 'visa_sale',
  transport_sales: 'transport_sale',
};

export default async function ServiceSaleView({ table, id, emailFlag }: { table: string; id: string; emailFlag?: string }) {
  const cfg = SERVICE_SALES[table];
  const ctx = await requireModule(MODULE_KEY[table]);
  const cur = (ctx as any).agency?.currency;
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();

  const { data: rec } = await db.from(table).select('*, customers(full_name, phone, whatsapp, country, passport_no)')
    .eq('id', id).eq('agency_id', aid).single();
  if (!rec) notFound();
  let legs: any[] = [];
  if (table === 'hotel_sales') {
    const r1 = await db.from('hotel_sale_stays').select('*').eq('hotel_sale_id', rec.id).order('created_at');
    legs = r1.data || [];
  } else if (table === 'transport_sales') {
    const r2 = await db.from('transport_sale_legs').select('*').eq('transport_sale_id', rec.id).order('leg_no');
    legs = r2.data || [];
  }
  const [{ data: customers }, { data: docs }] = await Promise.all([
    db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name').limit(500),
    db.from('sale_documents').select('*').eq('sale_table', table).eq('sale_id', rec.id).order('created_at'),
  ]);

  const discount = Number(rec.discount || 0);
  const commission = Number(rec.commission || 0);
  const grand = Number(rec.sale_price) + Number(rec.admin_fee) + Number(rec.tax || 0) - discount;
  const paid = Number(rec.amount_paid);
  const balance = grand - paid;
  const profit = grand + commission - Number(rec.cost);

  return (
    <div>
      {emailFlag === 'ok' && <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">✓ Invoice emailed to the customer.</p>}
      {emailFlag && emailFlag.startsWith('err:') && <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">Email failed: {decodeURIComponent(emailFlag.slice(4))}</p>}
      <Link className="text-sm text-slate-400 hover:text-gold" href={`/dashboard/${cfg.route}`}>← All {cfg.title.toLowerCase()}</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{rec.ref}</h1>
          <p className="text-sm text-slate-500">{cfg.desc(rec)}{rec.sold_by ? ` · sold by ${rec.sold_by}` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <form action={sendSaleInvoiceEmail}>
              <input type="hidden" name="table" value={table} />
              <input type="hidden" name="id" value={rec.id} />
              <button className="btn-secondary text-xs" type="submit">📧 Send invoice by email</button>
            </form>
            <a className="btn-primary" href={`/api/invoice-pdf?type=${PDF_TYPE[table]}&id=${rec.id}`}>⬇ Download PDF invoice</a>
          <form action={deleteRecord}>
            <input type="hidden" name="table" value={table} />
            <input type="hidden" name="id" value={rec.id} />
            <button className="btn-secondary text-red-500" type="submit">Delete</button>
          </form>
        </div>
      </div>

      {/* money summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { l: 'Sale price', v: `${money(Number(rec.sale_price), cur)}` },
          { l: 'Admin fee', v: `${money(Number(rec.admin_fee), cur)}` },
          { l: 'Discount', v: `-${money(discount, cur)}`, red: discount > 0, hide: discount <= 0 },
          { l: 'Commission (+)', v: `+${money(commission, cur)}`, green: true, hide: commission <= 0 },
          { l: 'Grand total', v: `${money(grand, cur)}` },
          { l: 'Paid', v: `${money(paid, cur)}` },
          { l: 'Balance', v: `${money(balance, cur)}`, red: balance > 0 },
          { l: `Profit (cost ${money(Number(rec.cost), cur)})`, v: `${money(profit, cur)}`, gold: true },
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
          <p><span className="text-slate-400">Name:</span> <b>{rec.customers?.full_name || '—'}</b></p>
          <p><span className="text-slate-400">Phone:</span> {rec.customers?.phone || '—'}</p>
          <p><span className="text-slate-400">WhatsApp:</span> {rec.customers?.whatsapp || '—'}</p>
          <p><span className="text-slate-400">Country:</span> {rec.customers?.country || '—'}</p>
          <p><span className="text-slate-400">Passport:</span> {rec.customers?.passport_no || '—'}</p>
        </div>
      </div>

      {/* everything editable in one form */}
      <form action={updateServiceSale} className="card p-5">
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={rec.id} />
        <h2 className="mb-4 text-lg font-semibold">Edit sale</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {cfg.fields.map((f) => (
            <label key={f.name} className="block"><span className="text-xs text-slate-500">{f.label}</span>
              {f.type === 'select' ? (
                <select className="input" name={f.name} defaultValue={(rec as any)[f.name] || ''}>
                  <option value="">—</option>
                  {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="input" name={f.name} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  step={f.type === 'number' ? '0.01' : undefined} defaultValue={(rec as any)[f.name] ?? ''} />
              )}
            </label>
          ))}
        </div>

        <h2 className="mb-3 mt-6 text-lg font-semibold">Pricing & payment</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {SALE_PAYMENT_FIELDS.map((f) => (
            <label key={f.name} className="block"><span className="text-xs text-slate-500">{f.label}</span>
              <input className="input" name={f.name} type="number" step="0.01" defaultValue={(rec as any)[f.name] ?? ''} />
            </label>
          ))}
          <label className="block"><span className="text-xs text-slate-500">Payment method</span>
            <select className="input" name="payment_method" defaultValue={rec.payment_method || ''}>
              <option value="">— none —</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </label>
          <label className="block"><span className="text-xs text-slate-500">Sale status</span>
            <select className="input" name="status" defaultValue={rec.status}>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <p className="text-xs text-slate-400 sm:col-span-1">Payment status (unpaid / partial / full) is calculated automatically from the amounts.</p>
          <label className="block"><span className="text-xs text-slate-500">Customer (re-link)</span>
            <select className="input" name="customer_id" defaultValue={rec.customer_id || ''}>
              <option value="">— none —</option>
              {(customers || []).map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-xs text-slate-500">Notes</span>
            <input className="input" name="notes" defaultValue={rec.notes || ''} />
          </label>
          <div className="flex items-end"><SubmitButton className="btn-primary px-4 py-2 text-xs">Save changes</SubmitButton></div>
          <div className="flex items-end"><span className="text-xs"><StatusBadge status={rec.payment_status} /> · Profit <b className="accent">{money(profit, cur)}</b></span></div>
        </div>
      </form>

      <SaleDocuments table={table} saleId={rec.id} docs={docs || []} />
      {legs && legs.length > 0 && (
        <div className="card mt-4 p-4">
          <p className="mb-2 text-sm font-bold text-slate-900">{table === 'hotel_sales' ? `More hotels in this sale (${legs.length})` : `More trips / Ziyarat in this sale (${legs.length})`}</p>
          <div className="space-y-2">
            {legs.map((l: any) => (
              <div key={l.id} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                {table === 'hotel_sales' ? (
                  <p><b className="text-slate-900">{l.hotel_name}</b>{l.city ? ` · ${l.city}` : ''}{l.nights ? ` · ${l.nights} night(s)` : ''}{l.check_in ? ` · ${l.check_in} → ${l.check_out}` : ''}{l.room_type ? ` · ${l.room_type}` : ''}{l.rooms_count ? ` · ${l.rooms_count} room(s)` : ''}{l.meal_plan ? ` · ${l.meal_plan}` : ''} · <b>{money(Number(l.sale_price), cur)}</b>{Number(l.cost) ? ` (cost ${money(Number(l.cost), cur)})` : ''}</p>
                ) : (
                  <p><b className="text-slate-900">{l.from_location} → {l.to_location}</b>{l.transport_date ? ` · ${l.transport_date}${l.transport_time ? ' ' + l.transport_time : ''}` : ''}{l.vehicle_type ? ` · ${l.vehicle_type}` : ''}{l.seats ? ` · ${l.seats} seats` : ''}{l.driver_name ? ` · driver: ${l.driver_name}` : ''} · <b>{money(Number(l.sale_price), cur)}</b>{Number(l.cost) ? ` (cost ${money(Number(l.cost), cur)})` : ''}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <RecordActivity table={table} id={rec.id} record={rec} />
    </div>
  );
}