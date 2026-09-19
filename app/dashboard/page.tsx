import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';
import { PageHeader, StatusBadge, Table, Empty } from '@/components/ui';
import Link from 'next/link';

export default async function Overview() {
  const ctx = await requireActiveAgency();
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
    { label: 'Revenue collected', value: `$${revenue.toLocaleString()}`, href: '/dashboard/invoices' },
  ];

  return (
    <div>
      <PageHeader title={`Welcome back, ${ctx.profile?.full_name?.split(' ')[0] || ''}`} subtitle={`${ctx.agency.name} — Umrah, Hajj, Ziyarah operations`} />
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
                <td className="px-4 py-2">{f.departure_time ? new Date(f.departure_time).toLocaleString() : '—'}</td>
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
