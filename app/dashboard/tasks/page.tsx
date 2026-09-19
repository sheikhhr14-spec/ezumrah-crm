import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { createTask, toggleTask, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';

export default async function TasksPage() {
  const ctx = await requireModule('tasks');
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
              <div className="mt-2 flex items-center gap-2">
              <RowEdit table="tasks" id={t.id}><label className="text-[10px] text-slate-400">Task</label><input className="input px-2 py-1 text-xs" name="title" defaultValue={t.title || ''} /><label className="text-[10px] text-slate-400">Due</label><input className="input px-2 py-1 text-xs" type="date" name="due_date" defaultValue={t.due_date || ''} /><label className="text-[10px] text-slate-400">Priority</label><select className="input px-2 py-1 text-xs" name="priority"><option value="low" selected={t.priority === "low"}> low</option><option value="medium" selected={t.priority === "medium"}> medium</option><option value="high" selected={t.priority === "high"}> high</option><option value="urgent" selected={t.priority === "urgent"}> urgent</option></select><label className="text-[10px] text-slate-400">Status</label><select className="input px-2 py-1 text-xs" name="status"><option value="todo" selected={t.status === "todo"}> todo</option><option value="in_progress" selected={t.status === "in_progress"}> in progress</option><option value="done" selected={t.status === "done"}> done</option></select><label className="text-[10px] text-slate-400">Assigned to</label><input className="input px-2 py-1 text-xs" name="assigned_to" defaultValue={t.assigned_to || ''} /></RowEdit>
              <form action={deleteRecord}><input type="hidden" name="table" value="tasks" /><input type="hidden" name="id" value={t.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
              </div>
            </td>
          </tr>
        )) : <Empty msg="No tasks yet." />}
      </Table>
    </div>
  );
}
