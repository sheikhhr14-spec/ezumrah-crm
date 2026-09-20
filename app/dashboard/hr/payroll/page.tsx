import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { runPayroll, updatePayrollLine, markPayrollPaid, deleteRecord } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';
import HRTabs from '@/components/hr-tabs';

export default async function PayrollPage({ searchParams }: { searchParams: { month?: string } }) {
  const ctx = await requireModule('hr');
  const db = createAdminClient();
  const month = searchParams?.month || new Date().toISOString().slice(0, 7);
  const { data: payroll } = await db.from('payroll').select('*, employees(full_name, designation)')
    .eq('agency_id', ctx.profile.agency_id).eq('pay_month', month).order('created_at');

  const totalNet = (payroll || []).reduce((s, p) => s + Number(p.net), 0);
  const paid = (payroll || []).filter((p) => p.status === 'paid').length;

  return (
    <div>
      <PageHeader title="Payroll" subtitle={`${month} — ${paid}/${payroll?.length ?? 0} paid · $${totalNet.toLocaleString()} total`} />
      <HRTabs />

      <AddPanel label="Generate payroll for a month">
        <form action={runPayroll} className="flex flex-wrap items-end gap-4">
          <Field label="Month"><input className="input" name="pay_month" type="month" defaultValue={month} /></Field>
          <button className="btn-primary" type="submit">Run payroll (all active employees)</button>
          <span className="text-xs text-slate-400">Creates a draft line per active employee using their monthly salary. Edit allowances/deductions before marking paid.</span>
        </form>
      </AddPanel>

      <form className="mb-4">
        <input className="input max-w-xs" name="month" type="month" defaultValue={month} />
        <button className="btn-secondary ml-2" type="submit">Show month</button>
      </form>

      <Table head={['Employee', 'Basic', 'Allowances / Deductions', 'Net', 'Status', 'Pay']}>
        {payroll?.length ? payroll.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{(p.employees as any)?.full_name || '—'}<br />
              <span className="text-xs text-slate-400">{(p.employees as any)?.designation || ''}</span></td>
            <td className="px-4 py-2">${Number(p.basic).toLocaleString()}</td>
            <td className="px-4 py-2">
              <form action={updatePayrollLine} className="flex gap-1">
                <input type="hidden" name="id" value={p.id} />
                <input className="input w-20 px-2 py-1 text-xs" name="allowances" type="number" defaultValue={Number(p.allowances)} placeholder="+" />
                <input className="input w-20 px-2 py-1 text-xs" name="deductions" type="number" defaultValue={Number(p.deductions)} placeholder="−" />
                <button className="btn-secondary px-2 py-1 text-xs" type="submit">Apply</button>
              </form>
            </td>
            <td className="px-4 py-2">${Number(p.net).toLocaleString()}</td>
            <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
            <td className="px-4 py-2">
              {p.status === 'draft' ? (
                <form action={markPayrollPaid}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-xs font-semibold text-green-600 hover:underline" type="submit">Mark paid</button>
                </form>
              ) : <span className="text-xs text-slate-400">paid {p.paid_on || ''}</span>}
              <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=payslip&id=${p.id}`}>Slip</a>
              <form action={deleteRecord} className="mt-1"><input type="hidden" name="table" value="payroll" /><input type="hidden" name="id" value={p.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg={`No payroll generated for ${month}. Use "Run payroll" above.`} /></td></tr>}
      </Table>
    </div>
  );
}
