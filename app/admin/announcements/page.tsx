import { createAdminClient } from '@/lib/supabase/admin';
import { createAnnouncement, deleteAnnouncement } from '@/lib/admin-actions';
import { PageHeader, Empty, AddPanel, Field } from '@/components/ui';

const TYPE_STYLE: Record<string, string> = {
  info: 'bg-slate-100 text-slate-600',
  update: 'accent-soft-bg accent',
  warning: 'bg-amber-50 text-amber-600',
};

export default async function AnnouncementsPage() {
  const db = createAdminClient();
  const [{ data: announcements }, { data: agencies }] = await Promise.all([
    db.from('announcements').select('*, agencies(name)').order('created_at', { ascending: false }),
    db.from('agencies').select('id, name').order('name'),
  ]);

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Broadcast news to all tenants, or target a single agency" />

      <AddPanel label="New announcement">
        <form action={createAnnouncement} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" span><input className="input" name="title" required placeholder="New GDS integration available" /></Field>
          <Field label="Body" span>
            <textarea className="input" name="body" required rows={3} placeholder="Write your message to tenants…" />
          </Field>
          <Field label="Type">
            <select className="input" name="type" defaultValue="info">
              <option value="info">Info</option>
              <option value="update">Product update</option>
              <option value="warning">Warning / maintenance</option>
            </select>
          </Field>
          <Field label="Audience">
            <select className="input" name="agency_id" defaultValue="">
              <option value="">📣 All tenants (broadcast)</option>
              {(agencies || []).map((a: any) => <option key={a.id} value={a.id}>{a.name} only</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><button className="btn-primary" type="submit">Publish announcement</button></div>
        </form>
      </AddPanel>

      <div className="space-y-4">
        {announcements?.length ? announcements.map((a: any) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${TYPE_STYLE[a.type] || TYPE_STYLE.info}`}>{a.type}</span>
                  <h3 className="font-bold text-slate-900">{a.title}</h3>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {a.agencies ? `Targeted: ${a.agencies.name}` : 'Broadcast to all tenants'} · {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <form action={deleteAnnouncement}>
                <input type="hidden" name="id" value={a.id} />
                <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
              </form>
            </div>
          </div>
        )) : <Empty msg="No announcements yet. Publish one above." />}
      </div>
    </div>
  );
}
