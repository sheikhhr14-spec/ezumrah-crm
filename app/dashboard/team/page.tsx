import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/data';
import { inviteMember, changeMemberRole, removeMember } from '@/lib/team-actions';
import { PageHeader, StatusBadge, Table, Empty, AddPanel, Field } from '@/components/ui';

export default async function TeamPage() {
  const ctx = await requireRole('owner');
  const db = createAdminClient();
  const { data: members } = await db
    .from('profiles').select('id, full_name, email, role, created_at')
    .eq('agency_id', ctx.profile.agency_id).order('created_at');

  return (
    <div>
      <PageHeader title="Team" subtitle="Role-based access: owner > manager > staff" />
      <AddPanel label="Invite team member">
        <form action={inviteMember} className="grid gap-4 sm:grid-cols-3">
          <Field label="Full name *"><input className="input" name="full_name" required /></Field>
          <Field label="Email *"><input className="input" name="email" type="email" required /></Field>
          <Field label="Temporary password *"><input className="input" name="password" type="password" minLength={8} required /></Field>
          <Field label="Role">
            <select className="input" name="role">
              <option value="staff">Staff — bookings & customers only</option>
              <option value="manager">Manager — + invoices & quotations</option>
            </select>
          </Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Send invite (account created instantly)</button></div>
        </form>
      </AddPanel>

      <Table head={['Name', 'Email', 'Role', 'Change role', 'Remove']}>
        {members?.length ? members.map((m) => (
          <tr key={m.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{m.full_name || '—'}{m.id === ctx.user.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}</td>
            <td className="px-4 py-2 text-slate-500">{m.email || '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={m.role} /></td>
            <td className="px-4 py-2">
              {m.id === ctx.user.id ? <span className="text-xs text-slate-400">—</span> : (
                <form action={changeMemberRole} className="flex gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <select name="role" defaultValue={m.role} className="input w-32 px-2 py-1 text-xs">
                    {['owner', 'manager', 'staff'].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
                </form>
              )}
            </td>
            <td className="px-4 py-2">
              {m.id === ctx.user.id ? <span className="text-xs text-slate-400">—</span> : (
                <form action={removeMember}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Remove</button>
                </form>
              )}
            </td>
          </tr>
        )) : <Empty msg="No team members yet." />}
      </Table>
    </div>
  );
}
