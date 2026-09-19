import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole, MODULES } from '@/lib/data';
import { inviteMember, changeMemberRole, removeMember, setMemberModules } from '@/lib/team-actions';
import { PageHeader, StatusBadge, Empty, AddPanel, Field } from '@/components/ui';

export default async function TeamPage() {
  const ctx = await requireRole('owner');
  const db = createAdminClient();
  const { data: members } = await db
    .from('profiles').select('id, full_name, email, role, modules, created_at')
    .eq('agency_id', ctx.profile.agency_id).order('created_at');

  return (
    <div>
      <PageHeader title="Team & Permissions" subtitle="Invite users, set roles, and assign which CRM modules each team member can access" />

      <AddPanel label="Invite team member">
        <form action={inviteMember} className="grid gap-4 sm:grid-cols-3">
          <Field label="Full name *"><input className="input" name="full_name" required /></Field>
          <Field label="Email *"><input className="input" name="email" type="email" required /></Field>
          <Field label="Temporary password *"><input className="input" name="password" type="password" minLength={8} required /></Field>
          <Field label="Role">
            <select className="input" name="role">
              <option value="staff">Staff — operations modules</option>
              <option value="manager">Manager — + invoices, quotations, reports</option>
            </select>
          </Field>
          <div className="sm:col-span-3">
            <button className="btn-primary" type="submit">Create account</button>
            <span className="ml-3 text-xs text-slate-400">After inviting, edit their module access below. You can fine-tune permissions per user.</span>
          </div>
        </form>
      </AddPanel>

      <div className="space-y-4">
        {members?.length ? members.map((m) => {
          const isSelf = m.id === ctx.user.id;
          const checked = Array.isArray(m.modules) && m.modules.length ? m.modules : MODULES.map((x) => x.key);
          return (
            <div key={m.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {m.full_name || '—'} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-400">{m.email || '—'} · joined {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={m.role} />
                  {!isSelf && (
                    <form action={changeMemberRole} className="flex gap-2">
                      <input type="hidden" name="id" value={m.id} />
                      <select name="role" defaultValue={m.role} className="input max-w-28 px-2 py-1 text-xs">
                        {['owner', 'manager', 'staff'].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set role</button>
                    </form>
                  )}
                  {!isSelf && (
                    <form action={removeMember}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Remove</button>
                    </form>
                  )}
                </div>
              </div>

              {/* Module permissions */}
              <div className="mt-4">
                {m.role === 'owner' ? (
                  <p className="text-xs text-slate-400">Owners always have access to every module.</p>
                ) : (
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold accent">Module access ({checked.length}/{MODULES.length} enabled) — click to edit</summary>
                    <form action={setMemberModules} className="mt-3 grid gap-2 sm:grid-cols-4">
                      <input type="hidden" name="id" value={m.id} />
                      {MODULES.map((mod) => (
                        <label key={mod.key} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                          <input type="checkbox" name="modules" value={mod.key} defaultChecked={checked.includes(mod.key)} className="accent-gold" />
                          <span>{mod.icon} {mod.label}</span>
                        </label>
                      ))}
                      <div className="sm:col-span-4 flex items-center gap-2">
                        <button className="btn-primary px-3 py-1.5 text-xs" type="submit">Save module access</button>
                        <span className="text-[11px] text-slate-400">Manager-only modules (invoices, quotations, reports) only apply if their role is manager or higher.</span>
                      </div>
                    </form>
                  </details>
                )}
              </div>
            </div>
          );
        }) : <Empty msg="No team members yet." />}
      </div>
    </div>
  );
}
