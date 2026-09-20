'use client';
import { useCallback, useEffect, useState } from 'react';

type Cred = { id: string; platform: string; category: string; username: string | null; url: string | null; notes: string | null; created_at: string };
const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'supplier', label: 'Hotel / Supplier Portal', icon: '🏨' },
  { key: 'gds', label: 'Airline / GDS', icon: '✈️' },
  { key: 'ota', label: 'OTA / Booking Portal', icon: '🛒' },
  { key: 'email', label: 'Email / SMTP', icon: '📧' },
  { key: 'bank', label: 'Bank / Payment', icon: '🏦' },
  { key: 'social', label: 'Social / Marketing', icon: '📣' },
  { key: 'other', label: 'Other', icon: '🌐' },
];
const catOf = (k: string) => CATEGORIES.find((c) => c.key === k) || CATEGORIES[CATEGORIES.length - 1];

export default function Vault({ role }: { role: string }) {
  const [list, setList] = useState<Cred[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cred | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ platform: '', category: 'supplier', username: '', password: '', url: '', notes: '' });

  const load = useCallback(async () => {
    const r = await fetch('/api/vault', { cache: 'no-store' });
    if (r.ok) { const d = await r.json(); setList(d.credentials); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ platform: '', category: 'supplier', username: '', password: '', url: '', notes: '' }); setShowForm(true); };
  const openEdit = (c: Cred) => { setEditing(c); setForm({ platform: c.platform, category: c.category, username: c.username || '', password: '', url: c.url || '', notes: c.notes || '' }); setShowForm(true); };

  const save = async () => {
    if (!form.platform.trim() || (!editing && !form.password)) return;
    setBusy(true);
    try {
      await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', id: editing?.id, ...form }) });
      setShowForm(false); setEditing(null); await load();
    } finally { setBusy(false); }
  };

  const reveal = async (id: string) => {
    if (revealed[id]) { setRevealed((r) => { const n = { ...r }; delete n[id]; return n; }); return; }
    const r = await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reveal', id }) });
    if (r.ok) { const d = await r.json(); setRevealed((m) => ({ ...m, [id]: d.password })); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete credentials for "${name}"? This cannot be undone.`)) return;
    await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    await load();
  };

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{list.length} saved credential{list.length === 1 ? '' : 's'} · passwords are AES-256 encrypted and only unmasked on request</p>
        <button className="btn-primary" onClick={openNew}>＋ Add credential</button>
      </div>

      {list.length === 0 && (
        <div className="card p-8 text-center text-sm text-slate-500">
          No saved logins yet. Add your supplier portals, GDS, OTA and email credentials here so the team never loses access again.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const cat = catOf(c.category);
          const pw = revealed[c.id];
          return (
            <div key={c.id} className="card p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{c.platform}</p>
                  <p className="text-[11px] text-slate-400">{cat.icon} {cat.label}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="text-xs text-slate-400 hover:text-slate-700" title="Edit">✏️</button>
                  <button onClick={() => del(c.id, c.platform)} className="text-xs text-slate-400 hover:text-red-500" title="Delete">🗑</button>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                {c.username && (
                  <p className="flex items-center justify-between gap-2">
                    <span className="truncate text-slate-600"><span className="text-slate-400">User:</span> {c.username}</span>
                    <button onClick={() => copy(c.username!, 'username')} className="shrink-0 text-slate-400 hover:text-slate-700" title="Copy username">⧉</button>
                  </p>
                )}
                <p className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-slate-600">
                    <span className="text-slate-400">Pass:</span> {pw || '••••••••••'}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button onClick={() => reveal(c.id)} className="text-slate-400 hover:text-slate-700" title={pw ? 'Hide' : 'Reveal'}>{pw ? '🙈' : '👁'}</button>
                    {pw && <button onClick={() => copy(pw, 'password')} className="text-slate-400 hover:text-slate-700" title="Copy password">⧉</button>}
                  </span>
                </p>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer" className="accent block truncate text-xs hover:underline">{c.url.replace(/^https?:\/\//, '')}</a>
                )}
                {c.notes && <p className="truncate text-slate-400" title={c.notes}>{c.notes}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-slate-900">{editing ? `Edit — ${editing.platform}` : 'Add credential'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Platform name *</span>
                <input className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="e.g. Booking.com Extranet" autoFocus /></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Category</span>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Login URL</span>
                <input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://admin.booking.com" /></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Username / email</span>
                <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="agency@alnoor.com" /></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">{editing ? 'New password (leave blank to keep)' : 'Password *'}</span>
                <input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" autoComplete="new-password" /></label>
              <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Notes</span>
                <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. 2FA on owner's phone — reset code in email" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setShowForm(false)} type="button">Cancel</button>
              <button className="btn-primary" onClick={save} disabled={busy || !form.platform.trim() || (!editing && !form.password)} type="button">{busy ? 'Saving…' : 'Save credential'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
