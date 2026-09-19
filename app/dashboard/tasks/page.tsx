import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';
import { createTask, toggleTask } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';

export default async function TasksPage() {
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const [{ data: tasks }, { data: bookings }] = await Promise.all([
    db.from('tasks').select('*, bookings(booking_ref)').eq('agency_id', aid).order('due_date'),
    db.from('bookings').select('id, booking_ref').eq('agency_id', aid),
  ]);

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Follow-ups & reminders" />
      <AddPanel label="Add task">
        <form action={createTask} className="grid gap-4 sm:grid-cols-3">
          <Field label="Title *"><input className="input" name="title" required placeholder="Follow up visa for EZ-2026-0001" /></Field>
          <Field label="Due date"><input className="input" name="due_date" type="date" /></Field>
          <Field label="Priority"><select className="input" name="priority">{['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          <Field label="Booking"><select className="input" name="related_booking_id"><option value="">— none —</option>{bookings?.map((b) => <option key={b.id} value={b.id}>{b.booking_ref}</option>)}</select></Field>
          <Field label="Assigned to"><input className="input" name="assigned_to" /></Field>
          <Field label="Description"><input className="input" name="description" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save task</button></div>
        </form>
      </AddPanel>
      <Table head={['Task', 'Booking', 'Due', 'Priority', 'Status', '']}>
        {tasks?.length ? tasks.map((t) => (
          <tr key={t.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-medium">{t.title}</td>
            <td className="px-4 py-2">{(t.bookings as any | null)?.booking_ref || '—'}</td>
            <td className="px-4 py-2">{t.due_date || '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={t.priority} /></td>
            <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
            <td className="px-4 py-2">
              <form action={toggleTask}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="next" value={t.status === 'done' ? 'todo' : 'done'} />
                <button className="btn-secondary px-3 py-1 text-xs" type="submit">{t.status === 'done' ? 'Reopen' : 'Done ✓'}</button>
              </form>
            </td>
          </tr>
        )) : <Empty msg="No tasks yet." />}
      </Table>
    </div>
  );
}
