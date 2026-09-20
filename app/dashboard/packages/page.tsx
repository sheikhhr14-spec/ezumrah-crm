import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import { createPackage, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, AddPanel, Field } from '@/components/ui';

const TYPES = ['umrah', 'hajj', 'ziyarah', 'hotel', 'flight', 'transport', 'holiday'];

export default async function PackagesPage() {
  const ctx = await requireModule('packages');
  const cur = (ctx as any).agency?.currency;
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
      <Table head={['Package', 'Type', 'Duration', 'Price from', 'Description', 'Actions']}>
        {packages?.length ? packages.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{p.name}</td>
            <td className="px-4 py-2 capitalize">{p.service_type}</td>
            <td className="px-4 py-2">{p.duration_days ? `${p.duration_days} days` : '—'}</td>
            <td className="px-4 py-2">{p.price_from ? `${money(Number(p.price_from), cur)}` : '—'}</td>
            <td className="px-4 py-2 text-slate-500">{p.description || '—'}</td>
            <td className="px-4 py-2"><div className="flex items-center gap-2">
              <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=package&id=${p.id}`}>PDF</a>
                <RowEdit table="packages" id={p.id}><label className="text-[10px] text-slate-400">Name</label><input className="input px-2 py-1 text-xs" name="name" defaultValue={p.name || ''} /><label className="text-[10px] text-slate-400">Type</label><select className="input px-2 py-1 text-xs" name="service_type"><option value="umrah"selected={p.service_type === "umrah"}>umrah</option><option value="hajj"selected={p.service_type === "hajj"}>hajj</option><option value="ziyarah"selected={p.service_type === "ziyarah"}>ziyarah</option><option value="holiday"selected={p.service_type === "holiday"}>holiday</option></select><label className="text-[10px] text-slate-400">Duration (days)</label><input className="input px-2 py-1 text-xs" name="duration_days" defaultValue={p.duration_days || ''} /><label className="text-[10px] text-slate-400">Price from</label><input className="input px-2 py-1 text-xs" name="price_from" defaultValue={p.price_from || ''} /><label className="text-[10px] text-slate-400">Description</label><input className="input px-2 py-1 text-xs" name="description" defaultValue={p.description || ''} /></RowEdit>
              <form action={deleteRecord}><input type="hidden" name="table" value="packages" /><input type="hidden" name="id" value={p.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
            </div></td>
          </tr>
        )) : <Empty msg="No packages yet." />}
      </Table>
    </div>
  );
}
