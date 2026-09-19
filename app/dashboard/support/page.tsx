import { createClient } from '@/lib/supabase/server';
import { requireActiveAgency } from '@/lib/data';
import { createTenantTicket, replyTenantTicket } from '@/lib/support-actions';
import { PageHeader, StatusBadge, Empty, AddPanel, Field } from '@/components/ui';

const PRIO: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-50 text-amber-600', urgent: 'bg-red-50 text-red-600',
};

export default async function SupportPage() {
  const ctx = await requireActiveAgency();
  const db = await createClient();
  const { data: tickets } = await db.from('support_tickets')
    .select('*').eq('agency_id', (ctx.agency as any).id)
    .order('updated_at', { ascending: false });

  // fetch replies for each ticket
  const withReplies = await Promise.all((tickets || []).map(async (t: any) => {
    const { data: replies } = await db.from('support_ticket_replies')
      .select('*, profiles(full_name)').eq('ticket_id', t.id).order('created_at');
    return { ...t, replies: replies || [] };
  }));

  return (
    <div>
      <PageHeader title="Support" subtitle="Raise a ticket with the EzUmrah team — we usually reply within a few hours" />

      <AddPanel label="New support ticket">
        <form action={createTenantTicket} className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject" span><input className="input" name="subject" required placeholder="Issue with GDS sync…" /></Field>
          <Field label="Describe the issue" span>
            <textarea className="input" name="message" required rows={4} placeholder="Describe your issue in detail…" />
          </Field>
          <Field label="Priority">
            <select className="input" name="priority" defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <div><button className="btn-primary" type="submit">Submit ticket</button></div>
        </form>
      </AddPanel>

      <div className="space-y-4">
        {withReplies.length ? withReplies.map((t: any) => (
          <div key={t.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`badge ${PRIO[t.priority] || PRIO.normal}`}>{t.priority}</span>
                <h3 className="font-bold text-slate-900">{t.subject}</h3>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{t.message}</p>
            <p className="mt-2 text-xs text-slate-400">Opened {new Date(t.created_at).toLocaleString()}</p>

            {t.replies.length > 0 && (
              <div className="mt-4 space-y-2 border-l-2 border-slate-100 pl-4">
                {t.replies.map((r: any) => (
                  <div key={r.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-600">
                      {r.is_staff ? '🛡 EzUmrah Staff' : r.profiles?.full_name || 'You'} · {new Date(r.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.message}</p>
                  </div>
                ))}
              </div>
            )}

            {t.status !== 'resolved' && (
              <form action={replyTenantTicket} className="mt-3 flex gap-2">
                <input type="hidden" name="ticket_id" value={t.id} />
                <input className="input" name="message" placeholder="Add a reply…" required />
                <button className="btn-secondary shrink-0" type="submit">Reply</button>
              </form>
            )}
          </div>
        )) : <Empty msg="No tickets yet. Open one above if you need help." />}
      </div>
    </div>
  );
}
