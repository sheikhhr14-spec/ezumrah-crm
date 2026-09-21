import { requireSuperadmin } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { markInvoicePaid, voidInvoice, emailPlatformInvoice } from '@/lib/admin-actions';
import PrintButton from '@/components/print-button';
import { StatusBadge } from '@/components/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AdminInvoiceDetail({ params, searchParams }: { params: { id: string }; searchParams?: { emailed?: string } }) {
  await requireSuperadmin();
  const db = createAdminClient();
  const { data: inv } = await db.from('platform_invoices')
    .select('*, agencies(name, email, address, logo_url, label)').eq('id', params.id).single();
  if (!inv) notFound();
  const a: any = inv.agencies || {};
  const flag = searchParams?.emailed || '';
  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href="/admin/invoices">← Back to invoices</Link>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Invoice {inv.number}</h1>
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton label="🖨 Print / Save PDF" />
          {inv.status === 'open' && (
            <>
              <form action={emailPlatformInvoice} className="flex">
                <input type="hidden" name="id" value={inv.id} />
                <button className="btn-secondary text-xs" type="submit">📧 Email to agency</button>
              </form>
              <form action={markInvoicePaid} className="flex items-center gap-1">
                <input type="hidden" name="id" value={inv.id} />
                <input className="input max-w-44 text-xs" name="stripe_payment_id" placeholder="Payment ref (optional)" />
                <button className="btn-primary text-xs" type="submit">✓ Mark paid</button>
              </form>
              <form action={voidInvoice}>
                <input type="hidden" name="id" value={inv.id} />
                <button className="text-xs font-semibold text-slate-400 hover:text-red-500" type="submit">Void</button>
              </form>
            </>
          )}
        </div>
      </div>
      {flag === 'ok' && <p className="mb-2 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">✓ Invoice emailed to {a.email}.</p>}
      {flag.startsWith('err:') && <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">Email failed: {decodeURIComponent(flag.slice(4))}</p>}

      <div className="card p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            {a.logo_url ? <img src={a.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">E</div>}
            <div>
              <h2 className="text-lg font-bold text-slate-900">EzUmrah CRM</h2>
              <p className="text-xs text-slate-500">SaaS subscription billing · by EzTechify</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Invoice</p>
            <p className="text-xl font-bold text-slate-900">{inv.number}</p>
            <p className="text-xs text-slate-500">Issued {new Date(inv.created_at).toLocaleDateString()}</p>
            <p className="mt-1"><StatusBadge status={inv.status} /></p>
          </div>
        </div>
        <div className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400">Billed to</p>
            <p className="font-semibold text-slate-900">{a.name}</p>
            <p className="text-slate-600">{a.email || ''}</p>
            <p className="text-slate-600">{a.address || ''}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Subscription</p>
            <p className="font-semibold capitalize text-slate-900">{inv.plan} plan</p>
            <p className="text-slate-600">{inv.period_start} → {inv.period_end}</p>
          </div>
        </div>
        <table className="mb-6 w-full border-collapse text-sm">
          <thead><tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-400">
            <th className="p-2">Description</th><th className="p-2 text-right">Amount</th>
          </tr></thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="p-2">EzUmrah CRM — <span className="font-semibold capitalize">{inv.plan}</span> plan subscription ({inv.period_start} → {inv.period_end})</td>
              <td className="p-2 text-right font-semibold">{inv.currency} {Number(inv.amount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><b>{inv.currency} {Number(inv.amount).toFixed(2)}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Tax</span><b>{inv.currency} 0.00</b></div>
            <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-semibold">Total due</span><b className="text-red-500">{inv.currency} {Number(inv.amount).toFixed(2)}</b></div>
            {inv.status === 'paid' && <p className="pt-1 text-right text-xs font-semibold text-emerald-600">Paid {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : ''} {inv.stripe_payment_id ? `· ${inv.stripe_payment_id}` : ''}</p>}
          </div>
        </div>
        <p className="mt-6 border-t border-slate-200 pt-3 text-[10px] text-slate-400">
          Payment is verified manually by the EzUmrah admin team. Once marked paid, the subscription is reactivated instantly.
        </p>
      </div>
    </div>
  );
}
