import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { deleteRecord } from '@/lib/crm-actions';
import PackageSaleForm from '@/components/package-sale-form';
import { PageHeader, Table, Empty, StatusBadge } from '@/components/ui';
import Link from 'next/link';

const TABS = [
  { key: 'all', label: 'All packages' },
  { key: 'umrah', label: 'Umrah' },
  { key: 'hajj', label: 'Hajj' },
  { key: 'tour', label: 'Tours' },
];

export default async function PackageSalesPage({ searchParams }: { searchParams: { cat?: string } }) {
  const ctx = await requireModule('packagesales');
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const cat = searchParams.cat || 'all';
  let q = db.from('package_sales')
    .select('id, ref, package_category, package_name, pax, departure_date, return_date, sale_price, supplement, admin_fee, discount, amount_paid, balance, profit, payment_status, status, due_date, customers(full_name)')
    .eq('agency_id', aid).order('created_at', { ascending: false });
  if (cat !== 'all') q = q.eq('package_category', cat);
  const [{ data: sales }, { data: customers }] = await Promise.all([
    q,
    db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name'),
  ]);

  const grand = (r: any) => Number(r.sale_price) + Number(r.supplement || 0) + Number(r.admin_fee || 0) - Number(r.discount || 0);
  const list = sales || [];

  return (
    <div>
      <PageHeader title="Package Sales" subtitle="Umrah, Hajj and Tour package bookings — group flights, buses, seat & room assignments" />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/dashboard/package-sales${t.key === 'all' ? '' : `?cat=${t.key}`}`}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${cat === t.key ? 'accent-bg text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {t.label}
          </Link>
        ))}
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold">➕ New package sale</h2>
        <PackageSaleForm customers={customers || []} />
      </div>

      <div className="card p-4">
        <Table head={['Ref', 'Category', 'Package', 'Customer', 'Pax', 'Dates', 'Grand', 'Paid', 'Balance', 'Profit', 'Status', 'Actions']}>
          {list.length ? list.map((r: any) => {
            const bal = Number(r.balance);
            const overdue = bal > 0 && r.due_date && new Date(r.due_date) < new Date();
            return (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2"><Link className="font-semibold accent hover:underline" href={`/dashboard/package-sales/${r.id}`}>{r.ref}</Link></td>
                <td className="px-4 py-2"><span className="badge accent-soft-bg accent capitalize">{r.package_category}</span></td>
                <td className="px-4 py-2">{r.package_name || '—'}</td>
                <td className="px-4 py-2">{r.customers?.full_name || '—'}</td>
                <td className="px-4 py-2">{r.pax}</td>
                <td className="px-4 py-2 text-xs">{r.departure_date || '—'} → {r.return_date || '—'}</td>
                <td className="px-4 py-2 font-semibold">${grand(r).toFixed(2)}</td>
                <td className="px-4 py-2">${Number(r.amount_paid).toFixed(2)}</td>
                <td className={`px-4 py-2 ${bal > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${bal.toFixed(2)}{overdue ? ' ⚠' : ''}</td>
                <td className="px-4 py-2 font-semibold accent">${Number(r.profit).toFixed(2)}</td>
                <td className="px-4 py-2"><StatusBadge status={r.payment_status} /></td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Link className="text-xs font-semibold accent hover:underline" href={`/dashboard/package-sales/${r.id}`}>Edit</Link>
                    <form action={deleteRecord}>
                      <input type="hidden" name="table" value="package_sales" />
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          }) : <Empty msg={`No ${cat === 'all' ? '' : cat + ' '}package sales yet.`} />}
        </Table>
      </div>
    </div>
  );
}
