import { getActivity } from '@/lib/activity';
import { requireActiveAgency } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';

const LABELS: Record<string, string> = {
  leads: 'Lead', flight_sales: 'Flight sale', hotel_sales: 'Hotel sale', visa_sales: 'Visa sale',
  transport_sales: 'Transport sale', package_sales: 'Package sale', customers: 'Customer',
  bookings: 'Booking', tour_passengers: 'Tour passenger', tour_bookings: 'Tour booking', tasks: 'Task',
  packages: 'Package', invoices: 'Invoice', quotations: 'Quotation',
};
const ACTION_ICONS: Record<string, string> = {
  created: '✨', updated: '✏️', deleted: '🗑️', status: '🔁', seat: '💺', stage: '➡️', converted: '🔄', assigned: '👤',
};

export default async function RecordActivity({ table, id, record }: { table: string; id: string; record?: any }) {
  const ctx = await requireActiveAgency();
  if (ctx.role !== 'owner') return null; // only the agency owner sees record activity
  const aid = ctx.profile.agency_id!;
  const label = LABELS[table] || table;

  let created: { name: string; at: Date } | null = null;
  if (record?.created_at) {
    let creatorName = 'Unknown';
    if (record.created_by) {
      const db = createAdminClient();
      const { data: p } = await db.from('profiles').select('full_name').eq('id', record.created_by).maybeSingle();
      creatorName = (p as any)?.full_name || 'Unknown';
    }
    created = { name: creatorName, at: new Date(record.created_at) };
  }
  const logs = await getActivity(aid, table, id);
  if (!created && !logs.length) return null;
  const fmt = (d: Date | string) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="card mt-6 p-5">
      <h3 className="mb-3 text-sm font-bold text-slate-900">🕘 {label} activity
        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400">owner only</span>
      </h3>
      <ol className="space-y-2 text-xs">
        {created && (
          <li className="flex items-start gap-2">
            <span>✨</span>
            <span><b>Created by {created.name}</b> <span className="text-slate-400">· {fmt(created.at)}</span></span>
          </li>
        )}
        {logs.slice().reverse().map((l, i) => (
          <li key={i} className="flex items-start gap-2">
            <span>{ACTION_ICONS[l.action] || '•'}</span>
            <span>
              <b>{l.actor_name}</b> — {l.action === 'updated' ? 'edited this record' : l.action === 'status' ? 'changed status' : l.action === 'seat' ? 'assigned seat' : l.action === 'deleted' ? 'deleted this record' : l.action === 'stage' ? 'moved stage' : l.action === 'converted' ? 'converted this lead' : l.action}
              {l.detail ? <span className="text-slate-500"> · {l.detail}</span> : null}
              <span className="text-slate-400"> · {fmt(l.t)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
