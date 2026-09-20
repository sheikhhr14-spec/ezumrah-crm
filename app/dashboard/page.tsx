import { createAdminClient } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { requireActiveAgency } from '@/lib/data';
import { punchClock } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';
import LocalTime from '@/components/local-time';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';
import Link from 'next/link';

export default async function Overview({ searchParams }: { searchParams: { denied?: string } }) {
  const ctx = await requireActiveAgency();
  const cur = (ctx as any).agency?.currency;
  const tz = (ctx as any).agency?.timezone;
  const aid = ctx.profile.agency_id!;
  const db = createAdminClient();

  const [bookings, customers, invoices, tasks, flights] = await Promise.all([
    db.from('bookings').select('id, booking_ref, package_name, trip_type, status, total_amount, currency, departure_date, customers(full_name)').eq('agency_id', aid).order('created_at', { ascending: false }).limit(8),
    db.from('customers').select('id', { count: 'exact', head: true }).eq('agency_id', aid),
    db.from('invoices').select('total, status').eq('agency_id', aid),
    db.from('tasks').select('id, title, due_date, priority, status').eq('agency_id', aid).neq('status', 'done').order('due_date').limit(6),
    db.from('flights').select('id, airline, flight_no, departure_airport, arrival_airport, departure_time, status').eq('agency_id', aid).order('departure_time').limit(6),
  ]);

  const unpaid = invoices.data?.filter((i) => i.status !== 'paid' && i.status !== 'cancelled') || [];
  const revenue = invoices.data?.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0) || 0;

  const stats = [
    { label: 'Total bookings', value: bookings.data?.length ?? 0, href: '/dashboard/bookings' },
    { label: 'Customers', value: customers.count ?? 0, href: '/dashboard/customers' },
    { label: 'Outstanding invoices', value: unpaid.length, href: '/dashboard/invoices' },
    { label: 'Revenue collected', value: `${money(revenue, cur)}`, href: '/dashboard/invoices' },
  ];

  // today's attendance for the logged-in user
  const today = new Date().toISOString().slice(0, 10);
  const { data: att } = await db.from('user_attendance').select('*')
    .eq('profile_id', ctx.profile.id).eq('att_date', today).maybeSingle();
  const onBreak = !!(att?.break_start && !att?.break_end);
  const canClockIn = !att;
  const canClockOut = !!(att?.clock_in && !att?.clock_out && (!att?.break_start || att?.break_end));
  const canBreakStart = !!(att?.clock_in && !att?.clock_out && !att?.break_start);
  const canBreakEnd = onBreak;
  const Punch = ({ type, label, cls = 'btn-secondary' }: { type: string; label: string; cls?: string }) => (
    <form action={punchClock}>
      <input type="hidden" name="type" value={type} />
      <SubmitButton pendingText="…" className={`${cls} px-3 py-1.5 text-xs`}>{label}</SubmitButton>
    </form>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <PageHeader title={`Welcome back, ${ctx.profile?.full_name?.split(' ')[0] || ''}`} subtitle={`${ctx.agency.name} — Umrah, Hajj, Ziyarah operations`} />
        <div className="card flex items-center gap-4 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Today's attendance</p>
            <p className="mt-0.5 text-sm font-semibold">
              {att?.clock_out ? '✅ Day complete' : onBreak ? '☕ On break' : att?.clock_in ? '🟢 Clocked in' : '🔴 Not clocked in'}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
              <span>⏰ In: <b className="text-slate-700"><LocalTime t={att?.clock_in} tz={tz} /></b></span>
              <span>☕ Break: <b className="text-slate-700"><LocalTime t={att?.break_start} tz={tz} />–<LocalTime t={att?.break_end} tz={tz} /></b></span>
              <span>🏁 Out: <b className="text-slate-700"><LocalTime t={att?.clock_out} tz={tz} /></b></span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {canClockIn && <Punch type="in" label="🟢 Clock In" cls="btn-primary" />}
            {canBreakStart && <Punch type="break_start" label="☕ Break Start" />}
            {canBreakEnd && <Punch type="break_end" label="⏯ Break End" cls="btn-primary" />}
            {canClockOut && <Punch type="out" label="🏁 Clock Out" />}
          </div>
        </div>
      </div>

      {searchParams?.denied && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          🔒 You don&rsquo;t have access to the <b>{searchParams.denied}</b> module. Ask your agency owner to enable it for you in Team &amp; Permissions.
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Link href="/dashboard/bookings" className="btn-secondary px-3 py-1.5 text-xs">+ New booking</Link>
        <Link href="/dashboard/customers" className="btn-secondary px-3 py-1.5 text-xs">+ New customer</Link>
        <Link href="/dashboard/packages" className="btn-secondary px-3 py-1.5 text-xs">+ New package</Link>
        <Link href="/dashboard/tasks" className="btn-secondary px-3 py-1.5 text-xs">+ New task</Link>
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:shadow-md">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Recent bookings</h2>
      <Table head={['Ref', 'Customer', 'Package', 'Type', 'Departure', 'Amount', 'Status']}>
        {bookings.data?.length ? bookings.data.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50">
            <td className="px-4 py-2"><Link className="font-semibold text-gold hover:underline" href={`/dashboard/bookings/${b.id}`}>{b.booking_ref}</Link></td>
            <td className="px-4 py-2">{(b.customers as any | null)?.full_name}</td>
            <td className="px-4 py-2">{b.package_name || '—'}</td>
            <td className="px-4 py-2 capitalize">{b.trip_type}</td>
            <td className="px-4 py-2">{b.departure_date || '—'}</td>
            <td className="px-4 py-2">${Number(b.total_amount).toLocaleString()} {b.currency}</td>
            <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
          </tr>
        )) : <Empty msg="No bookings yet — create your first booking." />}
      </Table>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Upcoming flights</h2>
          <Table head={['Flight', 'Route', 'Departure', 'Status']}>
            {flights.data?.length ? flights.data.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-2 font-medium">{f.airline} {f.flight_no}</td>
                <td className="px-4 py-2">{f.departure_airport} → {f.arrival_airport}</td>
                <td className="px-4 py-2">{f.departure_time ? new Date(f.departure_time).toLocaleString([], { timeZone: tz || undefined }) : '—'}</td>
                <td className="px-4 py-2"><StatusBadge status={f.status} /></td>
              </tr>
            )) : <Empty msg="No flights scheduled." />}
          </Table>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Open tasks</h2>
          <Table head={['Task', 'Due', 'Priority', 'Status']}>
            {tasks.data?.length ? tasks.data.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-medium">{t.title}</td>
                <td className="px-4 py-2">{t.due_date || '—'}</td>
                <td className="px-4 py-2"><StatusBadge status={t.priority} /></td>
                <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
              </tr>
            )) : <Empty msg="No open tasks." />}
          </Table>
        </div>
      </div>
    </div>
  );
}
