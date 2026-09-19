import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { applyLeave, setLeaveStatus, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';
import HRTabs from '@/components/hr-tabs';

export default async function LeavesPage({ searchParams }: { searchParams: { status?: string } }) {
  const ctx = await requireModule('hr');
  const db = createAdminClient();
  let q = db.from('leaves').select('*, employees(full_name)').eq('agency_id', ctx.profile.agency_id).order('created_at', { ascending: false });
  if (searchParams?.status) q = q.eq('status', searchParams.status);
  const [{ data: leaves }, { data: employees }] = await Promise.all([
    q,
    db.from('employees').select('id, full_name').eq('agency_id', ctx.profile.agency_id).eq('status', 'active'),
  ]);

  return (
    <div>
      <PageHeader title="Leaves" subtitle="Leave requests & approvals" />
      <HRTabs />

      <AddPanel label="Apply for leave">
        <form action={applyLeave} className="grid gap-4 sm:grid-cols-3">
          <Field label="Employee *">
            <select className="input" name="employee_id" required>
              <option value="">Select employee…</option>
              {(employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select className="input" name="leave_type">
              {['annual', 'sick', 'casual', 'unpaid', 'hajj', 'umrah'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Days"><input className="input" name="days" type="number" defaultValue="1" /></Field>
          <Field label="From"><input className="input" name="leave_from" type="date" /></Field>
          <Field label="To"><input className="input" name="leave_to" type="date" /></Field>
          <Field label="Reason"><input className="input" name="reason" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Submit leave request</button></div>
        </form>
      </AddPanel>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {[undefined, 'pending', 'approved', 'rejected'].map((t) => (
          <a key={t || 'all'} href={`/dashboard/hr/leaves${t ? `?status=${t}` : ''}`}
            className={`badge ${searchParams?.status === t && t ? 'accent-soft-bg accent' : 'bg-slate-100 text-slate-500'}`}>
            {t ? t : 'all'}
          </a>
        ))}
      </div>

      <Table head={['Employee', 'Type', 'From → To', 'Days', 'Reason', 'Status', 'Action']}>
        {leaves?.length ? leaves.map((l) => (
          <tr key={l.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{(l.employees as any)?.full_name || '—'}</td>
            <td className="px-4 py-2 capitalize">{l.leave_type}</td>
            <td className="px-4 py-2">{l.leave_from || '—'} → {l.leave_to || '—'}</td>
            <td className="px-4 py-2">{l.days}</td>
            <td className="px-4 py-2 text-xs text-slate-500">{l.reason || '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={l.status} /></td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
              <RowEdit table="leaves" id={l.id}><label className="text-[10px] text-slate-400">Type</label><select className="input px-2 py-1 text-xs" name="leave_type"><option value="annual" selected={l.leave_type === "annual"}> annual</option><option value="sick" selected={l.leave_type === "sick"}> sick</option><option value="casual" selected={l.leave_type === "casual"}> casual</option><option value="unpaid" selected={l.leave_type === "unpaid"}> unpaid</option><option value="hajj" selected={l.leave_type === "hajj"}> hajj</option><option value="umrah" selected={l.leave_type === "umrah"}> umrah</option></select><label className="text-[10px] text-slate-400">From</label><input className="input px-2 py-1 text-xs" type="date" name="leave_from" defaultValue={l.leave_from || ''} /><label className="text-[10px] text-slate-400">To</label><input className="input px-2 py-1 text-xs" type="date" name="leave_to" defaultValue={l.leave_to || ''} /><label className="text-[10px] text-slate-400">Days</label><input className="input px-2 py-1 text-xs" name="days" defaultValue={l.days || ''} /><label className="text-[10px] text-slate-400">Reason</label><input className="input px-2 py-1 text-xs" name="reason" defaultValue={l.reason || ''} /></RowEdit>
              <form action={deleteRecord}><input type="hidden" name="table" value="leaves" /><input type="hidden" name="id" value={l.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
              </div>
              {l.status === 'pending' ? (
                <form action={setLeaveStatus} className="flex gap-1">
                  <input type="hidden" name="id" value={l.id} />
                  <button name="status" value="approved" className="text-xs font-semibold text-green-600 hover:underline" type="submit">Approve</button>
                  <span className="text-slate-300">|</span>
                  <button name="status" value="rejected" className="text-xs font-semibold text-red-500 hover:underline" type="submit">Reject</button>
                </form>
              ) : <span className="text-xs text-slate-400">—</span>}
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No leave requests." /></td></tr>}
      </Table>
    </div>
  );
}
