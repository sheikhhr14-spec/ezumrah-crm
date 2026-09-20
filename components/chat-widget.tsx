'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Msg = { id: string; profile_id: string; body: string; created_at: string; deleted_at: string | null; conversation_id: string | null };
type Convo = { key: string; kind: string; name: string; role?: string; other?: string; convoId?: string | null; last: Msg | null; unread: number };
type State = { me: { id: string; name: string; role: string }; team: any[]; convos: Convo[]; messages: Msg[] | null };

function beep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const play = (freq: number, at: number, dur: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + dur + 0.05);
    };
    play(880, 0, 0.18); play(1174.66, 0.12, 0.25);
  } catch { /* sound is non-critical */ }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Convo | null>(null);
  const [data, setData] = useState<State | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);
  const activeKey = active?.key || null;

  const poll = useCallback(async (withThread: string | null) => {
    try {
      const url = '/api/chat' + (withThread ? '?convo=' + encodeURIComponent(withThread) : '');
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return;
      const d: State = await r.json();
      setData(d);
      if (withThread && d.messages) setMessages(d.messages);
      // notification sound for new incoming messages
      for (const c of d.convos) {
        if (!c.last) continue;
        const isNew = !seen.current.has(c.last.id);
        if (isNew && c.last.profile_id !== d.me.id && !c.last.deleted_at) {
          if (seen.current.size > 0) beep();
        }
      }
      const allIds = d.convos.map((c) => c.last?.id).filter(Boolean) as string[];
      if (d.messages) allIds.push(...d.messages.map((m) => m.id));
      allIds.forEach((id) => seen.current.add(id));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const interval = open ? 2500 : 9000;
    const threadParam = open && active ? (active.kind === 'group' ? 'group' : (active.convoId || null)) : null;
    poll(threadParam);
    const t = setInterval(() => poll(threadParam), interval);
    return () => clearInterval(t);
  }, [open, activeKey, poll]);

  useEffect(() => { if (open && messages.length) endRef.current?.scrollIntoView({ behavior: 'auto' }); }, [messages, open]);

  const openConvo = async (c: Convo) => {
    setActive(c);
    if (c.kind === 'group') await poll('group');
    else if (c.convoId) await poll(c.convoId);
    else setMessages([]);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(active?.kind === 'group'
          ? { action: 'send', convo: 'group', body }
          : { action: 'send', convoId: active?.convoId, to: active?.other, body }),
      });
      const d = await r.json();
      if (d.message) {
        setMessages((ms) => [...ms, d.message]);
        seen.current.add(d.message.id);
      }
      setDraft('');
      if (active && !active.convoId && active.kind === 'direct' && d.convoId) {
        setActive({ ...active, convoId: d.convoId });
      }
      poll(active?.kind === 'group' ? 'group' : (active?.convoId || d.convoId || null));
    } finally { setSending(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this message for everyone?')) return;
    await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, deleted_at: new Date().toISOString(), body: '' } : m)));
    poll(active?.kind === 'group' ? 'group' : (active?.convoId || null));
  };

  const totalUnread = (data?.convos || []).reduce((n, c) => n + (c.unread || 0), 0);
  const isOwner = data?.me?.role === 'owner';
  const nameOf = (id: string) => (id === data?.me.id ? 'You' : ((data?.convos.find((c) => c.other === id)?.name) || 'Team member'));

  if (!data) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[540px] w-[350px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[380px]">
          {/* header */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            {active && (
              <button onClick={() => { setActive(null); setMessages([]); }} className="text-slate-400 accent-hover rounded px-1" title="Back">←</button>
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{active ? active.name : 'Team Chat'}</p>
              <p className="text-[11px] text-slate-400">
                {active ? (active.kind === 'group' ? 'Everyone in your agency' : 'Private conversation') : `Internal · ${data.team.length + 1} member${data.team.length ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-lg leading-none text-slate-400 hover:text-slate-700" title="Close">×</button>
          </div>

          {!active ? (
            /* conversation list */
            <div className="flex-1 overflow-y-auto">
              {(data.convos.length === 0 && data.team.length === 0) && (
                <p className="p-6 text-center text-xs text-slate-400">You&apos;re the only member of your agency. Invite staff from Team settings to chat.</p>
              )}
              {data.convos.map((c) => (
                <button key={c.key} onClick={() => openConvo(c)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full accent-bg text-xs font-bold text-white">
                    {c.kind === 'group' ? '👥' : (c.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between">
                      <span className="truncate text-sm font-semibold text-slate-900">{c.name}</span>
                      {c.last && <span className="ml-2 shrink-0 text-[10px] text-slate-400">{new Date(c.last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {c.last ? (c.last.deleted_at ? 'Message deleted' : (c.last.profile_id === data.me.id ? 'You: ' : '') + c.last.body) : 'No messages yet'}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full accent-bg px-1 text-[10px] font-bold text-white">{c.unread > 99 ? '99+' : c.unread}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* thread */
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.length === 0 && <p className="py-10 text-center text-xs text-slate-400">No messages yet — say hello 👋</p>}
              {messages.map((m) => {
                const mine = m.profile_id === data.me.id;
                return (
                  <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'accent-bg text-white' : 'bg-slate-100 text-slate-900'}`}>
                      {!mine && active?.kind === 'group' && <p className="text-[11px] font-bold text-slate-500">{nameOf(m.profile_id)}</p>}
                      {m.deleted_at ? (
                        <p className={`text-sm italic ${mine ? 'text-white/60' : 'text-slate-400'}`}>Message deleted by the owner</p>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                      )}
                      <p className={`mt-0.5 flex items-center gap-1 text-right text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isOwner && !m.deleted_at && (
                          <button onClick={() => del(m.id)} title="Delete (owner only)" className="ml-1 text-[10px] hover:underline">🗑</button>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          )}

          {/* composer */}
          {active && (
            <div className="flex items-center gap-2 border-t border-slate-200 p-3">
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                maxLength={2000} placeholder={`Message ${active.name}…`} className="input flex-1 !py-2 text-sm" autoFocus />
              <button onClick={send} disabled={sending || !draft.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50" type="button">
                {sending ? '…' : 'Send'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* floating circle */}
      <button onClick={() => setOpen(!open)} title="Team Chat"
        className="relative flex h-14 w-14 items-center justify-center rounded-full accent-bg text-2xl text-white shadow-xl transition hover:scale-105">
        {open ? '×' : '💬'}
        {!open && totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}
