import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { addEmployee, setEmployeeStatus, deleteEmployee } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import HRTabs from '@/components/hr-tabs';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';

export default async function HREmployeesPage() {
  const ctx = await requireModule('hr');
  const db = createAdminClient();
  const { data: employees } = await db.from('employees').select('*')
    .eq('agency_id', ctx.profile.agency_id).order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader title="Human Resources" subtitle="Employees, attendance, leaves & payroll" />
      <HRTabs />

      <AddPanel label="Add employee">
        <form action={addEmployee} className="grid gap-4 sm:grid-cols-3">
          <Field label="Full name *"><input className="input" name="full_name" required /></Field>
          <Field label="Designation"><input className="input" name="designation" placeholder="Umrah Consultant" /></Field>
          <Field label="Department"><input className="input" name="department" placeholder="Sales / Operations / Accounts" /></Field>
          <Field label="Email"><input className="input" name="email" type="email" /></Field>
          <Field label="Phone"><input className="input" name="phone" /></Field>
          <Field label="Join date"><input className="input" name="join_date" type="date" /></Field>
          <Field label="Monthly salary (USD)"><input className="input" name="monthly_salary" type="number" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save employee</button></div>
        </form>
      </AddPanel>

      <Table head={['Employee', 'Designation', 'Department', 'Phone', 'Joined', 'Salary', 'Status', 'Actions']}>
        {employees?.length ? employees.map((e) => (
          <tr key={e.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{e.full_name}</td>
            <td className="px-4 py-2">{e.designation || '—'}</td>
            <td className="px-4 py-2">{e.department || '—'}</td>
            <td className="px-4 py-2">{e.phone || '—'}</td>
            <td className="px-4 py-2">{e.join_date || '—'}</td>
            <td className="px-4 py-2">${Number(e.monthly_salary).toLocaleString()}</td>
            <td className="px-4 py-2"><StatusBadge status={e.status} /></td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <form action={setEmployeeStatus} className="flex gap-1">
                  <input type="hidden" name="id" value={e.id} />
                  <select name="status" defaultValue={e.status} className="input max-w-24 px-2 py-1 text-xs">
                    {['active', 'suspended', 'resigned'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
                </form>
                <RowEdit table="employees" id={e.id}><label className="text-[10px] text-slate-400">Name</label><input className="input px-2 py-1 text-xs" name="full_name" defaultValue={e.full_name || ''} /><label className="text-[10px] text-slate-400">Email</label><input className="input px-2 py-1 text-xs" name="email" defaultValue={e.email || ''} /><label className="text-[10px] text-slate-400">Phone</label><input className="input px-2 py-1 text-xs" name="phone" defaultValue={e.phone || ''} /><label className="text-[10px] text-slate-400">Designation</label><input className="input px-2 py-1 text-xs" name="designation" defaultValue={e.designation || ''} /><label className="text-[10px] text-slate-400">Department</label><input className="input px-2 py-1 text-xs" name="department" defaultValue={e.department || ''} /><label className="text-[10px] text-slate-400">Join date</label><input className="input px-2 py-1 text-xs" type="date" name="join_date" defaultValue={e.join_date || ''} /><label className="text-[10px] text-slate-400">Salary</label><input className="input px-2 py-1 text-xs" name="monthly_salary" defaultValue={e.monthly_salary || ''} /></RowEdit>
                <form action={deleteEmployee}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No employees yet." /></td></tr>}
      </Table>
    </div>
  );
}
