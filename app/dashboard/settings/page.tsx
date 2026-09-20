import { requireModule, requireActiveAgency } from '@/lib/data';
import { updateAgencySettings, uploadAgencyAsset } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, StatusBadge } from '@/components/ui';
import SubmitButton from '@/components/submit-button';
import CountryRegionPicker from '@/components/country-region-picker';


const L = ({ label, name, def, type = 'text', ph = '' }: any) => (
  <label className="block"><span className="text-xs font-semibold text-slate-600">{label}</span>
    <input className="input" name={name} defaultValue={def ?? ''} type={type} placeholder={ph} /></label>
);

export default async function SettingsPage() {
  await requireModule('settings');
  const ctx = await requireActiveAgency();
  const a: any = ctx.profile.agencies || {};
  return (
    <div>
      <PageHeader title="Settings" subtitle="Your agency profile, branding, email (SMTP) and preferences." />
      <div className="card mb-6 p-5">
        <h2 className="mb-1 text-lg font-semibold">🏢 Agency profile & branding</h2>
        <p className="mb-4 text-xs text-slate-400">Your logo and brand color appear on invoices, quotations and salary slips. Country sets your currency & timezone across the whole system.</p>
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
            <CountryRegionPicker country={a.country} currency={a.currency || 'USD'} timezone={a.timezone || 'UTC'} />
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

    </div>
  );
}
