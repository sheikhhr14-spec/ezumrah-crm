import { createAdminClient } from '@/lib/supabase/admin';
import { setAgencyStatus, setAgencyPlan } from '@/lib/admin-actions';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';
import Link from 'next/link';

const PLANS: Record<string, number> = { starter: 29, professional: 79, enterprise: 199 };

export default async function SubscriptionsPage({ searchParams }: { searchParams: { status?: string } }) {
  const db = createAdminClient();
  const { data: agencies } = await db.from('agencies').select('*').order('name');
  const status = searchParams?.status || '';
  const list = (agencies || []).filter((a: any) => !status || a.subscription_status === status);
  const statuses = ['active', 'trialing', 'past_due', 'canceled', 'suspended'];
  const mrr = (agencies || []).filter((a: any) => a.subscription_status === 'active').reduce((s: number, a: any) => s + (PLANS[a.plan] || 0), 0);

  return (
    <div>
      <PageHeader title="Subscriptions & Access" subtitle={`Control which tenants can use the CRM · MRR $${mrr.toLocaleString()}`} />

      <div className="mb-4 flex gap-2 text-xs">
        <Link href="/admin/subscriptions" className={`badge ${!status ? 'accent-soft-bg accent' : 'bg-slate-100 text-slate-500'}`}>All ({agencies?.length || 0})</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/subscriptions?status=${s}`}
            className={`badge ${status === s ? 'accent-soft-bg accent' : 'bg-slate-100 text-slate-500'}`}>
            {s.replace('_', ' ')} ({(agencies || []).filter((a: any) => a.subscription_status === s).length})
          </Link>
        ))}
      </div>

      <Table head={['Agency', 'Plan', 'Price', 'Status', 'Trial ends', 'Change plan', 'Grant / revoke access']}>
        {list.length ? list.map((a: any) => (
          <tr key={a.id} className="hover:bg-slate-50">
            <td className="px-4 py-2">
              <Link href={`/admin/agencies/${a.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                {a.brand_color && <span className="h-3 w-3 rounded-full" style={{ background: a.brand_color }} />}
                {a.name}
              </Link>
            </td>
            <td className="px-4 py-2 capitalize">{a.plan}</td>
            <td className="px-4 py-2">${PLANS[a.plan] || 0}/mo</td>
            <td className="px-4 py-2"><StatusBadge status={a.subscription_status} /></td>
            <td className="px-4 py-2 text-slate-400">{a.trial_ends_at ? new Date(a.trial_ends_at).toLocaleDateString() : '—'}</td>
            <td className="px-4 py-2">
              <form action={setAgencyPlan}>
                <input type="hidden" name="id" value={a.id} />
                <select name="plan" defaultValue={a.plan} className="input max-w-36">
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <button className="btn-secondary ml-2 text-xs" type="submit">Set</button>
              </form>
            </td>
            <td className="px-4 py-2">
              <form action={setAgencyStatus}>
                <input type="hidden" name="id" value={a.id} />
                <select name="status" defaultValue={a.subscription_status} className="input max-w-32">
                  {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <button className="btn-secondary ml-2 text-xs" type="submit">Apply</button>
              </form>
            </td>
          </tr>
        )) : <tr><td colSpan={7}><Empty msg="No agencies match." /></td></tr>}
      </Table>
      <p className="mt-3 text-xs text-slate-400">Only <b>active</b> and <b>trialing</b> tenants can access their CRM. Suspended / canceled / past-due tenants are locked out at the door.</p>
    </div>
  );
}
