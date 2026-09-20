import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { PageHeader, Table, Empty, StatusBadge, AddPanel } from '@/components/ui';
import { deleteRecord } from '@/lib/crm-actions';
import ServiceSaleForm from '@/components/service-sale-form';
import { SERVICE_SALES } from '@/lib/service-sales';
import Link from 'next/link';
import { money } from '@/lib/format';

const MODULE_KEY: Record<string, string> = {
  hotel_sales: 'hotelsales',
  visa_sales: 'visasales',
  transport_sales: 'transportsales',
};

export default async function ServiceSaleList({ table, searchParams }: { table: string; searchParams?: { q?: string } }) {
  const cfg = SERVICE_SALES[table];
  const ctx = await requireModule(MODULE_KEY[table]);
  const ag: any = (ctx as any).agency || (ctx.profile as any)?.agencies || {};
  const cur = ag.currency;
  const db = createAdminClient();
  const [{ data: sales }, { data: customers }] = await Promise.all([
    db.from(table).select('*, customers(full_name)').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }).limit(200),
    db.from('customers').select('id, full_name').eq('agency_id', ctx.profile.agency_id).order('full_name').limit(500),
  ]);

  const q = (searchParams?.q || '').toLowerCase();
  const list = (sales || []).filter((r: any) => !q || JSON.stringify(r).toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle}>
        <form><input className="input" name="q" placeholder="Search…" defaultValue={searchParams?.q || ''} /></form>
      </PageHeader>

      <AddPanel label={`New sale (customer + details + payment in one form)`}>
        <ServiceSaleForm table={table} fields={cfg.fields} customers={customers || []} />
      </AddPanel>

      <Table head={['Ref', 'Customer', 'Details', 'Grand total', 'Paid', 'Balance', 'Profit', 'Status', 'Actions']}>
        {list.length ? list.map((r: any) => {
          const grand = Number(r.sale_price) + Number(r.admin_fee) - Number(r.discount || 0);
          const bal = grand - Number(r.amount_paid);
          const overdue = bal > 0 && r.due_date && new Date(r.due_date) < new Date();
          return (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold">
                <Link className="accent hover:underline" href={`/dashboard/${cfg.route}/${r.id}`}>{r.ref}</Link>
              </td>
              <td className="px-4 py-2">{r.customers?.full_name || '—'}</td>
              <td className="px-4 py-2">{cfg.desc(r)}</td>
              <td className="px-4 py-2 font-semibold">{money(grand, cur)}</td>
              <td className="px-4 py-2">{money(Number(r.amount_paid), cur)}</td>
              <td className={`px-4 py-2 ${bal > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{money(bal, cur)}{overdue ? ' ⚠' : ''}</td>
              <td className="px-4 py-2 font-semibold accent">{money((grand - Number(r.cost)), cur)}</td>
              <td className="px-4 py-2"><StatusBadge status={r.payment_status} /></td>
              <td className="px-4 py-2"><div className="flex items-center gap-2">
                <Link className="text-xs font-semibold accent hover:underline" href={`/dashboard/${cfg.route}/${r.id}`}>Edit</Link>
                <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=${table.replace('_sales', '_sale')}&id=${r.id}`}>PDF</a>
                <form action={deleteRecord}>
                  <input type="hidden" name="table" value={table} />
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </div></td>
            </tr>
          );
        }) : <Empty msg="No sales yet — create the first one above." />}
      </Table>
    </div>
  );
}
