import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, StatusBadge, Empty } from '@/components/ui';
import Link from 'next/link';

const PRIO: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-50 text-amber-600', urgent: 'bg-red-50 text-red-600',
};

export default async function SupportPage({ searchParams }: { searchParams: { status?: string } }) {
  const db = createAdminClient();
  const { data: tickets } = await db.from('support_tickets')
    .select('*, agencies(name), profiles(full_name, email)')
    .order('created_at', { ascending: false });

  const status = searchParams?.status || '';
  const list = (tickets || []).filter((t: any) => !status || t.status === status);
  const counts = {
    open: (tickets || []).filter((t: any) => t.status === 'open').length,
    pending: (tickets || []).filter((t: any) => t.status === 'pending').length,
    resolved: (tickets || []).filter((t: any) => t.status === 'resolved').length,
  };

  return (
    <div>
      <PageHeader title="Support Tickets" subtitle="Tenant support requests across the platform" />

      <div className="mb-4 flex gap-2 text-xs">
        <Link href="/admin/support" className={`badge ${!status ? 'accent-soft-bg accent' : 'bg-slate-100 text-slate-500'}`}>All ({tickets?.length || 0})</Link>
        {['open', 'pending', 'resolved'].map((s) => (
          <Link key={s} href={`/admin/support?status=${s}`}
            className={`badge ${status === s ? 'accent-soft-bg accent' : 'bg-slate-100 text-slate-500'}`}>
            {s} ({(counts as any)[s]})
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {list.length ? list.map((t: any) => (
          <Link key={t.id} href={`/admin/support/${t.id}`} className="card block p-5 hover:bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`badge ${PRIO[t.priority] || PRIO.normal}`}>{t.priority}</span>
                <h3 className="font-bold text-slate-900">{t.subject}</h3>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-slate-500">{t.message}</p>
            <p className="mt-2 text-xs text-slate-400">
              {t.agencies?.name} · {t.profiles?.full_name || t.profiles?.email || '—'} · {new Date(t.created_at).toLocaleString()}
            </p>
          </Link>
        )) : <Empty msg="No tickets. Tenants can raise tickets from their CRM → Support." />}
      </div>
    </div>
  );
}
