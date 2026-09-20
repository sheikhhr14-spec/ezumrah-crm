import { requireModule, requireActiveAgency } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { markSaasInvoicePaid } from '@/lib/crm-actions';
import { PageHeader, Table, Empty, StatusBadge } from '@/components/ui';

const PLAN_PRICE: Record<string, number> = { starter: 29, professional: 79, enterprise: 199 };

export default async function BillingPage() {
  await requireModule('billing');
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const a: any = ctx.profile.agencies || {};
  const db = createAdminClient();

  // auto-issue this month's SaaS invoice if missing (agencies are billed monthly)
  const period = new Date().toISOString().slice(0, 7);
  const { data: existing } = await db.from('saas_invoices').select('id')
    .eq('agency_id', aid).eq('period', period).maybeSingle();
  if (!existing) {
    const { count } = await db.from('saas_invoices').select('id', { count: 'exact', head: true }).eq('agency_id', aid);
    const plan = (a.plan || 'starter').toLowerCase();
    await db.from('saas_invoices').insert({
      agency_id: aid,
      invoice_no: `EZ-${period.replace('-', '')}-${String((count || 0) + 1).padStart(3, '0')}`,
      period, plan,
      amount: PLAN_PRICE[plan] ?? 29,
      status: 'unpaid',
      due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().slice(0, 10),
    });
  }
  const { data: invoices } = await db.from('saas_invoices').select('*')
    .eq('agency_id', aid).order('period', { ascending: false });

  const plan = (a.plan || 'starter').toLowerCase();
  return (
    <div>
      <PageHeader title="Billing" subtitle="Your EzUmrah CRM subscription — billed monthly by EzTechify." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Current plan</p>
          <p className="mt-1 text-2xl font-bold capitalize">{plan}</p>
          <p className="text-xs text-slate-400">${PLAN_PRICE[plan] ?? 29}/month · {a.subscription_status || 'active'}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Renews / renews check</p>
          <p className="mt-1 text-2xl font-bold">{a.current_period_end ? new Date(a.current_period_end).toLocaleDateString() : '—'}</p>
          <p className="text-xs text-slate-400">Cancel or upgrade anytime — contact EzTechify support.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Billed to</p>
          <p className="mt-1 text-lg font-bold">{a.name}</p>
          <p className="text-xs text-slate-400">{a.contact_email || 'Set contact email in Settings'}</p>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="mb-3 px-4 pt-2 text-sm font-bold uppercase tracking-wide text-slate-500">Subscription invoices — EzUmrah CRM by EzTechify</h2>
        <Table head={['Invoice no.', 'Period', 'Plan', 'Amount', 'Due date', 'Status', 'Invoice', '']}>
          {(invoices || []).length ? (invoices as any[]).map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold">{r.invoice_no}</td>
              <td className="px-4 py-2">{r.period}</td>
              <td className="px-4 py-2 capitalize">{r.plan}</td>
              <td className="px-4 py-2 font-semibold">${Number(r.amount).toFixed(2)}</td>
              <td className="px-4 py-2">{r.due_date || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-2">
                <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=saas&id=${r.id}`}>Download PDF</a>
              </td>
              <td className="px-4 py-2">
                {r.status === 'unpaid' && (
                  <form action={markSaasInvoicePaid}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs font-semibold text-emerald-600 hover:underline" type="submit">Mark paid</button>
                  </form>
                )}
              </td>
            </tr>
          )) : <Empty msg="No invoices yet." />}
        </Table>
      </div>
    </div>
  );
}
