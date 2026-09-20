import { deleteRecord } from '@/lib/crm-actions';
import { Table, Empty, StatusBadge } from '@/components/ui';
import Link from 'next/link';

export default function PackageSalesList({ list }: { list: any[] }) {
  const grand = (r: any) => Number(r.sale_price) + Number(r.supplement || 0) + Number(r.admin_fee || 0) - Number(r.discount || 0);
  return (
    <div className="card p-4">
      <Table head={['Ref', 'Package', 'Customer', 'Pax', 'Dates', 'Grand', 'Paid', 'Balance', 'Profit', 'Status', 'Actions']}>
        {list.length ? list.map((r: any) => {
          const bal = Number(r.balance);
          const overdue = bal > 0 && r.due_date && new Date(r.due_date) < new Date();
          return (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-2"><Link className="font-semibold accent hover:underline" href={`/dashboard/package-sales/${r.id}`}>{r.ref}</Link></td>
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
        }) : <Empty msg="No sales yet." />}
      </Table>
    </div>
  );
}
