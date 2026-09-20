'use client';
import { useMemo, useRef, useState } from 'react';

type C = { id: string; full_name: string; phone?: string | null };

export default function CustomerPicker({ customers, onPick, label = 'Existing customer' }: {
  customers: C[]; onPick?: (id: string, name: string) => void; label?: string;
}) {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pool = t
      ? customers.filter((c) => `${c.full_name} ${c.phone || ''}`.toLowerCase().includes(t))
      : customers;
    return pool.slice(0, 60);
  }, [q, customers]);

  const pick = (c: C | null) => {
    setSelId(c?.id || '');
    setQ(c?.full_name || '');
    setOpen(false);
    onPick?.(c?.id || '', c?.full_name || '');
  };

  return (
    <div ref={boxRef} className="relative">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        className="input"
        value={selId && !open ? (customers.find((c) => c.id === selId)?.full_name || q) : q}
        onChange={(e) => { setQ(e.target.value); setSelId(''); setOpen(true); onPick?.('', ''); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search customer by name or phone…"
        autoComplete="off"
      />
      <input type="hidden" name="existing_customer_id" value={selId} />
      {selId && !open && (
        <button type="button" onClick={() => pick(null)} title="Clear selection"
          className="absolute right-2 top-[26px] text-slate-400 hover:text-slate-700">✕</button>
      )}
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(null); }}
            className="w-full px-3 py-2 text-left text-xs font-semibold accent hover:bg-slate-50">➕ New customer (type details below)</button>
          {filtered.length === 0 && <p className="px-3 py-3 text-xs text-slate-400">No customer matches “{q}” — use a new customer below.</p>}
          {filtered.map((c) => (
            <button type="button" key={c.id} onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${selId === c.id ? 'accent-soft-bg' : ''}`}>
              <span className="font-semibold text-slate-900">{c.full_name}</span>
              {c.phone && <span className="ml-2 text-xs text-slate-400">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
