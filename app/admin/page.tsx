import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';
import Link from 'next/link';

const PLANS: Record<string, number> = { starter: 29, professional: 79, enterprise: 199 };

export default async function AdminDashboard() {
  const db = createAdminClient();

  const [agencies, profiles, bookings, invoices, tickets, announcements] = await Promise.all([
    db.from('agencies').select('*').order('created_at', { ascending: false }),
    db.from('profiles').select('id, role, agency_id', { count: 'exact', head: true }),
    db.from('bookings').select('id', { count: 'exact', head: true }),
    db.from('platform_invoices').select('amount, status, currency'),
    db.from('support_tickets').select('id, status, subject, created_at, agencies(name)').order('created_at', { ascending: false }).limit(5),
    db.from('announcements').select('id', { count: 'exact', head: true }),
  ]);

  const list = agencies.data || [];
  const active = list.filter((a) => a.subscription_status === 'active');
  const mrr = active.reduce((s: number, a: any) => s + (PLANS[a.plan] || 0), 0);
  const trialing = list.filter((a) => ['trialing', 'past_due', 'incomplete'].includes(a.subscription_status)).length;
  const openTickets = (tickets.data || []).filter((t: any) => t.status !== 'resolved').length;
  const collected = (invoices.data || []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0);

  const byPlan: Record<string, number> = {};
  for (const a of list) byPlan[a.plan] = (byPlan[a.plan] || 0) + 1;

  const stats = [
    { label: 'Total agencies', value: list.length },
    { label: 'Active subscriptions', value: active.length },
    { label: 'MRR', value: `$${mrr.toLocaleString()}` },
    { label: 'Platform users', value: profiles.count || 0 },
    { label: 'Total bookings', value: bookings.count || 0 },
    { label: 'Revenue collected', value: `$${collected.toLocaleString()}` },
    { label: 'Trialing / Past due', value: trialing },
    { label: 'Open tickets', value: openTickets },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="EzUmrah SaaS — platform-wide overview across all tenants" />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="stat-label">{s.label}</p>
            <p className="stat-num mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan distribution */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Plan distribution</h2>
          {list.length ? Object.entries(byPlan).map(([plan, count]) => (
            <div key={plan} className="mb-3">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold capitalize text-slate-700">{plan}</span>
                <span className="text-slate-400">{count} · {Math.round((count / list.length) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full accent-bg" style={{ width: `${(count / list.length) * 100}%` }} />
              </div>
            </div>
          )) : <Empty msg="No agencies yet." />}
        </div>

        {/* Recent support tickets */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Latest support tickets</h2>
            <Link href="/admin/support" className="accent text-xs font-semibold">View all →</Link>
          </div>
          {tickets.data?.length ? (
            <div className="space-y-3">
              {tickets.data.map((t: any) => (
                <Link key={t.id} href={`/admin/support/${t.id}`} className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{t.subject}</p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{t.agencies?.name} · {new Date(t.created_at).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          ) : <Empty msg="No support tickets." />}
        </div>
      </div>

      {/* Recent agencies */}
      <div className="card mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recent agencies</h2>
          <Link href="/admin/agencies" className="accent text-xs font-semibold">Manage agencies →</Link>
        </div>
        <Table head={['Agency', 'Plan', 'Status', 'Label', 'Joined']}>
          {list.length ? list.slice(0, 6).map((a: any) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/admin/agencies/${a.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                  {a.brand_color && <span className="h-3 w-3 rounded-full" style={{ background: a.brand_color }} />}
                  {a.name}
                </Link>
              </td>
              <td className="px-4 py-2 capitalize">{a.plan}</td>
              <td className="px-4 py-2"><StatusBadge status={a.subscription_status} /></td>
              <td className="px-4 py-2">{a.label ? <span className="badge accent-soft-bg accent">{a.label}</span> : '—'}</td>
              <td className="px-4 py-2 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
            </tr>
          )) : <tr><td colSpan={5}><Empty msg="No agencies signed up yet." /></td></tr>}
        </Table>
      </div>
    </div>
  );
}
