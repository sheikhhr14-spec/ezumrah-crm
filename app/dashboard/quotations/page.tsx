import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import { deleteRecord } from '@/lib/crm-actions';
import QuotationForm from '@/components/quotation-form';
import { PageHeader, Table, Empty, StatusBadge, AddPanel } from '@/components/ui';
import Link from 'next/link';

export default async function QuotationsPage() {
  const ctx = await requireModule('quotations');
  const cur = (ctx as any).agency?.currency;
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const [{ data: quotations }, { data: customers }] = await Promise.all([
    db.from('quotations').select('*, customers(full_name)').eq('agency_id', aid).order('created_at', { ascending: false }),
    db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name'),
  ]);

  return (
    <div>
      <PageHeader title="Quotations" subtitle="Build professional quotes with line items, terms and validity — then convert accepted quotes into invoices." />
      <AddPanel label="Create quotation">
        <QuotationForm customers={customers || []} currency={cur} />
      </AddPanel>
      <Table head={['Quote', 'Service', 'Customer', 'Valid until', 'Total', 'Status', 'Actions']}>
        {quotations?.length ? quotations.map((q: any) => {
          const expired = q.valid_until && new Date(q.valid_until) < new Date(new Date().toDateString()) && !['accepted', 'rejected'].includes(q.status);
          return (
            <tr key={q.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold">
                <Link className="accent hover:underline" href={`/dashboard/quotations/${q.id}`}>{q.quote_no}</Link>
              </td>
              <td className="px-4 py-2">{q.title || '—'}</td>
              <td className="px-4 py-2">{(q.customers as any)?.full_name || '—'}</td>
              <td className="px-4 py-2">{q.valid_until || '—'}{expired && <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">EXPIRED</span>}</td>
              <td className="px-4 py-2 font-semibold">{money(Number(q.total), cur)}</td>
              <td className="px-4 py-2"><StatusBadge status={q.status} /></td>
              <td className="px-4 py-2"><div className="flex items-center gap-2">
                <Link className="text-xs font-semibold accent hover:underline" href={`/dashboard/quotations/${q.id}`}>Open</Link>
                <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=quotation&id=${q.id}`}>PDF</a>
                <form action={deleteRecord}><input type="hidden" name="table" value="quotations" /><input type="hidden" name="id" value={q.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
              </div></td>
            </tr>
          );
        }) : <Empty msg="No quotations yet." />}
      </Table>
    </div>
  );
}
