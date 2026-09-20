import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { updatePackageSale, deleteRecord } from '@/lib/crm-actions';
import SaleDocuments from '@/components/sale-documents';
import SubmitButton from '@/components/submit-button';
import { PageHeader, StatusBadge } from '@/components/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function PackageSaleDetail({ params }: { params: { id: string } }) {
  const ctx = await requireModule('packagesales');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id;
  const { data: s } = await db.from('package_sales')
    .select('*, customers(full_name, phone, whatsapp, passport_no, country)')
    .eq('id', params.id).eq('agency_id', aid).single();
  if (!s) notFound();
  const { data: docs } = await db.from('sale_documents').select('*')
    .eq('sale_table', 'package_sales').eq('sale_id', s.id);

  const { data: customers } = await db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name');
  const grand = Number(s.sale_price) + Number(s.supplement || 0) + Number(s.admin_fee || 0) - Number(s.discount || 0);
  const paid = Number(s.amount_paid);
  const balance = grand - paid;
  const profit = grand + Number(s.commission || 0) - Number(s.cost || 0);
  const capacity = Number(s.rooms_quint || 0) * 5 + Number(s.rooms_quad || 0) * 4 + Number(s.rooms_triple || 0) * 3 + Number(s.rooms_double || 0) * 2 + Number(s.rooms_single || 0);
  const dt = (v: string | null) => v ? new Date(v).toISOString().slice(0, 16) : '';

  const L = ({ label, name, def, type = 'text' }: { label: string; name: string; def?: any; type?: string }) => (
    <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
      <input className="input" name={name} type={type} defaultValue={def ?? ''} /></label>
  );

  return (
    <div>
      <div className="mb-2"><Link className="text-xs accent hover:underline" href="/dashboard/package-sales">← All package sales</Link></div>
      <PageHeader title={s.ref}
        subtitle={`${s.package_category} package — ${s.package_name || ''} · ${s.pax} pax${s.sold_by ? ` · sold by ${s.sold_by}` : ''}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { l: 'Package price', v: `$${Number(s.sale_price).toFixed(2)}` },
          { l: 'Supplement (separate rooms)', v: `+$${Number(s.supplement || 0).toFixed(2)}`, green: Number(s.supplement) > 0, hide: !Number(s.supplement) },
          { l: 'Discount', v: `-$${Number(s.discount || 0).toFixed(2)}`, red: true, hide: !Number(s.discount) },
          { l: 'Grand total', v: `$${grand.toFixed(2)}` },
          { l: 'Paid / Balance', v: `$${paid.toFixed(2)} / $${balance.toFixed(2)}` },
          { l: `Profit (cost $${Number(s.cost || 0).toFixed(2)})`, v: `$${profit.toFixed(2)}`, gold: true },
        ].filter((k) => !k.hide).map((k) => (
          <div key={k.l} className={`card p-4 ${k.gold ? 'accent-soft-bg' : ''}`}>
            <p className="text-xs text-slate-400">{k.l}</p>
            <p className={`mt-1 text-lg font-bold ${k.red ? 'text-red-500' : k.green ? 'text-emerald-600' : 'text-slate-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* itinerary summary */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">✈️ Group flight</h3>
          <p className="text-sm">{s.airline || '—'} {s.flight_no || ''}</p>
          <p className="text-xs text-slate-500">{s.from_airport || '—'} → {s.to_airport || '—'} {s.depart_at ? `· ${dt(s.depart_at).replace('T', ' ')}` : ''}</p>
          {s.return_flight_no && <p className="text-xs text-slate-500">Return: {s.return_flight_no}</p>}
          {s.pnr && <p className="mt-1 text-xs font-semibold accent">PNR {s.pnr}</p>}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">🚌 Bus & seats</h3>
          <p className="text-sm">{s.bus_company || '—'}</p>
          <p className="text-xs text-slate-500">{s.bus_from || '—'} → {s.bus_to || '—'} {s.bus_date ? `· ${s.bus_date}` : ''}</p>
          {s.bus_seats && <p className="mt-1 text-xs font-semibold accent">Seats: {s.bus_seats}</p>}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">🏨 Hotels & rooms</h3>
          {s.tour_destination ? (
            <p className="text-sm">{s.tour_hotel || '—'} · {s.tour_destination}</p>
          ) : (<>
            <p className="text-sm">Makkah: {s.makkah_hotel || '—'} {s.makkah_nights ? `(${s.makkah_nights}n)` : ''}</p>
            <p className="text-sm">Madinah: {s.madinah_hotel || '—'} {s.madinah_nights ? `(${s.madinah_nights}n)` : ''}</p>
          </>)}
          <p className="mt-1 text-xs">
            {[s.rooms_quint && `${s.rooms_quint}× quint`, s.rooms_quad && `${s.rooms_quad}× quad`, s.rooms_triple && `${s.rooms_triple}× triple`,
              s.rooms_double && `${s.rooms_double}× double`, s.rooms_single && `${s.rooms_single}× single`].filter(Boolean).join(', ') || 'no rooms set'}
            {capacity ? <span className={capacity === Number(s.pax) ? 'text-emerald-600' : 'text-red-500'}> · capacity {capacity} pax</span> : null}
          </p>
        </div>
      </div>

      {/* full edit */}
      <div className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold">✏️ Edit package sale</h2>
        <form action={updatePackageSale} className="space-y-6">
          <input type="hidden" name="id" value={s.id} />
          <div className="grid gap-4 sm:grid-cols-4">
            <L label="Package category" name="package_category" def={s.package_category} />
            <L label="Package name" name="package_name" def={s.package_name} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Customer</span>
              <select className="input" name="customer_id" defaultValue={s.customer_id || ''}>
                <option value="">— none —</option>
                {(customers || []).map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select></label>
            <L label="Pax" name="pax" type="number" def={s.pax} />
            <L label="Departure" name="departure_date" type="date" def={s.departure_date} />
            <L label="Return" name="return_date" type="date" def={s.return_date} />
            <L label="Airline" name="airline" def={s.airline} />
            <L label="Outbound flight" name="flight_no" def={s.flight_no} />
            <L label="From" name="from_airport" def={s.from_airport} />
            <L label="To" name="to_airport" def={s.to_airport} />
            <L label="Departure time" name="depart_at" type="datetime-local" def={dt(s.depart_at)} />
            <L label="Return flight" name="return_flight_no" def={s.return_flight_no} />
            <L label="Group PNR" name="pnr" def={s.pnr} />
            <L label="Bus company" name="bus_company" def={s.bus_company} />
            <L label="Bus from" name="bus_from" def={s.bus_from} />
            <L label="Bus to" name="bus_to" def={s.bus_to} />
            <L label="Bus date" name="bus_date" type="date" def={s.bus_date} />
            <L label="Assigned seats" name="bus_seats" def={s.bus_seats} />
            <L label="Makkah hotel" name="makkah_hotel" def={s.makkah_hotel} />
            <L label="Makkah nights" name="makkah_nights" type="number" def={s.makkah_nights} />
            <L label="Madinah hotel" name="madinah_hotel" def={s.madinah_hotel} />
            <L label="Madinah nights" name="madinah_nights" type="number" def={s.madinah_nights} />
            <L label="Tour destination" name="tour_destination" def={s.tour_destination} />
            <L label="Tour hotel" name="tour_hotel" def={s.tour_hotel} />
            <L label="Tour nights" name="tour_nights" type="number" def={s.tour_nights} />
            <L label="Quint rooms (5)" name="rooms_quint" type="number" def={s.rooms_quint} />
            <L label="Quad rooms (4)" name="rooms_quad" type="number" def={s.rooms_quad} />
            <L label="Triple rooms" name="rooms_triple" type="number" def={s.rooms_triple} />
            <L label="Double rooms" name="rooms_double" type="number" def={s.rooms_double} />
            <L label="Single rooms" name="rooms_single" type="number" def={s.rooms_single} />
            <L label="Package price" name="sale_price" type="number" def={s.sale_price} />
            <L label="Supplement" name="supplement" type="number" def={s.supplement} />
            <L label="Admin fee" name="admin_fee" type="number" def={s.admin_fee} />
            <L label="Discount" name="discount" type="number" def={s.discount} />
            <L label="Cost" name="cost" type="number" def={s.cost} />
            <L label="Commission" name="commission" type="number" def={s.commission} />
            <L label="Amount paid" name="amount_paid" type="number" def={s.amount_paid} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Payment method</span>
              <select className="input" name="payment_method" defaultValue={s.payment_method || ''}>
                <option value="">— none —</option>
                <option value="cash">Cash</option><option value="bank">Bank transfer</option>
                <option value="card">Card</option><option value="online">Online</option>
              </select></label>
            <L label="Payment due date" name="due_date" type="date" def={s.due_date} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Status</span>
              <select className="input" name="status" defaultValue={s.status}>
                <option value="pending">Pending</option><option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select></label>
            <L label="Notes" name="notes" def={s.notes} />
          </div>
          <div className="flex items-end gap-3">
            <SubmitButton className="btn-primary px-4 py-2 text-xs">Save package sale</SubmitButton>
            <a className="btn-secondary px-4 py-2 text-xs" href={`/api/invoice-pdf?type=package_sale&id=${s.id}`}>⬇ Download PDF invoice</a>
            <form action={deleteRecord}>
              <input type="hidden" name="table" value="package_sales" />
              <input type="hidden" name="id" value={s.id} />
              <button className="btn-secondary px-4 py-2 text-xs text-red-500" type="submit">Delete sale</button>
            </form>
          </div>
        </form>
      </div>

      <SaleDocuments table="package_sales" saleId={s.id} docs={docs || []} />
    </div>
  );
}
