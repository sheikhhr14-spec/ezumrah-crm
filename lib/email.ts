import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getAgencyMailer(agencyId: string) {
  const db = createAdminClient();
  const { data: a } = await db.from('agencies')
    .select('id, name, email, logo_url, currency, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_name, smtp_from_email')
    .eq('id', agencyId).single();
  if (!a) throw new Error('Agency not found.');
  if (!a.smtp_host || !a.smtp_user) throw new Error('SMTP email is not configured — set it in Settings → Email configuration.');
  const port = Number(a.smtp_port || 587);
  const transport = nodemailer.createTransport({
    host: a.smtp_host, port,
    secure: port === 465,
    auth: { user: a.smtp_user, pass: a.smtp_password || '' },
  });
  const from = `"${a.smtp_from_name || a.name}" <${a.smtp_from_email || a.smtp_user}>`;
  return { transport, from, agency: a };
}

export async function sendAgencyEmail(agencyId: string, opts: { to?: string; subject: string; html: string }) {
  const mailer = await getAgencyMailer(agencyId);
  const to = opts.to || mailer.agency.email;
  if (!to) throw new Error('No recipient email address found.');
  await mailer.transport.sendMail({ from: mailer.from, to, subject: opts.subject, html: opts.html });
}

export function invoiceHtml(o: { title: string; ref: string; agencyName: string; agencyLogo?: string | null; meta: string; rows: [string, string][]; lines: string[]; totals: [string, string][]; note?: string }) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f4;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
  <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <tr><td style="background:#0f172a;padding:20px 28px">
      ${o.agencyLogo ? `<img src="${o.agencyLogo}" alt="" height="40" style="border-radius:8px"/>` : ''}
      <p style="margin:${o.agencyLogo ? '10px' : '0'} 0 0;color:#f4f1e8;font-size:15px;font-weight:bold">${o.agencyName}</p>
    </td></tr>
    <tr><td style="padding:24px 28px">
      <p style="margin:0;color:#b8923f;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">${o.title}</p>
      <h2 style="margin:6px 0 2px;font-size:20px">${o.ref}</h2>
      <p style="margin:0 0 16px;font-size:12px;color:#64748b">${o.meta}</p>
      ${o.lines.length ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:14px">
        ${o.lines.map((l, i) => `<tr><td style="padding:8px 10px;background:${i % 2 ? '#fafaf8' : '#fff'};border-left:3px solid #b8923f;font-size:12px">${l}</td></tr>`).join('')}
      </table>` : ''}
      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:12px;margin-bottom:16px">
        ${o.rows.map((r) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#64748b">${r[0]}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${r[1]}</td></tr>`).join('')}
      </table>
      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px">
        ${o.totals.map((t) => `<tr><td style="padding:7px 8px;color:#64748b">${t[0]}</td><td style="padding:7px 8px;text-align:right;font-weight:bold">${t[1]}</td></tr>`).join('')}
      </table>
      ${o.note ? `<p style="margin:18px 0 0;font-size:11px;color:#94a3b8">${o.note}</p>` : ''}
    </td></tr>
    <tr><td style="padding:14px 28px;background:#fafaf8;border-top:1px solid #eee;font-size:11px;color:#94a3b8;text-align:center">
      Sent by ${o.agencyName} via EzUmrah CRM
    </td></tr>
  </table></body></html>`;
}
