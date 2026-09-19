import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { markAttendance } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';
import HRTabs from '@/components/hr-tabs';

export default async function AttendancePage({ searchParams }: { searchParams: { date?: string } }) {
  const ctx = await requireModule('hr');
  const db = createAdminClient();
  const date = searchParams?.date || new Date().toISOString().slice(0, 10);
  const [{ data: employees }, { data: records }] = await Promise.all([
    db.from('employees').select('id, full_name, designation').eq('agency_id', ctx.profile.agency_id).eq('status', 'active').order('full_name'),
    db.from('attendance').select('*, employees(full_name)').eq('agency_id', ctx.profile.agency_id).eq('att_date', date),
  ]);

  return (
    <div>
      <PageHeader title="Attendance" subtitle={`Daily attendance register — ${date}`} />
      <HRTabs />

      <AddPanel label="Mark attendance">
        <form action={markAttendance} className="grid gap-4 sm:grid-cols-3">
          <Field label="Employee *">
            <select className="input" name="employee_id" required>
              <option value="">Select employee…</option>
              {(employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </Field>
          <Field label="Date"><input className="input" name="att_date" type="date" defaultValue={date} /></Field>
          <Field label="Status">
            <select className="input" name="status">
              {['present', 'absent', 'half_day', 'leave', 'holiday'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Check-in"><input className="input" name="check_in" placeholder="09:00" /></Field>
          <Field label="Check-out"><input className="input" name="check_out" placeholder="18:00" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save attendance</button></div>
        </form>
      </AddPanel>

      <form className="mb-4">
        <input type="hidden" name="date" value="" />
        <input className="input max-w-xs" name="date" type="date" defaultValue={date} />
        <button className="btn-secondary ml-2" type="submit">Show date</button>
      </form>

      <Table head={['Employee', 'Date', 'Check-in', 'Check-out', 'Status']}>
        {records?.length ? records.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{(r.employees as any)?.full_name || '—'}</td>
            <td className="px-4 py-2">{r.att_date}</td>
            <td className="px-4 py-2">{r.check_in || '—'}</td>
            <td className="px-4 py-2">{r.check_out || '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No attendance recorded for this date." /></td></tr>}
      </Table>
    </div>
  );
}
