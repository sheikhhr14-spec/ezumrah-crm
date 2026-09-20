import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function authAgency() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const db = createAdminClient();
  const { data: prof } = await db.from('profiles').select('id, agency_id').eq('id', user.id).single();
  return prof || null;
}

export async function departureData(depId: string, aid: string) {
  const db = createAdminClient();
  const { data: dep } = await db.from('tour_departures').select('id, departure_date, return_date, package_id')
    .eq('id', depId).eq('agency_id', aid).single();
  if (!dep) return null;
  const { data: pkg } = await db.from('tour_packages').select('name').eq('id', dep.package_id).single();
  (dep as any).pkgName = pkg?.name || 'Tour';
  const { data: hotels } = await db.from('tour_departure_hotels').select('*').eq('agency_id', aid).eq('departure_id', depId).order('created_at');
  const { data: pickups } = await db.from('tour_departure_pickups').select('*').eq('agency_id', aid).eq('departure_id', depId);
  const { data: bookings } = await db.from('tour_bookings').select('id, ref, group_name').eq('agency_id', aid).eq('departure_id', depId);
  const ids = (bookings || []).map((b: any) => b.id);
  let pax: any[] = [];
  if (ids.length) { const { data } = await db.from('tour_passengers').select('*').in('booking_id', ids).order('created_at'); pax = data || []; }
  const bkMap = new Map((bookings || []).map((b: any) => [b.id, b]));
  const pkMap = new Map((pickups || []).map((k: any) => [k.id, k]));
  return { db, dep, hotels: hotels || [], pickups: pickups || [], pax, bkMap, pkMap };
}

const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function toCsv(rows: (string | number | null | undefined)[][]) {
  return '\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}
export function htmlDoc(title: string, subtitle: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:18px;margin:0}h2{font-size:12px;color:#64748b;font-weight:normal;margin:4px 0 16px}
table{border-collapse:collapse;width:100%;font-size:12px}th{background:#1e293b;color:#fff;text-align:left;padding:6px 8px}td{border-bottom:1px solid #e2e8f0;padding:5px 8px}
@media print{button{display:none}}</style></head><body>
<h1>${title}</h1><h2>${subtitle}</h2>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
<button onclick="window.print()" style="margin-top:14px;padding:8px 16px;background:#1e293b;color:#fff;border:0;border-radius:6px;cursor:pointer">🖨 Print / Save as PDF</button>
</body></html>`;
}
