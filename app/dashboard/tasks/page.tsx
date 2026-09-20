import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { createTask, toggleTask, deleteRecord, updateRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import SubmitButton from '@/components/submit-button';
import { PageHeader, Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';
import Link from 'next/link';

const COLS = [
  { key: 'todo', label: 'To do', icon: '📋' },
  { key: 'in_progress', label: 'In progress', icon: '🚧' },
  { key: 'done', label: 'Done', icon: '✅' },
];

export default async function TasksPage({ searchParams }: { searchParams: { view?: string } }) {
  const ctx = await requireModule('tasks');
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const [{ data: tasks }, { data: bookings }, { data: staff }] = await Promise.all([
    db.from('tasks').select('*, bookings(booking_ref)').eq('agency_id', aid).order('due_date'),
    db.from('bookings').select('id, booking_ref').eq('agency_id', aid),
    db.from('profiles').select('id, full_name, role').eq('agency_id', aid),
  ]);
  const view = searchParams.view === 'list' ? 'list' : 'kanban';
  const list = tasks || [];

  // assign-to dropdown reused in add form + edit popups
  const AssignSelect = ({ def }: { def?: string }) => (
    <select className="input px-2 py-1 text-xs" name="assigned_to" defaultValue={def || ''}>
      <option value="">— unassigned —</option>
      {(staff || []).map((m: any) => <option key={m.id} value={m.full_name}>{m.full_name} ({m.role})</option>)}
    </select>
  );

  const move = (t: any, dir: number) => {
    const idx = COLS.findIndex((c) => c.key === t.status);
    const next = COLS[Math.min(Math.max(idx + dir, 0), COLS.length - 1)].key;
    return (
      <form action={updateRecord}>
        <input type="hidden" name="table" value="tasks" />
        <input type="hidden" name="id" value={t.id} />
        <input type="hidden" name="status" value={next} />
        <button className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200" type="submit">{dir > 0 ? '→' : '←'}</button>
      </form>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Tasks" subtitle="Follow-ups & reminders — kanban and list views" />
        <div className="mb-4 flex gap-2">
          <Link href="/dashboard/tasks" className={`rounded-lg px-4 py-2 text-xs font-semibold ${view === 'kanban' ? 'accent-bg text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>Kanban</Link>
          <Link href="/dashboard/tasks?view=list" className={`rounded-lg px-4 py-2 text-xs font-semibold ${view === 'list' ? 'accent-bg text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>List</Link>
        </div>
      </div>

      <AddPanel label="Add task">
        <form action={createTask} className="grid gap-4 sm:grid-cols-3">
          <Field label="Title *"><input className="input" name="title" required placeholder="Follow up visa for EZ-2026-0001" /></Field>
          <Field label="Due date"><input className="input" name="due_date" type="date" /></Field>
          <Field label="Priority"><select className="input" name="priority">{['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          <Field label="Booking"><select className="input" name="related_booking_id"><option value="">— none —</option>{bookings?.map((b) => <option key={b.id} value={b.id}>{b.booking_ref}</option>)}</select></Field>
          <Field label="Assigned to"><span className="block"><AssignSelect /></span></Field>
          <Field label="Description"><input className="input" name="description" /></Field>
          <div className="sm:col-span-3"><SubmitButton className="btn-primary">Save task</SubmitButton></div>
        </form>
      </AddPanel>

      {/* kanban */}
      {view === 'kanban' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLS.map((col) => {
            const cards = list.filter((t: any) => (t.status || 'todo') === col.key);
            return (
              <div key={col.key} className="rounded-xl bg-slate-100 p-3">
                <p className="mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>{col.icon} {col.label}</span>
                  <span className="badge bg-white text-slate-500">{cards.length}</span>
                </p>
                <div className="space-y-3">
                  {cards.length ? cards.map((t: any) => (
                    <div key={t.id} className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${t.status === 'done' ? 'opacity-60' : ''}`}>
                      <p className={`text-sm font-semibold ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{t.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                        <StatusBadge status={t.priority} />
                        {t.due_date && <span className="badge bg-slate-100 text-slate-500">📅 {t.due_date}</span>}
                        {t.assigned_to && <span className="badge accent-soft-bg accent">👤 {t.assigned_to}</span>}
                        {(t.bookings as any)?.booking_ref && <span className="badge bg-slate-100 text-slate-500">{(t.bookings as any).booking_ref}</span>}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex gap-1">
                          {t.status !== 'todo' && move(t, -1)}
                          {t.status !== 'done' && move(t, 1)}
                        </div>
                        <div className="flex items-center gap-2">
                          <form action={toggleTask}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="next" value={t.status === 'done' ? 'todo' : 'done'} />
                            <button className="text-[10px] font-semibold accent hover:underline" type="submit">{t.status === 'done' ? 'Reopen' : 'Done ✓'}</button>
                          </form>
                          <RowEdit table="tasks" id={t.id} title="Edit task">
                            <label className="text-[10px] text-slate-400">Task</label><input className="input px-2 py-1 text-xs" name="title" defaultValue={t.title || ''} />
                            <label className="text-[10px] text-slate-400">Due</label><input className="input px-2 py-1 text-xs" type="date" name="due_date" defaultValue={t.due_date || ''} />
                            <label className="text-[10px] text-slate-400">Priority</label>
                            <select className="input px-2 py-1 text-xs" name="priority" defaultValue={t.priority}>
                              {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <label className="text-[10px] text-slate-400">Status</label>
                            <select className="input px-2 py-1 text-xs" name="status" defaultValue={t.status}>
                              {COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                            <label className="text-[10px] text-slate-400">Assigned to</label><AssignSelect def={t.assigned_to} />
                          </RowEdit>
                          <form action={deleteRecord}><input type="hidden" name="table" value="tasks" /><input type="hidden" name="id" value={t.id} /><button className="text-[10px] font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
                        </div>
                      </div>
                    </div>
                  )) : <p className="px-1 py-4 text-center text-xs text-slate-400">Nothing here</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-4">
          <Table head={['Task', 'Booking', 'Due', 'Priority', 'Assigned to', 'Status', 'Actions']}>
            {list.length ? list.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{t.title}</td>
                <td className="px-4 py-2">{(t.bookings as any)?.booking_ref || '—'}</td>
                <td className="px-4 py-2">{t.due_date || '—'}</td>
                <td className="px-4 py-2"><StatusBadge status={t.priority} /></td>
                <td className="px-4 py-2">{t.assigned_to || '—'}</td>
                <td className="px-4 py-2"><StatusBadge status={t.status || 'todo'} /></td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="next" value={t.status === 'done' ? 'todo' : 'done'} />
                      <button className="text-xs font-semibold accent hover:underline" type="submit">{t.status === 'done' ? 'Reopen' : 'Done ✓'}</button>
                    </form>
                    <RowEdit table="tasks" id={t.id} title="Edit task">
                      <label className="text-[10px] text-slate-400">Task</label><input className="input px-2 py-1 text-xs" name="title" defaultValue={t.title || ''} />
                      <label className="text-[10px] text-slate-400">Due</label><input className="input px-2 py-1 text-xs" type="date" name="due_date" defaultValue={t.due_date || ''} />
                      <label className="text-[10px] text-slate-400">Priority</label>
                      <select className="input px-2 py-1 text-xs" name="priority" defaultValue={t.priority}>
                        {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <label className="text-[10px] text-slate-400">Status</label>
                      <select className="input px-2 py-1 text-xs" name="status" defaultValue={t.status}>
                        {COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      <label className="text-[10px] text-slate-400">Assigned to</label><AssignSelect def={t.assigned_to} />
                    </RowEdit>
                    <form action={deleteRecord}><input type="hidden" name="table" value="tasks" /><input type="hidden" name="id" value={t.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
                  </div>
                </td>
              </tr>
            )) : <Empty msg="No tasks yet." />}
          </Table>
        </div>
      )}
    </div>
  );
}
