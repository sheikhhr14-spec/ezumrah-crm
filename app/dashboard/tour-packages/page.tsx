import { requireModule } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, AddPanel, Empty, StatusBadge } from '@/components/ui';
import { money } from '@/lib/format';
import { createTourPackage, deleteTourPackage, createItineraryRow, deleteItineraryRow, createTourDeparture, deleteTourDeparture } from '@/lib/tour-actions';
import Link from 'next/link';

export default async function TourPackagesPage() {
  const ctx = await requireModule('tourpackages');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const [{ data: packages }, { data: itin }, { data: departures }] = await Promise.all([
    db.from('tour_packages').select('*').eq('agency_id', aid).order('created_at', { ascending: false }),
    db.from('tour_itinerary').select('*').eq('agency_id', aid).order('day_no'),
    db.from('tour_departures').select('*').eq('agency_id', aid).order('departure_date'),
  ]);
  return (
    <div>
      <PageHeader title="Tour Packages" subtitle="3-day, 4-day, 7-day and custom tours — with itineraries, ziyarat, inclusions and scheduled departures" />

      <AddPanel label="New tour package">
        <form action={createTourPackage} className="grid gap-3 sm:grid-cols-2">
          <input className="input" name="name" placeholder="Package name *" required />
          <select className="input" name="tour_type">
            <option value="3-day">3-day tour</option><option value="4-day">4-day tour</option>
            <option value="7-day">7-day tour</option><option value="custom">Custom tour</option>
          </select>
          <input className="input" name="days" type="number" placeholder="Total days" />
          <input className="input" name="base_price" type="number" step="0.01" placeholder="Base price per person" />
          <input className="input sm:col-span-2" name="inclusions" placeholder="Inclusions (transport, hotel, ziyarat, meals…)" />
          <input className="input sm:col-span-2" name="exclusions" placeholder="Exclusions (visa, insurance…)" />
          <input className="input sm:col-span-2" name="ziyarat" placeholder="Ziyarat included (locations)" />
          <input className="input sm:col-span-2" name="description" placeholder="Description" />
          <button className="btn-primary sm:col-span-2" type="submit">Save package</button>
        </form>
      </AddPanel>

      {(packages || []).length === 0 && <Empty msg="Create your first tour package above — then schedule departures under it." />}
      <div className="grid gap-4 xl:grid-cols-2">
        {(packages || []).map((p: any) => {
          const rows = (itin || []).filter((r: any) => r.package_id === p.id);
          const deps = (departures || []).filter((d: any) => d.package_id === p.id);
          return (
            <div key={p.id} className="card p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.tour_type} · {p.days} day(s) · {p.base_price ? money(Number(p.base_price), (ctx as any).agency?.currency) : '—'}</p>
                </div>
                <form action={deleteTourPackage}><input type="hidden" name="id" value={p.id} />
                  <button className="text-xs text-red-400 hover:text-red-600" type="submit">Delete</button></form>
              </div>
              {p.inclusions && <p className="mb-1 text-xs text-slate-600"><b>Incl:</b> {p.inclusions}</p>}
              {p.exclusions && <p className="mb-1 text-xs text-slate-600"><b>Excl:</b> {p.exclusions}</p>}
              {p.ziyarat && <p className="mb-2 text-xs text-slate-600"><b>Ziyarat:</b> {p.ziyarat}</p>}
              <div className="mb-3">
                <p className="mb-1 text-xs font-semibold text-slate-700">Itinerary & ziyarat schedule</p>
                {rows.map((r: any) => (
                  <p key={r.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className={`rounded px-1 ${r.kind === 'ziyarat' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>D{r.day_no} {r.kind === 'ziyarat' ? '🕌' : '📍'}</span>
                    <span className="flex-1 truncate"><b>{r.title}</b>{r.location ? ` · ${r.location}` : ''}{r.start_time ? ` · ${r.start_time}` : ''}</span>
                    <form action={deleteItineraryRow}><input type="hidden" name="id" value={r.id} /><button className="text-[10px] text-red-400" type="submit">✕</button></form>
                  </p>
                ))}
                <AddPanel label="Add itinerary / ziyarat row">
                  <form action={createItineraryRow} className="grid gap-2 sm:grid-cols-3">
                    <input type="hidden" name="package_id" value={p.id} />
                    <select className="input" name="kind"><option value="activity">Activity</option><option value="ziyarat">Ziyarat</option></select>
                    <input className="input" name="day_no" type="number" placeholder="Day no." />
                    <input className="input" name="title" placeholder="Title *" required />
                    <input className="input" name="location" placeholder="Location" />
                    <input className="input" name="start_time" placeholder="Time (e.g. 09:00)" />
                    <input className="input" name="notes" placeholder="Notes" />
                    <button className="btn-primary" type="submit">Add row</button>
                  </form>
                </AddPanel>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-700">Departures</p>
                {deps.map((d: any) => (
                  <p key={d.id} className="flex items-center gap-2 text-xs">
                    <Link className="accent flex-1 font-semibold hover:underline" href={`/dashboard/tour-ops/${d.id}`}>
                      {d.departure_date} → {d.return_date || '—'} <StatusBadge status={d.status} />
                    </Link>
                    <form action={deleteTourDeparture}><input type="hidden" name="id" value={d.id} /><button className="text-[10px] text-red-400" type="submit">✕</button></form>
                  </p>
                ))}
                <AddPanel label="Schedule departure">
                  <form action={createTourDeparture} className="grid gap-2 sm:grid-cols-3">
                    <input type="hidden" name="package_id" value={p.id} />
                    <input className="input" name="departure_date" type="date" required />
                    <input className="input" name="return_date" type="date" />
                    <select className="input" name="status"><option value="open">Open</option><option value="closed">Closed</option><option value="full">Full</option><option value="departed">Departed</option></select>
                    <input className="input" name="notes" placeholder="Notes" />
                    <button className="btn-primary" type="submit">Schedule</button>
                  </form>
                </AddPanel>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
