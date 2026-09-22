import RecordActivity from '@/components/record-activity';
import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import { Table, Empty, StatusBadge } from '@/components/ui';
import { updateSale, updateSaleLeg, addSaleLeg, deleteSaleLeg, deleteRecord, sendSaleInvoiceEmail, addFlightPassenger, deleteFlightPassenger } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import Link from 'next/link';
import SaleDocuments from '@/components/sale-documents';
import SubmitButton from '@/components/submit-button';
import { notFound } from 'next/navigation';

const L = ({ label, name, def, type = 'text', ph = '' }: { label: string; name: string; def?: string | null; type?: string; ph?: string }) => (
  <label className="block"><span className="text-xs text-slate-500">{label}</span>
    <input className="input" name={name} type={type} placeholder={ph} defaultValue={def || ''} />
  </label>
);

export default async function FlightSaleDetail({ params, searchParams }: { params: { id: string }; searchParams?: { emailed?: string } }) {
  const ctx = await requireModule('flightsales');
  const cur = (ctx as any).agency?.currency;
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();

  const { data: sale } = await db.from('flight_sales').select('*, customers(full_name, phone, whatsapp, country, passport_no)')
    .eq('id', params.id).eq('agency_id', aid).single();
  if (!sale) notFound();

  const [{ data: legs }, { data: passengers }, { data: customers }, { data: docs }] = await Promise.all([
    db.from('flight_sale_legs').select('*').eq('flight_sale_id', sale.id).order('leg_no'),
    db.from('flight_sale_passengers').select('*').eq('flight_sale_id', sale.id).order('is_lead', { ascending: false }).order('created_at'),
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
      {searchParams?.emailed === 'ok' && <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">✓ Invoice emailed to the customer.</p>}
      {searchParams?.emailed?.startsWith('err:') && <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">Email failed: {decodeURIComponent(searchParams.emailed.slice(4))}</p>}
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
          <form action={sendSaleInvoiceEmail}>
            <input type="hidden" name="table" value="flight_sales" />
            <input type="hidden" name="id" value={sale.id} />
            <button className="btn-secondary text-xs" type="submit">📧 Send invoice by email</button>
          </form>
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
      <div className="card mt-6 p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-900">👥 Passengers ({(passengers || []).length})</h3>
        <Table head={['Title', 'Name', 'Type', 'DOB', 'Passport', 'PNR', 'Ticket', 'Fare', 'Sale', 'Profit', '']}>
          {(passengers || []).length ? (passengers || []).map((p: any) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="p-2 font-semibold">{p.title || '—'}</td>
              <td className="p-2 font-semibold">{p.full_name}{p.is_lead && <span className="ml-1 rounded accent-soft-bg px-1.5 py-0.5 text-[10px] font-bold accent">LEAD</span>}</td>
              <td className="p-2 text-xs">{p.passport_no || '—'}</td>
              <td className="p-2 text-xs">{p.pax_type || '—'}</td>
              <td className="p-2 text-xs">{p.dob || '—'}</td>
              <td className="p-2 text-xs">{p.passport_no || '—'}</td>
              <td className="p-2 text-xs">{p.pnr || '—'}</td>
              <td className="p-2 text-xs">{p.ticket_no || '—'}</td>
              <td className="p-2 text-xs">{p.fare != null ? money(Number(p.fare), cur) : '—'}</td>
              <td className="p-2 text-xs">{p.sale_amount != null ? money(Number(p.sale_amount), cur) : '—'}</td>
              <td className="p-2 text-xs font-semibold accent">{p.profit != null ? money(Number(p.profit), cur) : '—'}</td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <RowEdit table="flight_sale_passengers" id={p.id} title={`Edit passenger — ${p.full_name}`}>
                    <label className="text-[10px] text-slate-400">Title</label>
                    <select className="input px-2 py-1 text-xs" name="title" defaultValue={p.title || 'Mr'}>{['Mr','Mrs','Miss','Ms','Master','Mstr','Dr'].map((t) => <option key={t} value={t}>{t}</option>)}</select>
                    <label className="text-[10px] text-slate-400">Full name</label><input className="input px-2 py-1 text-xs" name="full_name" defaultValue={p.full_name} />
                    <label className="text-[10px] text-slate-400">Passport no.</label><input className="input px-2 py-1 text-xs" name="passport_no" defaultValue={p.passport_no || ''} />
                    <label className="text-[10px] text-slate-400">Age</label><input className="input px-2 py-1 text-xs" name="age" type="number" defaultValue={p.age || ''} />
                    <label className="text-[10px] text-slate-400">Nationality</label><input className="input px-2 py-1 text-xs" name="nationality" defaultValue={p.nationality || ''} />
                    <label className="text-[10px] text-slate-400">Ticket no.</label><input className="input px-2 py-1 text-xs" name="ticket_no" defaultValue={p.ticket_no || ''} />
                    <label className="text-[10px] text-slate-400">Pax type</label>
                    <select className="input px-2 py-1 text-xs" name="pax_type" defaultValue={p.pax_type || 'ADT'}>{['ADT','CHD','YTH','INF'].map((t) => <option key={t} value={t}>{t}</option>)}</select>
                    <label className="text-[10px] text-slate-400">Gender</label>
                    <select className="input px-2 py-1 text-xs" name="gender" defaultValue={p.gender || ''}><option value="">—</option><option>Male</option><option>Female</option></select>
                    <label className="text-[10px] text-slate-400">DOB</label><input className="input px-2 py-1 text-xs" name="dob" type="date" defaultValue={p.dob || ''} />
                    <label className="text-[10px] text-slate-400">PNR</label><input className="input px-2 py-1 text-xs" name="pnr" defaultValue={p.pnr || ''} />
                    <label className="text-[10px] text-slate-400">Fare</label><input className="input px-2 py-1 text-xs" name="fare" type="number" defaultValue={p.fare ?? ''} />
                    <label className="text-[10px] text-slate-400">Tax</label><input className="input px-2 py-1 text-xs" name="tax" type="number" defaultValue={p.tax ?? ''} />
                    <label className="text-[10px] text-slate-400">Sale amount</label><input className="input px-2 py-1 text-xs" name="sale_amount" type="number" defaultValue={p.sale_amount ?? ''} />
                    <label className="text-[10px] text-slate-400">Profit</label><input className="input px-2 py-1 text-xs" name="profit" type="number" defaultValue={p.profit ?? ''} />
                  </RowEdit>
                  {!p.is_lead && (
                    <form action={deleteFlightPassenger}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-400 hover:bg-red-50" type="submit">✕</button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          )) : <tr><td colSpan={7}><Empty msg="No passengers recorded." /></td></tr>}
        </Table>
        <form action={addFlightPassenger} className="mt-3 grid gap-2 sm:grid-cols-7">
          <input type="hidden" name="flight_sale_id" value={sale.id} />
          <select className="input" name="title" defaultValue="Mr">{['Mr','Mrs','Miss','Ms','Master','Mstr','Dr'].map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <input className="input" name="full_name" placeholder="Passenger name *" required />
          <input className="input" name="passport_no" placeholder="Passport no." />
          <input className="input" name="age" type="number" placeholder="Age" />
          <input className="input" name="nationality" placeholder="Nationality" />
          <input className="input" name="ticket_no" placeholder="Ticket no." />
          <select className="input" name="pax_type" defaultValue="ADT">{['ADT','CHD','YTH','INF'].map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select className="input" name="gender" defaultValue=""><option value="">Gender</option><option>Male</option><option>Female</option></select>
          <input className="input" name="dob" type="date" placeholder="DOB" />
          <input className="input" name="pnr" placeholder="PNR" />
          <div className="sm:col-span-6"><SubmitButton className="btn-secondary text-xs">+ Add passenger</SubmitButton></div>
        </form>
      </div>

      <RecordActivity table="flight_sales" id={sale.id} record={sale} />
    </div>
  );
}
