import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Evening digest (7pm PKT = 14:00 UTC): each agency owner gets one email summarizing their day.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const db = createAdminClient();
  // Pakistan time (UTC+5) day window
  const pktNow = new Date(Date.now() + 5 * 3600000);
  const todayStr = pktNow.toISOString().slice(0, 10); // PKT calendar date for date columns
  const dayStart = new Date(todayStr + 'T00:00:00+05:00'); // PKT midnight as UTC instant
  const out = { agencies: 0, emails: 0, skipped: 0 };

  const { data: agencies } = await db.from('agencies')
    .select('id, name, email').in('subscription_status', ['active', 'trialing']);

  for (const a of agencies || []) {
    out.agencies++;
    const { data: owner } = await db.from('profiles').select('email')
      .eq('agency_id', a.id).eq('role', 'owner').maybeSingle();
    const to = (owner as any)?.email || a.email;
    if (!to) { out.skipped++; continue; }

    const salesTables = ['flight_sales', 'hotel_sales', 'visa_sales', 'transport_sales', 'package_sales'];
    let newCount = 0, newValue = 0, collected = 0, overdueCount = 0, overdueValue = 0, checkins = 0, checkouts = 0, departs = 0;

    for (const t of salesTables) {
      const { data: fresh } = await db.from(t).select('sale_price, amount_paid, created_at')
        .eq('agency_id', a.id).gte('created_at', dayStart.toISOString());
      for (const r of fresh || []) { newCount++; newValue += Number(r.sale_price || 0); collected += Number(r.amount_paid || 0); }
      const { data: paidToday } = await db.from(t).select('amount_paid')
        .eq('agency_id', a.id).gt('amount_paid', 0).lt('created_at', dayStart.toISOString())
        .gte('updated_at', dayStart.toISOString());
      for (const r of paidToday || []) collected += Number(r.amount_paid || 0);
      const { data: od } = await db.from(t).select('sale_price, amount_paid')
        .eq('agency_id', a.id).gt('balance', 0).lt('due_date', todayStr);
      for (const r of od || []) { overdueCount++; overdueValue += Number(r.sale_price || 0) - Number(r.amount_paid || 0); }
    }
    const [ci, co, dep] = await Promise.all([
      db.from('hotel_sales').select('id', { count: 'exact', head: true }).eq('agency_id', a.id).eq('check_in', todayStr),
      db.from('hotel_sales').select('id', { count: 'exact', head: true }).eq('agency_id', a.id).eq('check_out', todayStr),
      db.from('tour_departures').select('id', { count: 'exact', head: true }).eq('agency_id', a.id).eq('departure_date', todayStr),
    ]);
    checkins = ci?.count || 0; checkouts = co?.count || 0; departs = dep?.count || 0;

    if (!newCount && !collected && !overdueCount && !checkins && !checkouts && !departs) { out.skipped++; continue; }

    const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    const row = (label: string, val: string, warn = false) =>
      `<tr><td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:13px">${label}</td>
       <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:13px;font-weight:bold;${warn ? 'color:#dc2626' : 'color:#0f172a'}">${val}</td></tr>`;
    const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f4;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:22px 28px">
          <p style="margin:0;color:#b8923f;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:bold">Daily digest</p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:20px">Your day at ${a.name}</h1>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </td></tr>
        <tr><td style="padding:20px 28px"><table role="presentation" width="100%" style="border-collapse:collapse">
          ${row('New sales recorded today', `${newCount} · ${money(newValue)}`)}
          ${row('Payments recorded today', money(collected))}
          ${row('Overdue balances (past due date)', `${overdueCount} · ${money(overdueValue)}`, overdueCount > 0)}
          ${row('Hotel check-ins today', String(checkins))}
          ${row('Hotel check-outs today', String(checkouts))}
          ${row('Tour departures today', String(departs))}
        </table>
        <p style="margin:18px 0 0;font-size:12px;color:#94a3b8">This is your automated evening summary from EzUmrah CRM.</p></td></tr>
      </table></body></html>`;

    try {
      const { sendAgencyEmail } = await import('@/lib/email');
      await sendAgencyEmail(a.id, { to, subject: `Your day at ${a.name} — ${newCount} new sale${newCount === 1 ? '' : 's'}, ${money(collected)} collected`, html });
      out.emails++;
    } catch { out.skipped++; }
  }
  return NextResponse.json({ ...out, day: todayStr });
}
