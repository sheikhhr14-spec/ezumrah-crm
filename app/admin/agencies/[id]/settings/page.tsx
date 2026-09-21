import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperadmin } from '@/lib/data';
import { updateAgencySettingsAdmin } from '@/lib/admin-actions';
import { PageHeader, Field } from '@/components/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AdminAgencySettings({ params }: { params: { id: string } }) {
  await requireSuperadmin();
  const db = createAdminClient();
  const { data: a } = await db.from('agencies').select('*').eq('id', params.id).single();
  if (!a) notFound();
  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href={`/admin/agencies/${a.id}`}>← {a.name}</Link>
      <PageHeader title="Agency settings" subtitle="Edit this tenant's branding, regional settings and email configuration — same fields as their own Settings page." />
      <form action={updateAgencySettingsAdmin} className="space-y-6">
        <input type="hidden" name="id" value={a.id} />
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Branding & contact</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Agency name"><input className="input" name="name" defaultValue={a.name || ''} /></Field>
            <Field label="Label (internal tag)"><input className="input" name="label" defaultValue={a.label || ''} placeholder="VIP / reseller" /></Field>
            <Field label="Brand color"><input className="input" name="brand_color" type="color" defaultValue={a.brand_color || '#b8923f'} /></Field>
            <Field label="Website"><input className="input" name="website" defaultValue={a.website || ''} placeholder="https://" /></Field>
            <Field label="Contact email"><input className="input" name="contact_email" defaultValue={a.contact_email || ''} /></Field>
            <Field label="Contact phone"><input className="input" name="contact_phone" defaultValue={a.contact_phone || ''} /></Field>
            <div className="sm:col-span-3"><Field label="Address"><input className="input" name="address" defaultValue={a.address || ''} /></Field></div>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Regional</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Country"><input className="input" name="country" defaultValue={a.country || ''} placeholder="Saudi Arabia" /></Field>
            <Field label="Currency"><input className="input" name="currency" defaultValue={a.currency || 'SAR'} placeholder="SAR / USD / PKR" /></Field>
            <Field label="Timezone"><input className="input" name="timezone" defaultValue={a.timezone || 'Asia/Riyadh'} /></Field>
            <Field label="Tax / VAT no."><input className="input" name="tax_no" defaultValue={a.tax_no || ''} /></Field>
            <Field label="Default tax rate (%)"><input className="input" name="tax_rate" type="number" step="0.01" defaultValue={a.tax_rate ?? 0} /></Field>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="mb-1 text-sm font-bold text-slate-900">Email (SMTP) — used for their customer invoice emails</h2>
          <p className="mb-4 text-xs text-slate-400">If empty, emails for this agency fall back to the platform SMTP you configure in Admin → Settings.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="SMTP host"><input className="input" name="smtp_host" defaultValue={a.smtp_host || ''} placeholder="smtp.hostinger.com" /></Field>
            <Field label="Port"><input className="input" name="smtp_port" type="number" defaultValue={a.smtp_port || 587} /></Field>
            <Field label="Secure"><select className="input" name="smtp_secure" defaultValue={String(a.smtp_secure !== false)}><option value="true">true</option><option value="false">false</option></select></Field>
            <Field label="SMTP username"><input className="input" name="smtp_user" defaultValue={a.smtp_user || ''} /></Field>
            <Field label="SMTP password"><input className="input" name="smtp_password" type="password" defaultValue={a.smtp_password || ''} /></Field>
            <Field label="From name"><input className="input" name="smtp_from_name" defaultValue={a.smtp_from_name || ''} placeholder={a.name || 'Agency name'} /></Field>
            <Field label="From email"><input className="input" name="smtp_from_email" defaultValue={a.smtp_from_email || ''} placeholder="bookings@agency.com" /></Field>
          </div>
        </div>
        <div className="card flex flex-wrap items-center gap-4 p-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="staff_privacy" defaultChecked={!!a.staff_privacy} /> Hide financial data from staff
          </label>
          <button className="btn-primary" type="submit">Save agency settings</button>
        </div>
      </form>
    </div>
  );
}
