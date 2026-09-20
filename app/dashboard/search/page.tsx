import { requireActiveAgency } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

type AnyRow = Record<string, any>;

const SOURCES: {
  table: string; label: string; fields: string[];
  title: (r: AnyRow) => string; sub: (r: AnyRow) => string;
  href: (r: AnyRow) => string;
}[] = [
  { table: 'customers', label: 'Customers', fields: ['full_name', 'email', 'phone', 'passport_no'], title: (r) => r.full_name, sub: (r) => `${r.email || ''} · ${r.phone || ''} · ${r.country || ''}`, href: (r) => `/dashboard/customers/${r.id}` },
  { table: 'bookings', label: 'Bookings', fields: ['booking_ref', 'package_name'], title: (r) => `${r.booking_ref} — ${r.package_name}`, sub: (r) => `${r.pilgrims_count} pax · departs ${new Date(r.departure_date).toLocaleDateString()} · ${r.status}`, href: (r) => `/dashboard/bookings/${r.id}` },
  { table: 'invoices', label: 'Invoices', fields: ['invoice_no'], title: (r) => `${r.invoice_no} — ${r.status}`, sub: (r) => `Total ${r.total} ${r.currency} · due ${new Date(r.due_date).toLocaleDateString()}`, href: () => '/dashboard/invoices' },
  { table: 'quotations', label: 'Quotations', fields: ['quote_no'], title: (r) => `${r.quote_no} — ${r.status}`, sub: (r) => `Total ${r.total} ${r.currency} · valid until ${new Date(r.valid_until).toLocaleDateString()}`, href: () => '/dashboard/quotations' },
  { table: 'flight_sales', label: 'Flight Sales', fields: ['ref', 'pnr', 'ticket_numbers'], title: (r) => `${r.ref} — ${r.pax} pax · ${r.status}`, sub: (r) => `${r.pnr || ''} · ${r.payment_status}`, href: (r) => `/dashboard/flight-sales/${r.id}` },
  { table: 'hotel_sales', label: 'Hotel Sales', fields: ['ref', 'hotel_name', 'confirmation_code'], title: (r) => `${r.ref} — ${r.hotel_name}`, sub: (r) => `${r.city} · ${r.nights} nights · ${r.status}`, href: (r) => `/dashboard/hotel-sales/${r.id}` },
  { table: 'visa_sales', label: 'Visa Sales', fields: ['ref', 'visa_no'], title: (r) => `${r.ref} — ${r.visa_type}`, sub: (r) => `${r.pax} pax · ${r.processing_status}`, href: (r) => `/dashboard/visa-sales/${r.id}` },
  { table: 'transport_sales', label: 'Transport Sales', fields: ['ref', 'driver_name'], title: (r) => `${r.ref} — ${r.transport_type}`, sub: (r) => `${r.from_location} → ${r.to_location}`, href: (r) => `/dashboard/transport-sales/${r.id}` },
  { table: 'package_sales', label: 'Package Sales', fields: ['ref', 'package_name', 'pnr'], title: (r) => `${r.ref} — ${r.package_name}`, sub: (r) => `${r.pax} pax · ${r.status}`, href: (r) => `/dashboard/package-sales/${r.id}` },
  { table: 'leads', label: 'Leads', fields: ['full_name', 'phone', 'email'], title: (r) => r.full_name, sub: (r) => `${r.interest} · ${r.status}`, href: () => '/dashboard/leads' },
  { table: 'tasks', label: 'Tasks', fields: ['title', 'description'], title: (r) => r.title, sub: (r) => `${r.priority} · ${r.status}`, href: () => '/dashboard/tasks' },
  { table: 'employees', label: 'HR — Employees', fields: ['full_name', 'designation'], title: (r) => r.full_name, sub: (r) => `${r.designation} · ${r.department}`, href: () => '/dashboard/hr' },
];

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requireActiveAgency();
  const db = createAdminClient();
  const q = (searchParams?.q || '').trim();
  const safe = q.replace(/[,()*%]/g, ' ').trim();
  const like = `%${safe}%`;
  const aid = ctx.profile.agency_id;

  const groups: { label: string; rows: AnyRow[]; source: typeof SOURCES[number] }[] = [];
  if (safe.length >= 2) {
    for (const source of SOURCES) {
      const { data } = await db.from(source.table)
        .select('*')
        .eq('agency_id', aid)
        .or(source.fields.map((f) => `${f}.ilike.${like}`).join(','))
        .order('created_at', { ascending: false })
        .limit(6);
      if (data && data.length) groups.push({ label: source.label, rows: data, source });
    }
  }
  const total = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Search</h1>
        <p className="text-sm text-slate-500">
          {safe.length < 2 ? 'Type at least 2 characters in the search bar above.' : `${total} result${total === 1 ? '' : 's'} for “${q}”`}
        </p>
      </div>

      {safe.length >= 2 && total === 0 && (
        <div className="card p-8 text-center text-sm text-slate-500">No records match “{q}”. Try a name, reference number, phone or passport.</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g.label} className="card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{g.label} ({g.rows.length})</p>
            <div className="divide-y divide-slate-100">
              {g.rows.map((r) => (
                <Link key={r.id} href={g.source.href(r)} className="block py-2 accent-hover">
                  <p className="text-sm font-semibold text-slate-900">{g.source.title(r)}</p>
                  <p className="text-xs text-slate-500">{g.source.sub(r)}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
