import RecordActivity from '@/components/record-activity';
import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import { StatusBadge } from '@/components/ui';
import { deleteRecord, sendSaleInvoiceEmail, submitVisaToNusuk, syncNusukVisaStatus } from '@/lib/crm-actions';
import { getCustomFields, customAdjustment } from '@/lib/custom-fields';
import { SERVICE_SALES } from '@/lib/service-sales';
import Link from 'next/link';
import SaleDocuments from '@/components/sale-documents';
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

export default async function ServiceSaleView({ table, id, emailFlag, editFlag }: { table: string; id: string; emailFlag?: string; editFlag?: string }) {
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
  const [{ data: customers }, { data: docs }, cfDefs] = await Promise.all([
    db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name').limit(500),
    db.from('sale_documents').select('*').eq('sale_table', table).eq('sale_id', rec.id).order('created_at'),
    getCustomFields(db, aid, table),
  ]);
  const cfVals: any[] = (cfDefs || []).filter((d) => rec.custom_data?.[d.id] !== undefined && rec.custom_data?.[d.id] !== null && rec.custom_data?.[d.id] !== '');

  const discount = Number(rec.discount || 0);
  const commission = Number(rec.commission || 0);
  const cfAdj = customAdjustment(rec.custom_data, cfDefs);
  // extra hotels / trips add to the grand total (and their cost lowers profit)
  const extrasSum = legs.reduce((sm: number, l: any) => sm + Number(l.sale_price || 0), 0);
  const extrasCost = legs.reduce((sm: number, l: any) => sm + Number(l.cost || 0), 0);
  const grand = Number(rec.sale_price) + Number(rec.admin_fee) + Number(rec.tax || 0) - discount + cfAdj + extrasSum;
  const paid = Number(rec.amount_paid);
  const balance = grand - paid;
  const profit = grand + commission - Number(rec.cost) - extrasCost;

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
          <Link className="btn-secondary text-xs" href={`/dashboard/${cfg.route}/${rec.id}/edit`}>✏️ Edit sale</Link>
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

      {table === 'visa_sales' && (
        <div className="card mb-6 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">🕌 Nusuk visa integration</h3>
              <p className="text-xs text-slate-500">
                {rec.nusuk_ref
                  ? <>Submitted to Nusuk · ref <span className="font-semibold">{rec.nusuk_ref}</span> · status <span className="font-semibold">{rec.nusuk_status || 'submitted'}</span>{rec.nusuk_submitted_at ? ` · ${String(rec.nusuk_submitted_at).slice(0, 16).replace('T', ' ')}` : ''}</>
                  : 'Not submitted to Nusuk yet — the Nusuk integration is available on the Enterprise plan. Configure the API under Settings → Integrations, then submit this visa application.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!rec.nusuk_ref ? (
                <form action={submitVisaToNusuk}><input type="hidden" name="id" value={rec.id} /><button className="btn-primary text-xs" type="submit">Submit to Nusuk</button></form>
              ) : (
                <form action={syncNusukVisaStatus}><input type="hidden" name="id" value={rec.id} /><button className="btn-secondary text-xs" type="submit">↻ Sync status</button></form>
              )}
            </div>
          </div>
        </div>
      )}

      {cfVals.length > 0 && (
        <div className="card mb-6 p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">📋 Additional details</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {cfVals.map((d) => (
              <div key={d.id} className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[11px] text-slate-400">{d.label}</p>
                <p className="text-sm font-semibold">{['plus','minus','number'].includes(d.field_type) ? `${cur || ''} ${Number((rec as any).custom_data[d.id]).toLocaleString()}` : String((rec as any).custom_data[d.id])}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* guests (hotel) — everyone staying, not just the lead customer */}
      {table === 'hotel_sales' && Array.isArray((rec as any).guests) && (rec as any).guests.length > 0 && (
        <div className="card mb-8 p-5">
          <h2 className="mb-3 text-lg font-semibold">Guests ({(rec as any).guests.length})</h2>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            {(rec as any).guests.map((g: any, i: number) => (
              <p key={i}><span className="text-xs text-slate-400 block">{i + 1}. {g.passport_no ? `Passport ${g.passport_no}` : '—'}</span> <b>{g.name}</b></p>
            ))}
          </div>
        </div>
      )}

      {/* details at a glance */}
      <div className="card mb-8 p-5">
        <h2 className="mb-3 text-lg font-semibold">Details</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          {cfg.fields.map((f) => {
            const v = (rec as any)[f.name];
            return v === null || v === undefined || v === '' ? null : (
              <p key={f.name}><span className="text-xs text-slate-400 block">{f.label.replace(/ \*$/, '')}</span> <b>{String(v)}</b></p>
            );
          })}
          {rec.notes ? <p className="sm:col-span-4"><span className="text-xs text-slate-400 block">Notes</span> {rec.notes}</p> : null}
        </div>
      </div>

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