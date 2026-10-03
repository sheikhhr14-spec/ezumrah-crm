import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';
import { addCustomField, toggleCustomField, deleteCustomField } from '@/lib/crm-actions';
import { CF_TYPE_LABEL, type CustomFieldType } from '@/lib/custom-fields';
import { AddPanel } from '@/components/ui';
import SubmitButton from '@/components/submit-button';

/** Owner-only panel to add custom fields to a sales module. Renders nothing for non-owners. */
export default async function CustomFieldsManager({ module, revalidate }: { module: string; revalidate: string }) {
  const ctx = await requireActiveAgency();
  if (ctx.profile.role !== 'owner') return null;
  const db = createAdminClient();
  const { data: defs } = await db.from('custom_field_defs').select('*')
    .eq('agency_id', ctx.profile.agency_id).eq('module', module)
    .order('position').order('created_at');

  return (
    <AddPanel label={`⚙️ Custom fields for this module (${(defs || []).length})`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs text-slate-500">
            Fields you add here appear on every sale form in this module, for your whole agency.
            <span className="font-semibold accent"> Amount fields</span> automatically add to or deduct from the sale grand total and show on the invoice.
          </p>
          <form action={addCustomField} className="grid gap-3">
            <input type="hidden" name="module" value={module} />
            <input type="hidden" name="revalidate" value={revalidate} />
            <div><label className="label">Field label *</label><input className="input" name="label" required placeholder="e.g. ATOL certificate number" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type *</label>
                <select className="input" name="field_type" defaultValue="text">
                  {Object.entries(CF_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="label">Order</label><input className="input" name="position" type="number" placeholder="0" /></div>
            </div>
            <SubmitButton className="btn-primary" pendingText="Adding…">Add field</SubmitButton>
          </form>
        </div>
        <div>
          {(defs || []).length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-400">No custom fields yet for this module.</p>}
          {(defs || []).map((d: any) => (
            <div key={d.id} className={`mb-2 flex items-center justify-between gap-3 rounded-lg border p-2.5 ${d.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <div>
                <p className="text-sm font-semibold">{d.label}</p>
                <p className="text-[11px] text-slate-400">{CF_TYPE_LABEL[d.field_type as CustomFieldType]}{d.active ? '' : ' · hidden'}</p>
              </div>
              <div className="flex items-center gap-2">
                <form action={toggleCustomField}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="revalidate" value={revalidate} />
                  <button className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:border-gold hover:text-gold" type="submit">{d.active ? 'Hide' : 'Show'}</button>
                </form>
                <form action={deleteCustomField}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="revalidate" value={revalidate} />
                  <button className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-400 hover:bg-red-50" type="submit">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AddPanel>
  );
}
