import { createAdminClient } from '@/lib/supabase/admin';
import { replyTicket, setTicketStatus } from '@/lib/admin-actions';
import { StatusBadge, Empty } from '@/components/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const PRIO: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-50 text-amber-600', urgent: 'bg-red-50 text-red-600',
};

export default async function TicketDetail({ params }: { params: { id: string } }) {
  const db = createAdminClient();
  const { data: ticket } = await db.from('support_tickets')
    .select('*, agencies(name), profiles(full_name, email)')
    .eq('id', params.id).single();
  if (!ticket) notFound();

  const [{ data: replies }] = await Promise.all([
    db.from('support_ticket_replies').select('*, profiles(full_name, email)').eq('ticket_id', ticket.id).order('created_at'),
  ]);

  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href="/admin/support">← All tickets</Link>

      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <span className={`badge ${PRIO[ticket.priority] || PRIO.normal}`}>{ticket.priority}</span>
            {ticket.subject}
          </h1>
          <p className="text-sm text-slate-500">
            {ticket.agencies?.name} · {ticket.profiles?.full_name || ticket.profiles?.email || '—'} · {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={ticket.status} />
          <form action={setTicketStatus} className="flex gap-2">
            <input type="hidden" name="id" value={ticket.id} />
            <select name="status" defaultValue={ticket.status} className="input max-w-32">
              <option value="open">open</option>
              <option value="pending">pending</option>
              <option value="resolved">resolved</option>
            </select>
            <button className="btn-secondary text-xs" type="submit">Update status</button>
          </form>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{ticket.message}</p>
      </div>

      <h2 className="mb-3 text-sm font-bold text-slate-900">Conversation ({replies?.length || 0})</h2>
      <div className="mb-6 space-y-3">
        {replies?.length ? replies.map((r: any) => (
          <div key={r.id} className={`card p-4 ${r.is_staff ? 'border-l-4 border-l-gold' : ''}`}>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">
                {r.is_staff ? '🛡 EzUmrah Staff' : r.profiles?.full_name || 'Tenant'} · {r.profiles?.email || ''}
              </p>
              <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{r.message}</p>
          </div>
        )) : <Empty msg="No replies yet." />}
      </div>

      {ticket.status !== 'resolved' && (
        <form action={replyTicket} className="card p-5">
          <label className="label">Reply as EzUmrah staff</label>
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <textarea className="input" name="message" rows={3} required placeholder="Write your reply to the tenant…" />
          <button className="btn-primary mt-3" type="submit">Send reply (marks ticket pending)</button>
        </form>
      )}
    </div>
  );
}
