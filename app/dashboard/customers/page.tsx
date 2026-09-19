import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { createCustomer } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, AddPanel, Field } from '@/components/ui';

export default async function CustomersPage() {
  const ctx = await requireModule('customers');
  const db = createAdminClient();
  const { data: customers } = await db
    .from('customers').select('*').eq('agency_id', ctx.profile.agency_id)
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
      <Table head={['Name', 'Country', 'Phone', 'WhatsApp', 'Passport', 'Email']}>
        {customers?.length ? customers.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{c.full_name}</td>
            <td className="px-4 py-2">{c.country || '—'}</td>
            <td className="px-4 py-2">{c.phone || '—'}</td>
            <td className="px-4 py-2">{c.whatsapp || '—'}</td>
            <td className="px-4 py-2">{c.passport_no || '—'}</td>
            <td className="px-4 py-2">{c.email || '—'}</td>
          </tr>
        )) : <Empty msg="No customers yet." />}
      </Table>
    </div>
  );
}
