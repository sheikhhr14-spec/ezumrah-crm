import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ msg }: { msg: string }) {
  return <tr><td className="px-4 py-10 text-center text-slate-400" colSpan={9}>{msg}</td></tr>;
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700', completed: 'bg-slate-200 text-slate-600',
    done: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600',
    rejected: 'bg-red-100 text-red-600', overdue: 'bg-red-100 text-red-600',
    paid: 'bg-green-100 text-green-700', issued: 'bg-green-100 text-green-700',
    processing: 'bg-blue-100 text-blue-700', applied: 'bg-blue-100 text-blue-700',
    sent: 'bg-blue-100 text-blue-700', draft: 'bg-slate-200 text-slate-600',
    todo: 'bg-slate-200 text-slate-600', in_progress: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-blue-100 text-blue-700', urgent: 'bg-red-100 text-red-600',
    high: 'bg-amber-100 text-amber-700', medium: 'bg-slate-200 text-slate-600',
    low: 'bg-slate-100 text-slate-500', accepted: 'bg-green-100 text-green-700',
    trialing: 'bg-blue-100 text-blue-700',
  };
  return <span className={`badge ${colors[status] || 'bg-slate-200 text-slate-600'}`}>{status.replace(/_/g, ' ')}</span>;
}

export function AddPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="card mb-4 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-gold">+ {label}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function Field({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
