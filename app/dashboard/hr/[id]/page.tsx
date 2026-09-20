import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireModule, requireActiveAgency } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateEmployeeProfile, uploadAgencyAsset } from '@/lib/crm-actions';
import { PageHeader, StatusBadge } from '@/components/ui';
import SubmitButton from '@/components/submit-button';

const L = ({ label, name, def, type = 'text', ph = '' }: any) => (
  <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
    <input className="input" name={name} defaultValue={def ?? ''} type={type} placeholder={ph} /></label>
);

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
  await requireModule('hr');
  const ctx = await requireActiveAgency();
  const db = createAdminClient();
  const { data: e } = await db.from('employees').select('*')
    .eq('id', params.id).eq('agency_id', ctx.profile.agency_id).single();
  if (!e) notFound();
  const { data: payroll } = await db.from('payroll').select('*')
    .eq('employee_id', e.id).order('pay_month', { ascending: false });

  return (
    <div>
      <div className="mb-2"><Link className="text-xs accent hover:underline" href="/dashboard/hr">← All employees</Link></div>
      <PageHeader title={e.full_name} subtitle={`${e.designation || 'Staff'}${e.department ? ' · ' + e.department : ''}`} />

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* profile card */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-2xl font-bold text-slate-400">
              {e.photo_url ? <img src={e.photo_url} alt={e.full_name} className="h-full w-full object-cover" /> : (e.full_name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold">{e.full_name}</p>
              <p className="text-xs text-slate-400">{e.email || '—'} · {e.phone || '—'}</p>
              <div className="mt-1"><StatusBadge status={e.status || 'active'} /></div>
            </div>
          </div>
          <form action={uploadAgencyAsset} className="mt-4 flex items-center gap-2">
            <input type="hidden" name="kind" value="employee_photo" />
            <input type="hidden" name="target_id" value={e.id} />
            <input type="file" name="file" accept="image/jpeg,image/png,image/jpg" className="text-xs" required />
            <SubmitButton pendingText="Uploading…" className="btn-secondary px-3 py-1.5 text-xs">Upload photo</SubmitButton>
          </form>
          {e.photo_url && (
            <form action={updateEmployeeProfile} className="mt-2">
              <input type="hidden" name="id" value={e.id} />
              <input type="hidden" name="remove_photo" value="true" />
              <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Remove photo</button>
            </form>
          )}

          {/* contract */}
          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">📄 Employment contract</h3>
          {e.contract_path ? (
            <div className="space-y-1">
              <a href={e.contract_path} target="_blank" className="text-xs font-semibold accent hover:underline">View contract (PDF)</a>
              <form action={updateEmployeeProfile}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="remove_contract" value="true" />
                <button className="block text-xs font-semibold text-red-500 hover:underline" type="submit">Remove contract</button>
              </form>
            </div>
          ) : (
            <form action={uploadAgencyAsset} className="flex items-center gap-2">
              <input type="hidden" name="kind" value="employee_contract" />
              <input type="hidden" name="target_id" value={e.id} />
              <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" className="text-xs" required />
              <SubmitButton pendingText="Uploading…" className="btn-secondary px-3 py-1.5 text-xs">Upload</SubmitButton>
            </form>
          )}

          {/* bank details */}
          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">🏦 Bank account (for payroll)</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-xs text-slate-400">Bank:</span> {e.bank_name || '—'}</p>
            <p><span className="text-xs text-slate-400">Account title:</span> {e.account_title || '—'}</p>
            <p><span className="text-xs text-slate-400">Account no.:</span> {e.account_no || '—'}</p>
            <p><span className="text-xs text-slate-400">IBAN:</span> {e.iban || '—'}</p>
            <p><span className="text-xs text-slate-400">National ID / CNIC:</span> {e.cnic || '—'}</p>
          </div>
        </div>

        {/* edit form */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">✏️ Employee details</h2>
          <form action={updateEmployeeProfile} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="id" value={e.id} />
            <L label="Full name" name="full_name" def={e.full_name} />
            <L label="Email" name="email" def={e.email} type="email" />
            <L label="Phone" name="phone" def={e.phone} />
            <L label="Designation" name="designation" def={e.designation} />
            <L label="Department" name="department" def={e.department} />
            <L label="Join date" name="join_date" def={e.join_date} type="date" />
            <L label="Monthly salary" name="monthly_salary" def={e.monthly_salary} type="number" />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Status</span>
              <select className="input" name="status" defaultValue={e.status || 'active'}>
                <option value="active">Active</option><option value="on_leave">On leave</option><option value="ex_employee">Ex-employee</option>
              </select></label>
            <L label="National ID / CNIC" name="cnic" def={e.cnic} />
            <L label="Bank name" name="bank_name" def={e.bank_name} />
            <L label="Account title" name="account_title" def={e.account_title} />
            <L label="Account no." name="account_no" def={e.account_no} />
            <L label="IBAN" name="iban" def={e.iban} />
            <label className="block sm:col-span-3"><span className="text-xs font-semibold text-slate-600">Notes</span>
              <input className="input" name="notes" defaultValue={e.notes || ''} /></label>
            <div className="sm:col-span-3"><SubmitButton pendingText="Saving…">Save employee</SubmitButton></div>
          </form>

          {/* payroll history with slips */}
          <h2 className="mb-3 mt-8 text-lg font-semibold">💰 Payroll history</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Month</th><th className="px-2 py-2">Basic</th><th className="px-2 py-2">Allowances</th>
                <th className="px-2 py-2">Deductions</th><th className="px-2 py-2">Net salary</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Slip</th>
              </tr></thead>
              <tbody>
                {(payroll || []).length ? (payroll as any[]).map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-2 py-2 font-semibold">{p.pay_month}</td>
                    <td className="px-2 py-2">${Number(p.basic).toFixed(2)}</td>
                    <td className="px-2 py-2">${Number(p.allowances).toFixed(2)}</td>
                    <td className="px-2 py-2 text-red-500">-${Number(p.deductions).toFixed(2)}</td>
                    <td className="px-2 py-2 font-bold">${Number(p.net).toFixed(2)}</td>
                    <td className="px-2 py-2"><StatusBadge status={p.status} /></td>
                    <td className="px-2 py-2">
                      <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=payslip&id=${p.id}`}>Download slip</a>
                    </td>
                  </tr>
                )) : <tr><td className="px-2 py-3 text-xs text-slate-400" colSpan={7}>No payroll records yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
