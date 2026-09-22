import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule, staffPrivacyOn } from '@/lib/data';
import { createLead, setLeadStatus, convertLead, deleteLead } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';

export default async function LeadsPage({ searchParams }: { searchParams: { status?: string } }) {
  const ctx = await requireModule('leads');
  const cur = (ctx as any).agency?.currency;
  const db = createAdminClient();
  let q = db.from('leads').select('*').eq('agency_id', ctx.profile.agency_id).order('created_at', { ascending: false });
  if (staffPrivacyOn(ctx)) q = q.or(`assigned_to.eq.${ctx.profile.id},created_by.eq.${ctx.profile.id}`);
  if (searchParams?.status) q = q.eq('status', searchParams.status);
  const { data: leads } = await q;
  const { data: team } = await db.from('profiles').select('id, full_name').eq('agency_id', ctx.profile.agency_id).order('full_name');
  const teamMap = new Map((team || []).map((p: any) => [p.id, p.full_name]));

  const counts: Record<string, number> = {};
  for (const l of leads || []) counts[l.status] = (counts[l.status] || 0) + 1;
  const TABS = ['all', 'new', 'contacted', 'qualified', 'converted', 'lost'];

  return (
    <div>
      <PageHeader title="Leads" subtitle="Sales pipeline — capture inquiries and convert them to customers" />

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {TABS.map((t) => (
          <a key={t} href={`/dashboard/leads${t === 'all' ? '' : `?status=${t}`}`}
            className={`badge capitalize ${searchParams?.status === t || (!searchParams?.status && t === 'all') ? 'accent-soft-bg accent' : 'bg-slate-100 text-slate-500'}`}>
            {t} {t === 'all' ? (leads?.length ?? 0) : (counts[t] || 0)}
          </a>
        ))}
      </div>

      <AddPanel label="Add lead">
        <form action={createLead} className="grid gap-4 sm:grid-cols-3">
          <Field label="Full name *"><input className="input" name="full_name" required /></Field>
          <Field label="Phone"><input className="input" name="phone" /></Field>
          <Field label="WhatsApp"><input className="input" name="whatsapp" /></Field>
          <Field label="Email"><input className="input" name="email" type="email" /></Field>
          <Field label="Country"><input className="input" name="country" /></Field>
          <Field label="Interested in">
            <select className="input" name="interest">
              <option value="umrah">Umrah</option><option value="hajj">Hajj</option>
              <option value="ziyarah">Ziyarah</option><option value="holiday">Holiday</option>
            </select>
          </Field>
          <Field label="Source">
            <select className="input" name="source">
              <option value="website">Website</option><option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option><option value="walk_in">Walk-in</option>
              <option value="instagram">Instagram</option><option value="facebook">Facebook</option>
            </select>
          </Field>
          <Field label="Budget (USD)"><input className="input" name="budget" type="number" /></Field>
          <Field label="Assign to"><select className="input" name="assigned_to"><option value="">— unassigned —</option>{(team || []).map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
          <Field label="Notes"><input className="input" name="notes" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save lead</button></div>
        </form>
      </AddPanel>

      <Table head={['Lead', 'Contact', 'Interest', 'Source', 'Budget', 'Stage', 'Assigned', 'Actions']}>
        {leads?.length ? leads.map((l) => (
          <tr key={l.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{l.full_name}</td>
            <td className="px-4 py-2 text-slate-500">{l.phone || l.whatsapp || l.email || '—'}<br /><span className="text-xs">{l.country || ''}</span></td>
            <td className="px-4 py-2 capitalize">{l.interest}</td>
            <td className="px-4 py-2 text-xs capitalize text-slate-500">{(l.source || '').replace(/_/g, ' ')}</td>
            <td className="px-4 py-2">{l.budget ? `${money(Number(l.budget), cur)}` : '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={l.status} /></td>
            <td className="px-4 py-2 text-xs font-semibold text-slate-600">{l.assigned_to ? (teamMap.get(l.assigned_to) || '—') : <span className="text-slate-300">—</span>}</td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <form action={setLeadStatus} className="flex gap-1">
                  <input type="hidden" name="id" value={l.id} />
                  <select name="status" defaultValue={l.status} className="input max-w-24 px-2 py-1 text-xs">
                    {['new', 'contacted', 'qualified', 'converted', 'lost'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
                </form>
                <RowEdit table="leads" id={l.id}><label className="text-[10px] text-slate-400">Name</label><input className="input px-2 py-1 text-xs" name="full_name" defaultValue={l.full_name || ''} /><label className="text-[10px] text-slate-400">Phone</label><input className="input px-2 py-1 text-xs" name="phone" defaultValue={l.phone || ''} /><label className="text-[10px] text-slate-400">WhatsApp</label><input className="input px-2 py-1 text-xs" name="whatsapp" defaultValue={l.whatsapp || ''} /><label className="text-[10px] text-slate-400">Email</label><input className="input px-2 py-1 text-xs" name="email" defaultValue={l.email || ''} /><label className="text-[10px] text-slate-400">Country</label><input className="input px-2 py-1 text-xs" name="country" defaultValue={l.country || ''} /><label className="text-[10px] text-slate-400">Interest</label><select className="input px-2 py-1 text-xs" name="interest"><option value="umrah" selected={l.interest === "umrah"}> umrah</option><option value="hajj" selected={l.interest === "hajj"}> hajj</option><option value="ziyarah" selected={l.interest === "ziyarah"}> ziyarah</option><option value="holiday" selected={l.interest === "holiday"}> holiday</option></select><label className="text-[10px] text-slate-400">Source</label><select className="input px-2 py-1 text-xs" name="source"><option value="website" selected={l.source === "website"}> website</option><option value="whatsapp" selected={l.source === "whatsapp"}> whatsapp</option><option value="referral" selected={l.source === "referral"}> referral</option><option value="walk_in" selected={l.source === "walk_in"}> walk in</option><option value="instagram" selected={l.source === "instagram"}> instagram</option><option value="facebook" selected={l.source === "facebook"}> facebook</option></select><label className="text-[10px] text-slate-400">Budget</label><input className="input px-2 py-1 text-xs" name="budget" defaultValue={l.budget || ''} /><label className="text-[10px] text-slate-400">Assigned to</label><select className="input px-2 py-1 text-xs" name="assigned_to" defaultValue={l.assigned_to || ''}><option value="">— unassigned —</option>{(team || []).map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></RowEdit>
                {l.status !== 'converted' && (
                  <form action={convertLead}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="text-xs font-semibold accent hover:underline" type="submit">Convert → Customer</button>
                  </form>
                )}
                <form action={deleteLead}>
                  <input type="hidden" name="id" value={l.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No leads yet — add your first inquiry." /></td></tr>}
      </Table>
    </div>
  );
}
