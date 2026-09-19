import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, Empty } from '@/components/ui';
import Link from 'next/link';

const PLANS: Record<string, number> = { starter: 29, professional: 79, enterprise: 199 };

function monthKey(d: string) { return d.slice(0, 7); }

export default async function ReportsPage() {
  const db = createAdminClient();
  const [agencies, profiles, bookings, invoices] = await Promise.all([
    db.from('agencies').select('*'),
    db.from('profiles').select('id, created_at'),
    db.from('bookings').select('id, created_at, agency_id, status, total_price'),
    db.from('platform_invoices').select('amount, status, paid_at, agency_id'),
  ]);

  const agencyList = agencies.data || [];
  const active = agencyList.filter((a: any) => a.subscription_status === 'active');
  const mrr = active.reduce((s: number, a: any) => s + (PLANS[a.plan] || 0), 0);
  const saasCollected = (invoices.data || []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const gmvs = (bookings.data || []).filter((b: any) => b.status === 'confirmed').reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);

  // monthly buckets (last 6 months)
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }

  const signupsByMonth = months.map((m) => agencyList.filter((a: any) => monthKey(a.created_at) === m).length);
  const bookingsByMonth = months.map((m) => (bookings.data || []).filter((b: any) => monthKey(b.created_at) === m).length);
  const usersByMonth = months.map((m) => (profiles.data || []).filter((p: any) => monthKey(p.created_at) === m).length);

  const nameById = Object.fromEntries(agencyList.map((a: any) => [a.id, a.name]));
  const bookingsByAgency = Object.entries(
    (bookings.data || []).reduce((acc: Record<string, number>, b: any) => {
      if (b.agency_id) acc[b.agency_id] = (acc[b.agency_id] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const topKpis = [
    { label: 'MRR (active plans)', value: `$${mrr.toLocaleString()}` },
    { label: 'ARR (projected)', value: `$${(mrr * 12).toLocaleString()}` },
    { label: 'SaaS revenue collected', value: `$${saasCollected.toLocaleString()}` },
    { label: 'Platform GMV (confirmed bookings)', value: `$${gmvs.toLocaleString()}` },
  ];

  const barRow = (title: string, data: number[]) => {
    const max = Math.max(...data, 1);
    return (
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-900">{title}</h2>
        <div className="flex items-end justify-between gap-3" style={{ height: 120 }}>
          {data.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-bold text-slate-600">{v || ''}</span>
              <div className="w-full rounded-t accent-bg" style={{ height: `${(v / max) * 80 + (v ? 6 : 2)}%`, opacity: v ? 1 : 0.15 }} />
              <span className="text-[10px] text-slate-400">{months[i].slice(5)}/{months[i].slice(2, 4)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Platform growth, revenue, and tenant activity" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topKpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="stat-label">{k.label}</p>
            <p className="stat-num mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {barRow('Agency signups by month', signupsByMonth)}
        {barRow('Bookings by month (all tenants)', bookingsByMonth)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {barRow('New users by month', usersByMonth)}

        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Top agencies by bookings</h2>
          {bookingsByAgency.length ? bookingsByAgency.map(([id, count], i) => (
            <div key={id} className="mb-3">
              <div className="mb-1 flex justify-between text-xs">
                <Link href={`/admin/agencies/${id}`} className="font-semibold text-slate-700 hover:underline">{nameById[id] || '—'}</Link>
                <span className="text-slate-400">{count} bookings</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full accent-bg" style={{ width: `${(count / bookingsByAgency[0][1]) * 100}%` }} />
              </div>
            </div>
          )) : <Empty msg="No booking activity yet." />}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Tenant table (snapshot)</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2">Agency</th><th className="py-2">Plan</th><th className="py-2">Status</th><th className="py-2">Bookings</th><th className="py-2">SaaS paid</th>
          </tr></thead>
          <tbody>
            {agencyList.map((a: any) => {
              const bCount = (bookings.data || []).filter((b: any) => b.agency_id === a.id).length;
              const paid = (invoices.data || []).filter((i: any) => i.agency_id === a.id && i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0);
              return (
                <tr key={a.id} className="border-b border-slate-50">
                  <td className="py-2 font-semibold"><Link className="hover:underline" href={`/admin/agencies/${a.id}`}>{a.name}</Link></td>
                  <td className="py-2 capitalize">{a.plan}</td>
                  <td className="py-2">{a.subscription_status}</td>
                  <td className="py-2">{bCount}</td>
                  <td className="py-2">${paid.toLocaleString()}</td>
                </tr>
              );
            })}
            {!agencyList.length && <tr><td colSpan={5}><Empty msg="No agencies yet." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
