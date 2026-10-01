import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireModule } from '@/lib/data';
import {
  updateQuotationItem, addQuotationItem, deleteQuotationItem, updateQuotationMeta,
  setQuotationStatus, convertQuotationToInvoice, sendQuotationEmail, deleteRecord,
} from '@/lib/crm-actions';
import { StatusBadge, Table, Empty } from '@/components/ui';
import SubmitButton from '@/components/submit-button';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function QuotationDetail({ params, searchParams }: { params: { id: string }; searchParams?: { emailed?: string } }) {
  const ctx = await requireModule('quotations');
  const cur = (ctx as any).agency?.currency;
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();
  const [{ data: q }, { data: items }] = await Promise.all([
    db.from('quotations').select('*, customers(full_name, email, phone, country)').eq('id', params.id).eq('agency_id', aid).single(),
    db.from('quotation_items').select('*').eq('agency_id', aid).eq('quotation_id', params.id).order('created_at'),
  ]);
  if (!q) notFound();
  const cust: any = q.customers || {};
  const expired = q.valid_until && new Date(q.valid_until) < new Date(new Date().toDateString()) && !['accepted', 'rejected'].includes(q.status);

  const statuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

  return (
    <div>
      {searchParams?.emailed === 'ok' && <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">✓ Quotation emailed to the customer.</p>}
      <Link className="text-sm text-slate-400 hover:text-gold" href="/dashboard/quotations">← All quotations</Link>

      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{q.quote_no}</h1>
            <StatusBadge status={q.status} />
            {expired && <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">EXPIRED</span>}
          </div>
          <p className="text-sm text-slate-500">{q.title || 'Service quotation'}{cust.full_name ? ` · for ${cust.full_name}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className="btn-secondary text-xs" href={`/api/invoice-pdf?type=quotation&id=${q.id}`}>⬇ Download PDF</a>
          <form action={sendQuotationEmail}><input type="hidden" name="id" value={q.id} /><SubmitButton className="btn-secondary text-xs" pendingText="Sending…">📧 Email quote</SubmitButton></form>
          {q.status !== 'accepted' && (
            <form action={convertQuotationToInvoice}><input type="hidden" name="id" value={q.id} /><SubmitButton className="btn-primary text-xs" pendingText="Converting…">✓ Accept & convert to invoice</SubmitButton></form>
          )}
          <form action={deleteRecord}><input type="hidden" name="table" value="quotations" /><input type="hidden" name="id" value={q.id} /><button className="btn-secondary !text-red-500 text-xs" type="submit">Delete</button></form>
        </div>
      </div>

      {/* status workflow */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-semibold text-slate-400">Status:</span>
        {statuses.map((s) => (
          <form key={s} action={setQuotationStatus}>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="status" value={s} />
            <button type="submit" className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${q.status === s ? 'border-gold bg-gold/10 accent' : 'border-slate-200 text-slate-500 hover:border-gold hover:text-gold'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          </form>
        ))}
      </div>

      {/* customer + meta cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">👤 Customer</h3>
          <p className="font-semibold">{cust.full_name || '—'}</p>
          <p className="text-xs text-slate-500">{cust.email || 'No email'}{cust.phone ? ` · ${cust.phone}` : ''}{cust.country ? ` · ${cust.country}` : ''}</p>
        </div>
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">📄 Quote details</h3>
          <p className="text-xs text-slate-500">Created {String(q.created_at || '').slice(0, 10)} · Valid until <span className="font-semibold text-slate-700">{q.valid_until || 'no expiry set'}</span></p>
          <p className="text-xs text-slate-500">Currency: {q.currency}</p>
        </div>
      </div>

      {/* items */}
      <div className="card mb-6 p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">🧾 Line items ({(items || []).length})</h3>
        <Table head={['Description', 'Qty', 'Unit price', 'Amount', '']}>
          {(items || []).length ? (items || []).map((it: any) => (
            <tr key={it.id} className="hover:bg-slate-50">
              <td className="w-1/2 p-2">{it.description}</td>
              <td className="p-2 text-xs">{it.quantity}</td>
              <td className="p-2 text-xs">{money(Number(it.unit_price), cur)}</td>
              <td className="p-2 text-xs font-semibold">{money(Number(it.amount), cur)}</td>
              <td className="p-2"><div className="flex items-center gap-2">
                <form action={updateQuotationItem} className="flex items-center gap-1">
                  <input type="hidden" name="item_id" value={it.id} />
                  <input type="hidden" name="quotation_id" value={q.id} />
                  <input className="input px-2 py-1 text-xs" name="description" defaultValue={it.description} title="Description" />
                  <input className="input w-16 px-2 py-1 text-xs" name="quantity" type="number" step="1" defaultValue={it.quantity} title="Qty" />
                  <input className="input w-24 px-2 py-1 text-xs" name="unit_price" type="number" step="0.01" defaultValue={it.unit_price} title="Unit price" />
                  <SubmitButton className="btn-secondary px-2 py-1 text-xs" pendingText="…">Save</SubmitButton>
                </form>
                <form action={deleteQuotationItem}>
                  <input type="hidden" name="item_id" value={it.id} />
                  <input type="hidden" name="quotation_id" value={q.id} />
                  <button className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-400 hover:bg-red-50" type="submit">✕</button>
                </form>
              </div></td>
            </tr>
          )) : <Empty msg="No items yet — add the first line item below." />}
        </Table>
        <form action={addQuotationItem} className="mt-3 grid gap-2 sm:grid-cols-8">
          <input type="hidden" name="quotation_id" value={q.id} />
          <input className="input sm:col-span-4" name="description" placeholder="New item description" required />
          <input className="input" name="quantity" type="number" step="1" placeholder="Qty" defaultValue={1} />
          <input className="input sm:col-span-2" name="unit_price" type="number" step="0.01" placeholder={`Unit price (${cur})`} />
          <SubmitButton className="btn-secondary text-xs">+ Add</SubmitButton>
        </form>

        {/* totals */}
        <div className="mt-4 grid gap-2 text-right sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Subtotal</p><p className="font-bold">{money(Number(q.subtotal), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Discount</p><p className="font-bold text-red-500">-{money(Number(q.discount), cur)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Tax / VAT</p><p className="font-bold">{money(Number(q.tax_amount), cur)}</p></div>
          <div className="rounded-lg accent-soft-bg p-3"><p className="text-xs text-slate-400">Total</p><p className="font-bold accent">{money(Number(q.total), cur)}</p></div>
        </div>
      </div>

      {/* meta edit */}
      <div className="card mb-6 p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">⚙️ Quote settings, discount & terms</h3>
        <form action={updateQuotationMeta} className="grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="id" value={q.id} />
          <div><label className="label">Service title</label><input className="input" name="title" defaultValue={q.title || ''} /></div>
          <div><label className="label">Valid until</label><input className="input" name="valid_until" type="date" defaultValue={q.valid_until || ''} /></div>
          <div><label className="label">Status</label><select className="input" name="status" defaultValue={q.status || 'draft'}>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="label">Discount ({cur})</label><input className="input" name="discount" type="number" step="0.01" defaultValue={q.discount ?? ''} /></div>
          <div><label className="label">Tax / VAT ({cur})</label><input className="input" name="tax_amount" type="number" step="0.01" defaultValue={q.tax_amount ?? ''} /></div>
          <div className="sm:col-span-3"><label className="label">Terms & conditions (printed on the quotation)</label><textarea className="input min-h-16" name="terms" defaultValue={q.terms || ''} placeholder="50% advance to confirm. Prices subject to airline availability." /></div>
          <div className="sm:col-span-3"><label className="label">Internal notes</label><textarea className="input min-h-12" name="notes" defaultValue={q.notes || ''} /></div>
          <div><SubmitButton className="btn-primary" pendingText="Saving…">Save changes</SubmitButton></div>
        </form>
      </div>
    </div>
  );
}
