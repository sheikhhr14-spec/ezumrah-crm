import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';
import { createPackage } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, AddPanel, Field } from '@/components/ui';

const TYPES = ['umrah', 'hajj', 'ziyarah', 'hotel', 'flight', 'transport', 'holiday'];

export default async function PackagesPage() {
  const ctx = await requireActiveAgency();
  const db = createAdminClient();
  const { data: packages } = await db
    .from('packages').select('*').eq('agency_id', ctx.profile.agency_id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader title="Packages" subtitle="Umrah, Hajj, Ziyarah, hotels, flights & transport packages" />
      <AddPanel label="Add package">
        <form action={createPackage} className="grid gap-4 sm:grid-cols-3">
          <Field label="Package name *"><input className="input" name="name" required placeholder="14-Day Premium Umrah" /></Field>
          <Field label="Service type">
            <select className="input" name="service_type">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Duration (days)"><input className="input" name="duration_days" type="number" /></Field>
          <Field label="Price from (USD)"><input className="input" name="price_from" type="number" step="0.01" /></Field>
          <Field label="Description" span><input className="input" name="description" placeholder="Includes Makkah 5 nights, Madinah 4 nights..." /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save package</button></div>
        </form>
      </AddPanel>
      <Table head={['Package', 'Type', 'Duration', 'Price from', 'Description']}>
        {packages?.length ? packages.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{p.name}</td>
            <td className="px-4 py-2 capitalize">{p.service_type}</td>
            <td className="px-4 py-2">{p.duration_days ? `${p.duration_days} days` : '—'}</td>
            <td className="px-4 py-2">{p.price_from ? `$${Number(p.price_from).toLocaleString()}` : '—'}</td>
            <td className="px-4 py-2 text-slate-500">{p.description || '—'}</td>
          </tr>
        )) : <Empty msg="No packages yet." />}
      </Table>
    </div>
  );
}
