import { requireModule, requireActiveAgency } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateAgencySettings, uploadAgencyAsset } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, StatusBadge } from '@/components/ui';
import SubmitButton from '@/components/submit-button';

const PLAN_PRICE: Record<string, number> = { starter: 29, professional: 79, enterprise: 199 };

const L = ({ label, name, def, type = 'text', ph = '' }: any) => (
  <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
    <input className="input" name={name} defaultValue={def ?? ''} type={type} placeholder={ph} /></label>
);

export default async function SettingsPage() {
  await requireModule('settings');
  const ctx = await requireActiveAgency();
  const a: any = ctx.profile.agencies || {};
  const aid = ctx.profile.agency_id!;
  const db = createAdminClient();
  const period = new Date().toISOString().slice(0, 7);
  const { data: existing } = await db.from('saas_invoices').select('id')
    .eq('agency_id', aid).eq('period', period).maybeSingle();
  if (!existing) {
    const { count } = await db.from('saas_invoices').select('id', { count: 'exact', head: true }).eq('agency_id', aid);
    const plan = (a.plan || 'starter').toLowerCase();
    await db.from('saas_invoices').insert({
      agency_id: aid,
      invoice_no: `EZ-${period.replace('-', '')}-${String((count || 0) + 1).padStart(3, '0')}`,
      period, plan, amount: PLAN_PRICE[plan] ?? 29, status: 'unpaid',
      due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().slice(0, 10),
    });
  }
  const { data: invoices } = await db.from('saas_invoices').select('*')
    .eq('agency_id', aid).order('period', { ascending: false });
  const plan = (a.plan || 'starter').toLowerCase();
  return (
    <div>
      <PageHeader title="Settings" subtitle="Your agency profile, branding, email (SMTP) and preferences." />
      <div className="card mb-6 p-5">
        <h2 className="mb-1 text-lg font-semibold">🏢 Agency profile & branding</h2>
        <p className="mb-4 text-xs text-slate-400">Your logo and brand color appear on invoices, quotations and salary slips.</p>
        <div className="mb-6 flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-2xl">
            {a.logo_url ? <img src={a.logo_url} alt="logo" className="h-full w-full object-cover" /> : '🏢'}
          </div>
          <div className="space-y-2">
            <form action={uploadAgencyAsset} className="flex items-center gap-3">
              <input type="hidden" name="kind" value="logo" />
              <input type="file" name="file" accept="image/jpeg,image/png,image/jpg" className="text-xs" required />
              <SubmitButton pendingText="Uploading…" className="btn-secondary px-3 py-1.5 text-xs">Upload logo</SubmitButton>
            </form>
            {a.logo_url && (
              <form action={updateAgencySettings}>
                <input type="hidden" name="remove_logo" value="true" />
                <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Remove logo</button>
              </form>
            )}
          </div>
        </div>
        <form action={updateAgencySettings} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <L label="Agency name" name="name" def={a.name} />
            <label className="block"><span className="text-xs font-semibold text-slate-600">Brand color (accent)</span>
              <input className="input h-10" name="brand_color" type="color" defaultValue={a.brand_color || '#b8923f'} /></label>
            <L label="Website" name="website" def={a.website} ph="https://" />
            <L label="Contact email" name="contact_email" def={a.contact_email} />
            <L label="Contact phone" name="contact_phone" def={a.contact_phone} />
          </div>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Address</span>
            <input className="input" name="address" defaultValue={a.address || ''} placeholder="Office address shown on documents" /></label>
          <SubmitButton pendingText="Saving…">Save agency settings</SubmitButton>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">📧 Email (SMTP)</h2>
        <p className="mb-4 text-xs text-slate-400">Used when the system sends emails on your behalf (invoices, payment reminders). Contact your email provider for these credentials.</p>
        <form action={updateAgencySettings} className="grid gap-4 sm:grid-cols-3">
          <L label="SMTP host" name="smtp_host" def={a.smtp_host} ph="smtp.hostinger.com" />
          <L label="Port" name="smtp_port" def={a.smtp_port || 587} type="number" />
          <label className="block"><span className="text-xs font-semibold text-slate-600">Encryption</span>
            <select className="input" name="smtp_secure" defaultValue={a.smtp_secure === false ? 'false' : 'true'}>
              <option value="true">SSL/TLS</option><option value="false">Start TLS / none</option>
            </select></label>
          <L label="SMTP username" name="smtp_user" def={a.smtp_user} />
          <L label="SMTP password" name="smtp_password" def={a.smtp_password} type="password" />
          <div />
          <L label="From name" name="smtp_from_name" def={a.smtp_from_name} ph={a.name || 'Agency name'} />
          <L label="From email" name="smtp_from_email" def={a.smtp_from_email} ph="bookings@yourdomain.com" />
          <div className="flex items-end"><SubmitButton pendingText="Saving…" className="btn-primary">Save SMTP settings</SubmitButton></div>
        </form>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-1 text-lg font-semibold">💳 Subscription & billing</h2>
        <p className="mb-4 text-xs text-slate-400">Your EzUmrah CRM subscription, billed monthly by EzTechify. Payments are verified by the EzUmrah admin team{` — online payment arrives with Stripe setup`}.</p>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Plan</p>
            <p className="mt-1 text-xl font-bold capitalize">{plan}</p>
            <p className="text-xs text-slate-400">${PLAN_PRICE[plan] ?? 29}/month · {a.subscription_status || 'active'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Renews on</p>
            <p className="mt-1 text-xl font-bold">{a.current_period_end ? new Date(a.current_period_end).toLocaleDateString() : '—'}</p>
            <p className="text-xs text-slate-400">To upgrade, contact EzTechify support.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Billed to</p>
            <p className="mt-1 text-xl font-bold">{a.name}</p>
            <p className="text-xs text-slate-400">{a.contact_email || 'Set contact email above'}</p>
          </div>
        </div>
        <Table head={['Invoice no.', 'Period', 'Plan', 'Amount', 'Due date', 'Status', 'Invoice']}>
          {(invoices || []).length ? (invoices as any[]).map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold">{r.invoice_no}</td>
              <td className="px-4 py-2">{r.period}</td>
              <td className="px-4 py-2 capitalize">{r.plan}</td>
              <td className="px-4 py-2 font-semibold">${Number(r.amount).toFixed(2)}</td>
              <td className="px-4 py-2">{r.due_date || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-2"><a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=saas&id=${r.id}`}>Download PDF</a></td>
            </tr>
          )) : <Empty msg="No invoices yet." />}
        </Table>
      </div>
    </div>
  );
}
