import { requireModule } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui';
import Link from 'next/link';

type Ev = { cat: string; icon: string; cls: string; ref: string; name: string; detail: string; href: string };

const CATS = [
  { key: 'flight', label: 'Flights', icon: '✈️', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  { key: 'hotel', label: 'Hotels', icon: '🏨', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'transport', label: 'Transport', icon: '🚐', cls: 'border-slate-300 bg-slate-100 text-slate-700' },
  { key: 'ziyarat', label: 'Ziyarat', icon: '🕌', cls: 'border-teal-200 bg-teal-50 text-teal-700' },
  { key: 'tour', label: 'Tours', icon: '🌍', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'umrah', label: 'Umrah', icon: '🕋', cls: 'border-violet-200 bg-violet-50 text-violet-700' },
  { key: 'hajj', label: 'Hajj', icon: '🕋', cls: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' },
];

export default async function CalendarPage({ searchParams }: { searchParams?: { m?: string; cat?: string } }) {
  const ctx = await requireModule('calendar');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const now = new Date();
  const [y0, m0] = (searchParams?.m || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).split('-').map(Number);
  const y = y0 || now.getFullYear();
  const mo = m0 || now.getMonth() + 1;
  const cat = searchParams?.cat || 'all';
  const ok = (k: string) => cat === 'all' || cat === k;
  const d = (v: any) => (v ? String(v).slice(0, 10) : null);

  const [fl, flegs, hs, stays, tr, tlegs, pk, tb, tds] = await Promise.all([
    db.from('flight_sales').select('id, ref, customer_id, customers(full_name)').eq('agency_id', aid),
    db.from('flight_sale_legs').select('*').eq('agency_id', aid),
    db.from('hotel_sales').select('id, ref, hotel_name, city, check_in, check_out, customers(full_name)').eq('agency_id', aid),
    db.from('hotel_sale_stays').select('*').eq('agency_id', aid),
    db.from('transport_sales').select('id, ref, transport_type, from_location, to_location, transport_date, transport_time, return_date, customers(full_name)').eq('agency_id', aid),
    db.from('transport_sale_legs').select('*').eq('agency_id', aid),
    db.from('package_sales').select('id, ref, package_name, package_category, departure_date, return_date, ziyarat_date, ziyarat_scope, customers(full_name)').eq('agency_id', aid),
    db.from('tour_bookings').select('id, ref, group_name, contact_name, departure_id').eq('agency_id', aid),
    db.from('tour_departures').select('id, departure_date, return_date, package_id, tour_packages(name)').eq('agency_id', aid),
  ]);

  const ev: Record<string, Ev[]> = {};
  const push = (date: string | null, e: Ev) => { if (date) (ev[date] = ev[date] || []).push(e); };
  const cust = (r: any) => r?.customers?.full_name || '';

  // ✈️ flights — every leg is an event on its departure date
  const fsMap = new Map((fl?.data || []).map((r: any) => [r.id, r]));
  for (const l of flegs?.data || []) {
    const s: any = fsMap.get(l.flight_sale_id);
    if (!s || !ok('flight')) continue;
    push(d(l.depart_at), { cat: 'flight', icon: '✈️', ref: s.ref, name: cust(s),
      detail: `${String(l.depart_at || '').slice(11, 16)} ${l.from_airport || ''} → ${l.to_airport || ''}`,
      cls: CATS[0].cls, href: `/dashboard/flight-sales/${s.id}` });
  }
  // 🏨 hotels — check-in & check-out for main record and extra stays
  for (const h of hs?.data || []) {
    if (!ok('hotel')) continue;
    push(d(h.check_in), { cat: 'hotel', icon: '🏨', ref: h.ref, name: cust(h), detail: `in · ${h.hotel_name || 'Hotel'}${h.city ? `, ${h.city}` : ''}`, cls: CATS[1].cls, href: `/dashboard/hotel-sales/${h.id}` });
    push(d(h.check_out), { cat: 'hotel', icon: '🏨', ref: h.ref, name: cust(h), detail: `out · ${h.hotel_name || 'Hotel'}`, cls: CATS[1].cls, href: `/dashboard/hotel-sales/${h.id}` });
  }
  const hsMap = new Map((hs?.data || []).map((r: any) => [r.id, r]));
  for (const st of stays?.data || []) {
    const s: any = hsMap.get(st.hotel_sale_id);
    if (!s || !ok('hotel')) continue;
    push(d(st.check_in), { cat: 'hotel', icon: '🏨', ref: s.ref, name: cust(s), detail: `in · ${st.hotel_name || 'Hotel'}${st.city ? `, ${st.city}` : ''}`, cls: CATS[1].cls, href: `/dashboard/hotel-sales/${s.id}` });
    push(d(st.check_out), { cat: 'hotel', icon: '🏨', ref: s.ref, name: cust(s), detail: `out · ${st.hotel_name || 'Hotel'}`, cls: CATS[1].cls, href: `/dashboard/hotel-sales/${s.id}` });
  }
  // 🚐 transport + 🕌 ziyarah-type legs
  for (const t of tr?.data || []) {
    const isZ = String(t.transport_type || '').toLowerCase().includes('ziyar');
    const k = isZ ? 'ziyarat' : 'transport';
    if (!ok(k)) continue;
    const c = CATS.find((x) => x.key === k)!;
    push(d(t.transport_date), { cat: k, icon: c.icon, ref: t.ref, name: cust(t), detail: `${t.transport_time ? t.transport_time + ' ' : ''}${t.from_location || ''} → ${t.to_location || ''}`, cls: c.cls, href: `/dashboard/transport-sales/${t.id}` });
    if (t.return_date) push(d(t.return_date), { cat: k, icon: c.icon, ref: t.ref, name: cust(t), detail: `return · ${t.from_location || ''} → ${t.to_location || ''}`, cls: c.cls, href: `/dashboard/transport-sales/${t.id}` });
  }
  const trMap = new Map((tr?.data || []).map((r: any) => [r.id, r]));
  for (const l of tlegs?.data || []) {
    const s: any = trMap.get(l.transport_sale_id);
    if (!s) continue;
    const isZ = String(l.transport_type || s.transport_type || '').toLowerCase().includes('ziyar');
    const k = isZ ? 'ziyarat' : 'transport';
    if (!ok(k)) continue;
    const c = CATS.find((x) => x.key === k)!;
    push(d(l.transport_date), { cat: k, icon: c.icon, ref: s.ref, name: cust(s), detail: `${l.transport_time ? l.transport_time + ' ' : ''}${l.from_location || ''} → ${l.to_location || ''}`, cls: c.cls, href: `/dashboard/transport-sales/${s.id}` });
  }
  // 🕋 umrah / hajj packages + 🌍 tour packages
  for (const p of pk?.data || []) {
    const key = p.package_category === 'umrah' ? 'umrah' : p.package_category === 'hajj' ? 'hajj' : 'tour';
    if (!ok(key)) continue;
    const c = CATS.find((x) => x.key === key)!;
    const href = key === 'tour' ? '/dashboard/tour-sales/records' : `/dashboard/${key}-sales/${p.id}`;
    push(d(p.departure_date), { cat: key, icon: c.icon, ref: p.ref, name: cust(p), detail: `dep · ${p.package_name || ''}`, cls: c.cls, href });
    push(d(p.return_date), { cat: key, icon: c.icon, ref: p.ref, name: cust(p), detail: `return · ${p.package_name || ''}`, cls: c.cls, href });
    if (p.ziyarat_scope && p.ziyarat_scope !== 'none' && ok('ziyarat')) {
      push(d(p.ziyarat_date), { cat: 'ziyarat', icon: '🕌', ref: p.ref, name: cust(p), detail: `ziyarat · ${p.ziyarat_scope}`, cls: CATS[3].cls, href });
    }
  }
  // 🌍 tour bookings (new tour system)
  const depMap = new Map((tds?.data || []).map((r: any) => [r.id, r]));
  for (const b of tb?.data || []) {
    if (!ok('tour')) continue;
    const dp: any = depMap.get(b.departure_id) || {};
    push(d(dp.departure_date), { cat: 'tour', icon: '🌍', ref: b.ref, name: b.group_name || b.contact_name || '', detail: `dep · ${dp.tour_packages?.name || 'Tour'}`, cls: CATS[4].cls, href: `/dashboard/tour-sales/voucher/${b.id}` });
    push(d(dp.return_date), { cat: 'tour', icon: '🌍', ref: b.ref, name: b.group_name || b.contact_name || '', detail: `return · ${dp.tour_packages?.name || 'Tour'}`, cls: CATS[4].cls, href: `/dashboard/tour-sales/voucher/${b.id}` });
  }

  // month grid
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const monthName = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const pad = (n: number) => String(n).padStart(2, '0');
  const mk = (yy: number, mmm: number) => `${yy}-${pad(((mmm - 1 + 12) % 12) + 1)}`;
  const prev = mo === 1 ? mk(y - 1, 12) : mk(y, mo - 1);
  const next = mo === 12 ? mk(y + 1, 1) : mk(y, mo + 1);
  const qs = (m: string, c: string) => `?m=${m}${c === 'all' ? '' : `&cat=${c}`}`;
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const totalEvents = Object.values(ev).reduce((s, l) => s + l.length, 0);

  return (
    <div>
      <PageHeader title="Bookings Calendar" subtitle={`Every booking by date — flights, hotels, transport, ziyarat, tours, umrah & hajj. ${totalEvents} event(s) this month.`} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link className="btn-secondary" href={qs(prev, cat)}>←</Link>
          <span className="text-lg font-bold text-slate-900">{monthName}</span>
          <Link className="btn-secondary" href={qs(next, cat)}>→</Link>
          <Link className="btn-secondary" href={`?m=${now.getFullYear()}-${pad(now.getMonth() + 1)}${cat === 'all' ? '' : `&cat=${cat}`}`}>Today</Link>
        </div>
        <div className="flex flex-wrap gap-1">
          <Link href={`?m=${y}-${pad(mo)}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cat === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500'}`}>All</Link>
          {CATS.map((c) => (
            <Link key={c.key} href={`?m=${y}-${pad(mo)}&cat=${c.key}`}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cat === c.key ? 'border-slate-900 bg-slate-900 text-white' : c.cls}`}>{c.icon} {c.label}</Link>
          ))}
        </div>
      </div>
      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-bold uppercase text-slate-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => <div key={w} className="p-1.5">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const key = day ? `${y}-${pad(mo)}-${pad(day)}` : '';
            const evs = day ? ev[key] || [] : [];
            return (
              <div key={i} className={`min-h-[96px] border-b border-r border-slate-200 p-1 align-top ${day ? '' : 'bg-slate-50/60'} ${key === todayKey ? 'bg-amber-50/50' : ''}`}>
                {day && (
                  <>
                    <p className={`mb-0.5 flex h-5 w-5 items-center justify-center text-[11px] font-bold ${key === todayKey ? 'rounded-full bg-slate-900 text-white' : 'text-slate-400'}`}>{day}</p>
                    {evs.slice(0, 3).map((e, j) => (
                      <Link key={j} href={e.href} title={`${e.ref} — ${e.name} · ${e.detail}`}
                        className={`mb-0.5 block rounded border px-1 py-0.5 text-[10px] leading-tight hover:opacity-80 ${e.cls}`}>
                        <span className="block truncate font-bold">{e.icon} {e.ref}</span>
                        <span className="block truncate opacity-80">{e.name || e.detail}</span>
                      </Link>
                    ))}
                    {evs.length > 3 && <p className="text-[10px] font-semibold text-slate-400">+{evs.length - 3} more</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Click any booking to open it. Use the category chips to filter — flights show departure time and route, hotels show check-in/out, transport and ziyarat show the route and time, packages show departure and return dates.</p>
    </div>
  );
}
