'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createChatMessage } from '@/lib/crm-actions';

type Msg = { id: string; profile_id: string; body: string; created_at: string };
type Member = { id: string; full_name: string; role: string };

export default function ChatRoom({ me, meName, messages, team }: {
  me: string; meName: string; messages: Msg[]; team: Member[];
}) {
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'auto' }); });
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  const member = (id: string) => team.find((t) => t.id === id);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Chat</h1>
          <p className="text-sm text-slate-500">{team.length} member{team.length === 1 ? '' : 's'} · internal — only your agency can see this</p>
        </div>
        <div className="flex -space-x-1">
          {team.slice(0, 6).map((t) => (
            <span key={t.id} title={t.full_name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white accent-bg text-xs font-bold text-white">
              {t.full_name?.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </span>
          ))}
        </div>
      </div>

      <div className="card h-[60vh] space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">No messages yet — say hello to your team 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.profile_id === me;
          const who = member(m.profile_id);
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? 'accent-bg text-white' : 'bg-slate-100 text-slate-900'}`}>
                {!mine && (
                  <p className="text-xs font-bold text-slate-500">
                    {who?.full_name || 'Removed member'}{who && who.role !== 'staff' ? ` · ${who.role}` : ''}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`} suppressHydrationWarning>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form action={async (fd) => { await createChatMessage(fd); inputRef.current ? (inputRef.current.value = '') : null; router.refresh(); }}
        className="mt-4 flex gap-2">
        <input ref={inputRef} name="body" required maxLength={2000} placeholder={`Message the team as ${meName}…`} className="input flex-1" autoComplete="off" />
        <button className="btn-primary px-6" type="submit">Send</button>
      </form>
    </div>
  );
}
