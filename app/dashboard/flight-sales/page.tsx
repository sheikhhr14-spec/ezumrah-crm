import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { PageHeader, Table, Empty, StatusBadge, AddPanel } from '@/components/ui';
import { deleteRecord } from '@/lib/crm-actions';
import FlightSaleForm from '@/components/flight-sale-form';
import Link from 'next/link';

export default async function FlightSalesPage({ searchParams }: { searchParams?: { q?: string } }) {
  const ctx = await requireModule('flightsales');
  const db = createAdminClient();
  const [{ data: sales }, { data: customers }] = await Promise.all([
    db.from('flight_sales').select('*, customers(full_name, phone), flight_sale_legs(from_airport, to_airport, fare, tax, cost)')
      .eq('agency_id', ctx.profile.agency_id).order('created_at', { ascending: false }).limit(200),
    db.from('customers').select('id, full_name').eq('agency_id', ctx.profile.agency_id).order('full_name').limit(500),
  ]);

  const q = (searchParams?.q || '').toLowerCase();
  const list = (sales || []).filter((r: any) =>
    !q || JSON.stringify(r).toLowerCase().includes(q));

  const tot = (r: any) => Number(r.sale_total) + Number(r.admin_fee) - Number(r.discount || 0);
  const profit = (r: any) => tot(r) + Number(r.commission || 0) - Number(r.cost_total);

  return (
    <div>
      <PageHeader title="Flight Sales" subtitle="Standalone ticket sales — one-way, return, multi-city. No booking needed.">
        <form><input className="input" name="q" placeholder="Search…" defaultValue={searchParams?.q || ''} /></form>
      </PageHeader>

      <AddPanel label="New flight sale (customer + legs + payment in one form)">
        <FlightSaleForm customers={customers || []} />
      </AddPanel>

      <Table head={['Ref', 'Customer', 'Route', 'Trip', 'Pax', 'Grand total', 'Paid', 'Balance', 'Profit', 'Status', 'Actions']}>
        {list.length ? list.map((r: any) => {
          const legs = r.flight_sale_legs || [];
          const route = legs.length ? `${legs[0].from_airport || '?'} → ${legs[legs.length - 1].to_airport || '?'}${legs.length > 1 ? ` (${legs.length} legs)` : ''}` : '—';
          const bal = tot(r) - Number(r.amount_paid);
          return (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold">
                <Link className="accent hover:underline" href={`/dashboard/flight-sales/${r.id}`}>{r.ref}</Link>
              </td>
              <td className="px-4 py-2">{r.customers?.full_name || '—'}</td>
              <td className="px-4 py-2">{route}</td>
              <td className="px-4 py-2 capitalize">{(r.trip_kind || '').replace('multicity', 'multi-city')}</td>
              <td className="px-4 py-2">{r.pax}</td>
              <td className="px-4 py-2 font-semibold">${tot(r).toFixed(2)}</td>
              <td className="px-4 py-2">${Number(r.amount_paid).toFixed(2)}</td>
              <td className={`px-4 py-2 ${bal > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${bal.toFixed(2)}</td>
              <td className="px-4 py-2 font-semibold accent">${profit(r).toFixed(2)}</td>
              <td className="px-4 py-2"><StatusBadge status={r.payment_status} /></td>
              <td className="px-4 py-2"><div className="flex items-center gap-2">
                <Link className="text-xs font-semibold accent hover:underline" href={`/dashboard/flight-sales/${r.id}`}>Edit</Link>
                <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=flightsale&id=${r.id}`}>PDF</a>
                <form action={deleteRecord}>
                  <input type="hidden" name="table" value="flight_sales" />
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </div></td>
            </tr>
          );
        }) : <Empty msg="No flight sales yet — create the first one above." />}
      </Table>
    </div>
  );
}
