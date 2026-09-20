import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule, staffPrivacyOn } from '@/lib/data';
import { createCustomer, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, AddPanel, Field } from '@/components/ui';
import Link from 'next/link';

export default async function CustomersPage() {
  const ctx = await requireModule('customers');
  const db = createAdminClient();
  const cq = db.from('customers').select('*').eq('agency_id', ctx.profile.agency_id);
  if (staffPrivacyOn(ctx)) cq.eq('created_by', ctx.profile.id);
  const { data: customers } = await cq
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers?.length ?? 0} pilgrims & clients`} />
      <AddPanel label="Add customer">
        <form action={createCustomer} className="grid gap-4 sm:grid-cols-3">
          <Field label="Full name *"><input className="input" name="full_name" required /></Field>
          <Field label="Country"><input className="input" name="country" placeholder="Pakistan" /></Field>
          <Field label="Passport no."><input className="input" name="passport_no" /></Field>
          <Field label="Phone"><input className="input" name="phone" /></Field>
          <Field label="WhatsApp"><input className="input" name="whatsapp" /></Field>
          <Field label="Email"><input className="input" name="email" type="email" /></Field>
          <Field label="Notes" span><input className="input" name="notes" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save customer</button></div>
        </form>
      </AddPanel>
      <Table head={['Name', 'Country', 'Phone', 'WhatsApp', 'Passport', 'Email', 'Actions']}>
        {customers?.length ? customers.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold"><Link className="accent hover:underline" href={`/dashboard/customers/${c.id}`}>{c.full_name}</Link></td>
            <td className="px-4 py-2">{c.country || '—'}</td>
            <td className="px-4 py-2">{c.phone || '—'}</td>
            <td className="px-4 py-2">{c.whatsapp || '—'}</td>
            <td className="px-4 py-2">{c.passport_no || '—'}</td>
            <td className="px-4 py-2">{c.email || '—'}</td>
            <td className="px-4 py-2"><div className="flex items-center gap-2">
              <RowEdit table="customers" id={c.id}><label className="text-[10px] text-slate-400">Name</label><input className="input px-2 py-1 text-xs" name="full_name" defaultValue={c.full_name || ''} /><label className="text-[10px] text-slate-400">Country</label><input className="input px-2 py-1 text-xs" name="country" defaultValue={c.country || ''} /><label className="text-[10px] text-slate-400">Phone</label><input className="input px-2 py-1 text-xs" name="phone" defaultValue={c.phone || ''} /><label className="text-[10px] text-slate-400">WhatsApp</label><input className="input px-2 py-1 text-xs" name="whatsapp" defaultValue={c.whatsapp || ''} /><label className="text-[10px] text-slate-400">Passport</label><input className="input px-2 py-1 text-xs" name="passport_no" defaultValue={c.passport_no || ''} /><label className="text-[10px] text-slate-400">Email</label><input className="input px-2 py-1 text-xs" name="email" defaultValue={c.email || ''} /></RowEdit>
              <form action={deleteRecord}><input type="hidden" name="table" value="customers" /><input type="hidden" name="id" value={c.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
            </div></td>
          </tr>
        )) : <Empty msg="No customers yet." />}
      </Table>
    </div>
  );
}
