'use client';
import { useState } from 'react';
import { markAllNotificationsRead } from '@/lib/crm-actions';

export default function NotificationBell({ items }: {
  items: { id: string; title: string; body: string | null; href: string | null; read: boolean; created_at: string }[];
}) {
  const [open, setOpen] = useState(false);
  const unread = items.filter((i) => !i.read).length;
  const ago = (t: string) => {
    const m = Math.floor((Date.now() - new Date(t).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : new Date(t).toLocaleDateString();
  };
  return (
    <div className="relative ml-auto">
      <button onClick={() => setOpen(!open)} aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg transition hover:bg-slate-100">
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notifications</p>
              {unread > 0 && (
                <form action={markAllNotificationsRead}>
                  <button type="submit" className="text-[11px] font-semibold accent hover:underline">Mark all read</button>
                </form>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length ? items.map((n) => (
                <a key={n.id} href={n.href || '#'} className="block border-b border-slate-50 px-4 py-2.5 hover:bg-slate-50">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className={`h-1.5 w-1.5 rounded-full ${n.read ? 'bg-slate-300' : 'bg-red-500'}`} />
                    {n.title}
                  </p>
                  {n.body && <p className="pl-3.5 text-xs text-slate-500">{n.body}</p>}
                  <p className="pl-3.5 pt-0.5 text-[10px] text-slate-400">{ago(n.created_at)}</p>
                </a>
              )) : <p className="px-4 py-6 text-center text-xs text-slate-400">You&apos;re all caught up 🎉</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
