import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { PageHeader, Empty } from '@/components/ui';

function monthKey(d: string) { return d.slice(0, 7); }

export default async function ReportsPage() {
  const ctx = await requireModule('reports');
  const db = createAdminClient();
  const [bookings, invoices, customers, visas] = await Promise.all([
    db.from('bookings').select('id, created_at, status, trip_type, total_amount, departure_date, pilgrims_count').eq('agency_id', ctx.profile.agency_id),
    db.from('invoices').select('total, status, issue_date').eq('agency_id', ctx.profile.agency_id),
    db.from('customers').select('id, country, created_at').eq('agency_id', ctx.profile.agency_id),
    db.from('visas').select('id, status, visa_type').eq('agency_id', ctx.profile.agency_id),
  ]);

  const bList = bookings.data || [];
  const iList = invoices.data || [];
  const cList = customers.data || [];

  const revenue = iList.filter((i) => i.status === 'paid').reduce((s: number, i) => s + Number(i.total), 0);
  const outstanding = iList.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').reduce((s: number, i) => s + Number(i.total), 0);
  const pipeline = bList.filter((b) => b.status === 'pending').reduce((s: number, b) => s + Number(b.total_amount), 0);
  const pilgrims = bList.reduce((s: number, b) => s + (b.pilgrims_count || 0), 0);

  // upcoming 30 days departures
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const upcoming = bList.filter((b) => b.departure_date && new Date(b.departure_date) >= new Date() && new Date(b.departure_date) <= in30)
    .sort((a: any, b: any) => a.departure_date.localeCompare(b.departure_date));

  // bookings by month (6 months)
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  const byMonth = months.map((m) => bList.filter((b) => monthKey(b.created_at) === m).length);

  // trip type split
  const byTrip: Record<string, number> = {};
  for (const b of bList) byTrip[b.trip_type] = (byTrip[b.trip_type] || 0) + 1;

  // customers by country
  const byCountry = Object.entries(
    cList.reduce((acc: Record<string, number>, c) => {
      const k = c.country || 'Unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const kpis = [
    { label: 'Revenue collected', value: `$${revenue.toLocaleString()}` },
    { label: 'Outstanding', value: `$${outstanding.toLocaleString()}` },
    { label: 'Pipeline (pending)', value: `$${pipeline.toLocaleString()}` },
    { label: 'Total pilgrims', value: pilgrims },
  ];

  const maxMonth = Math.max(...byMonth, 1);

  return (
    <div>
      <PageHeader title="Reports" subtitle={`${ctx.agency.name} — operations & financial overview`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="stat-label">{k.label}</p>
            <p className="stat-num mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* bookings by month */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Bookings — last 6 months</h2>
          <div className="flex items-end justify-between gap-3" style={{ height: 120 }}>
            {byMonth.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-bold text-slate-600">{v || ''}</span>
                <div className="w-full rounded-t accent-bg" style={{ height: `${(v / maxMonth) * 80 + (v ? 6 : 2)}%`, opacity: v ? 1 : 0.15 }} />
                <span className="text-[10px] text-slate-400">{months[i].slice(5)}/{months[i].slice(2, 4)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* upcoming departures */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Departures — next 30 days</h2>
          {upcoming.length ? (
            <div className="space-y-2">
              {upcoming.slice(0, 8).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">{b.trip_type} · {b.pilgrims_count} pilgrims</p>
                    <p className="text-xs text-slate-400">${Number(b.total_amount).toLocaleString()}</p>
                  </div>
                  <span className="badge accent-soft-bg accent">{new Date(b.departure_date!).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : <Empty msg="No departures in the next 30 days." />}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* trip types */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Bookings by service type</h2>
          {bList.length ? Object.entries(byTrip).map(([t, n]) => (
            <div key={t} className="mb-3">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold capitalize text-slate-700">{t}</span>
                <span className="text-slate-400">{n} bookings</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full accent-bg" style={{ width: `${(n / bList.length) * 100}%` }} />
              </div>
            </div>
          )) : <Empty msg="No bookings yet." />}
        </div>

        {/* customers by country */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Top pilgrim countries</h2>
          {byCountry.length ? byCountry.map(([c, n]) => (
            <div key={c} className="mb-3">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-slate-700">{c}</span>
                <span className="text-slate-400">{n}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full accent-bg" style={{ width: `${(n / byCountry[0][1]) * 100}%` }} />
              </div>
            </div>
          )) : <Empty msg="No customers yet." />}
        </div>
      </div>

      {/* visa status summary */}
      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Visa pipeline</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {['applied', 'processing', 'issued', 'rejected'].map((s) => (
            <div key={s} className="rounded-lg border border-slate-100 p-4 text-center">
              <p className="stat-label capitalize">{s}</p>
              <p className="stat-num mt-1">{(visas.data || []).filter((v) => v.status === s).length}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
