import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { addExpense, deleteExpense, recordPayment, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, AddPanel, Field, StatusBadge } from '@/components/ui';

export default async function AccountsPage({ searchParams }: { searchParams: { month?: string } }) {
  const ctx = await requireModule('accounts');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id;
  const month = searchParams?.month || new Date().toISOString().slice(0, 7);
  const from = `${month}-01`, to = `${month}-31`;

  const [{ data: invoices }, { data: payments }, { data: expenses }] = await Promise.all([
    db.from('invoices').select('id, invoice_no, total, status, bookings(booking_ref, customers(full_name))').eq('agency_id', aid).order('created_at', { ascending: false }),
    db.from('payments').select('*, invoices(invoice_no)').eq('agency_id', aid).gte('payment_date', from).lte('payment_date', to).order('payment_date', { ascending: false }),
    db.from('expenses').select('*').eq('agency_id', aid).gte('expense_date', from).lte('expense_date', to).order('expense_date', { ascending: false }),
  ]);

  const collected = (payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const spent = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

  const kpis = [
    { label: `Collected (${month})`, value: `$${collected.toLocaleString()}` },
    { label: `Expenses (${month})`, value: `$${spent.toLocaleString()}` },
    { label: 'Net cash flow', value: `$${(collected - spent).toLocaleString()}` },
    { label: 'Unpaid invoices', value: (invoices || []).filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length },
  ];

  return (
    <div>
      <PageHeader title="Accounts" subtitle="Cash in, expenses out — per month" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      <form className="mb-4">
        <input className="input max-w-xs" name="month" type="month" defaultValue={month} />
        <button className="btn-secondary ml-2" type="submit">Show month</button>
      </form>

      <AddPanel label="Record payment received (auto-updates invoice & booking)">
        <form action={recordPayment} className="grid gap-4 sm:grid-cols-3">
          <Field label="Invoice *">
            <select className="input" name="invoice_id" required>
              <option value="">Select invoice…</option>
              {(invoices || []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoice_no} — ${Number(i.total).toLocaleString()} ({i.status})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount *"><input className="input" name="amount" type="number" step="0.01" required /></Field>
          <Field label="Date"><input className="input" name="payment_date" type="date" /></Field>
          <Field label="Method">
            <select className="input" name="method">
              {['bank', 'cash', 'card', 'online'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reference"><input className="input" name="reference" placeholder="TXN / cheque no." /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Record payment</button></div>
        </form>
      </AddPanel>

      <h2 className="mb-3 text-lg font-semibold">Payments received — {month}</h2>
      <Table head={['Invoice', 'Amount', 'Date', 'Method', 'Reference', 'Actions']}>
        {payments?.length ? payments.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-2 font-semibold">{(p.invoices as any)?.invoice_no || '—'}</td>
            <td className="px-4 py-2 font-semibold text-green-600">${Number(p.amount).toLocaleString()}</td>
            <td className="px-4 py-2">{p.payment_date}</td>
            <td className="px-4 py-2 capitalize">{p.method}</td>
            <td className="px-4 py-2 text-xs text-slate-500">{p.reference || '—'}</td>
            <td className="px-4 py-2"><div className="flex items-center gap-2">
              <RowEdit table="payments" id={p.id}><label className="text-[10px] text-slate-400">Amount</label><input className="input px-2 py-1 text-xs" name="amount" defaultValue={p.amount || ''} /><label className="text-[10px] text-slate-400">Date</label><input className="input px-2 py-1 text-xs" type="date" name="payment_date" defaultValue={p.payment_date || ''} /><label className="text-[10px] text-slate-400">Method</label><select className="input px-2 py-1 text-xs" name="method"><option value="bank" selected={p.method === "bank"}> bank</option><option value="cash" selected={p.method === "cash"}> cash</option><option value="card" selected={p.method === "card"}> card</option><option value="online" selected={p.method === "online"}> online</option></select><label className="text-[10px] text-slate-400">Reference</label><input className="input px-2 py-1 text-xs" name="reference" defaultValue={p.reference || ''} /></RowEdit>
              <form action={deleteRecord}><input type="hidden" name="table" value="payments" /><input type="hidden" name="id" value={p.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
            </div></td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No payments recorded this month." /></td></tr>}
      </Table>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Expenses — {month}</h2>
      <AddPanel label="Add expense">
        <form action={addExpense} className="grid gap-4 sm:grid-cols-3">
          <Field label="Category">
            <select className="input" name="category">
              {['rent', 'salaries', 'marketing', 'office', 'travel', 'visa_fees', 'hotel_payments', 'transport', 'taxes', 'other'].map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Description"><input className="input" name="description" /></Field>
          <Field label="Amount *"><input className="input" name="amount" type="number" step="0.01" required /></Field>
          <Field label="Date"><input className="input" name="expense_date" type="date" /></Field>
          <Field label="Method">
            <select className="input" name="payment_method">
              {['bank', 'cash', 'card', 'online'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reference"><input className="input" name="reference" /></Field>
          <div className="sm:col-span-3"><button className="btn-primary" type="submit">Save expense</button></div>
        </form>
      </AddPanel>
      <Table head={['Category', 'Description', 'Amount', 'Date', 'Method', '']}>
        {expenses?.length ? expenses.map((e) => (
          <tr key={e.id} className="hover:bg-slate-50">
            <td className="px-4 py-2"><span className="badge bg-slate-100 text-slate-600 capitalize">{(e.category || '').replace(/_/g, ' ')}</span></td>
            <td className="px-4 py-2">{e.description || '—'}</td>
            <td className="px-4 py-2 font-semibold text-red-500">${Number(e.amount).toLocaleString()}</td>
            <td className="px-4 py-2">{e.expense_date}</td>
            <td className="px-4 py-2 capitalize">{e.payment_method}</td>
            <td className="px-4 py-2">
              <RowEdit table="expenses" id={e.id}><label className="text-[10px] text-slate-400">Category</label><select className="input px-2 py-1 text-xs" name="category"><option value="rent" selected={e.category === "rent"}> rent</option><option value="salaries" selected={e.category === "salaries"}> salaries</option><option value="marketing" selected={e.category === "marketing"}> marketing</option><option value="office" selected={e.category === "office"}> office</option><option value="travel" selected={e.category === "travel"}> travel</option><option value="visa_fees" selected={e.category === "visa_fees"}> visa fees</option><option value="hotel_payments" selected={e.category === "hotel_payments"}> hotel payments</option><option value="transport" selected={e.category === "transport"}> transport</option><option value="taxes" selected={e.category === "taxes"}> taxes</option><option value="other" selected={e.category === "other"}> other</option></select><label className="text-[10px] text-slate-400">Description</label><input className="input px-2 py-1 text-xs" name="description" defaultValue={e.description || ''} /><label className="text-[10px] text-slate-400">Amount</label><input className="input px-2 py-1 text-xs" name="amount" defaultValue={e.amount || ''} /><label className="text-[10px] text-slate-400">Date</label><input className="input px-2 py-1 text-xs" type="date" name="expense_date" defaultValue={e.expense_date || ''} /><label className="text-[10px] text-slate-400">Method</label><select className="input px-2 py-1 text-xs" name="payment_method"><option value="bank" selected={e.payment_method === "bank"}> bank</option><option value="cash" selected={e.payment_method === "cash"}> cash</option><option value="card" selected={e.payment_method === "card"}> card</option><option value="online" selected={e.payment_method === "online"}> online</option></select><label className="text-[10px] text-slate-400">Reference</label><input className="input px-2 py-1 text-xs" name="reference" defaultValue={e.reference || ''} /></RowEdit>
              <form action={deleteExpense}>
                <input type="hidden" name="id" value={e.id} />
                <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
              </form>
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No expenses recorded this month." /></td></tr>}
      </Table>
    </div>
  );
}
