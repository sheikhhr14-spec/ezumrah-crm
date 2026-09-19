import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';
import Link from 'next/link';

export default async function AdminOverview() {
  const db = createAdminClient();
  const [agencies, profiles, bookings] = await Promise.all([
    db.from('agencies').select('*').order('created_at', { ascending: false }),
    db.from('profiles').select('id, agency_id, role'),
    db.from('bookings').select('agency_id, trip_type'),
  ]);

  const all = agencies.data || [];
  const active = all.filter((a) => a.subscription_status === 'active');
  const PLAN_PRICE: Record<string, number> = { starter: 29, professional: 79, enterprise: 199 };
  const mrr = active.reduce((s, a) => s + (PLAN_PRICE[a.plan] || 0), 0);
  const byStatus = all.reduce((acc: Record<string, number>, a) => { acc[a.subscription_status] = (acc[a.subscription_status] || 0) + 1; return acc; }, {});
  const byPlan = all.reduce((acc: Record<string, number>, a) => { acc[a.plan] = (acc[a.plan] || 0) + 1; return acc; }, {});

  const stats = [
    { label: 'Total agencies', value: all.length },
    { label: 'Active subscriptions', value: byStatus['active'] || 0 },
    { label: 'MRR', value: `$${mrr.toLocaleString()}` },
    { label: 'Platform users', value: profiles.data?.length || 0 },
    { label: 'Total bookings', value: bookings.data?.length || 0 },
    { label: 'Trialing / Incomplete', value: (byStatus['trialing'] || 0) + (byStatus['incomplete'] || 0) },
  ];

  return (
    <div>
      <PageHeader title="Platform Overview" subtitle="EzUmrah SaaS — all tenants" />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Subscription status</h2>
          {Object.keys(byStatus).length ? Object.entries(byStatus).map(([s, n]) => (
            <div key={s} className="mb-2 flex items-center justify-between text-sm">
              <StatusBadge status={s} /> <span className="font-semibold">{n}</span>
            </div>
          )) : <p className="text-sm text-slate-400">No agencies yet.</p>}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Plan distribution</h2>
          {Object.keys(byPlan).length ? Object.entries(byPlan).map(([p, n]) => (
            <div key={p} className="mb-2 flex items-center justify-between text-sm">
              <span className="capitalize font-medium">{p}</span> <span className="font-semibold">{n}</span>
            </div>
          )) : <p className="text-sm text-slate-400">No agencies yet.</p>}
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Recent agencies</h2>
      <Table head={['Agency', 'Plan', 'Status', 'Users', 'Bookings', 'Joined', '']}>
        {all.length ? all.slice(0, 10).map((a) => (
          <tr key={a.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{a.name}</td>
            <td className="px-4 py-2 capitalize">{a.plan}</td>
            <td className="px-4 py-2"><StatusBadge status={a.subscription_status} /></td>
            <td className="px-4 py-2">{profiles.data?.filter((p) => p.agency_id === a.id).length || 0}</td>
            <td className="px-4 py-2">{bookings.data?.filter((b) => b.agency_id === a.id).length || 0}</td>
            <td className="px-4 py-2">{new Date(a.created_at).toLocaleDateString()}</td>
            <td className="px-4 py-2"><Link className="font-semibold text-gold hover:underline" href={`/admin/agencies/${a.id}`}>Manage →</Link></td>
          </tr>
        )) : <Empty msg="No agencies signed up yet." />}
      </Table>
    </div>
  );
}
