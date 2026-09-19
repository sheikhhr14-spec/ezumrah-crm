import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { updateBookingStatus, addFlight, addHotel, addVisa, addTransport } from '@/lib/crm-actions';
import { Table, Empty, StatusBadge, AddPanel, Field } from '@/components/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-8">
    <h2 className="mb-3 text-lg font-semibold">{title}</h2>
    {children}
  </div>
);

export default async function BookingDetail({ params }: { params: { id: string } }) {
  const ctx = await requireModule('bookings');
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();

  const { data: booking } = await db
    .from('bookings').select('*, customers(full_name, phone, whatsapp, country, passport_no)')
    .eq('id', params.id).eq('agency_id', aid).single();
  if (!booking) notFound();

  const [flights, hotels, visas, transports, documents] = await Promise.all([
    db.from('flights').select('*').eq('booking_id', booking.id),
    db.from('hotels').select('*').eq('booking_id', booking.id),
    db.from('visas').select('*').eq('booking_id', booking.id),
    db.from('transports').select('*').eq('booking_id', booking.id),
    db.from('documents').select('*').eq('booking_id', booking.id),
  ]);

  const c = booking.customers as { full_name: string | null; phone: string | null; whatsapp: string | null; country: string | null; passport_no: string | null } | null;
  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href="/dashboard/bookings">← All bookings</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{booking.booking_ref}</h1>
          <p className="text-sm text-slate-500">{c?.full_name} · {booking.pilgrims_count} pilgrim(s) · {booking.trip_type}</p>
        </div>
        <form action={updateBookingStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={booking.id} />
          <select name="status" defaultValue={booking.status} className="input w-40">
            {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <button className="btn-secondary" type="submit">Update</button>
        </form>
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-4">
        <div><p className="text-xs uppercase text-slate-400">Status</p><div className="mt-1"><StatusBadge status={booking.status} /></div></div>
        <div><p className="text-xs uppercase text-slate-400">Amount</p><p className="mt-1 font-semibold">${Number(booking.total_amount).toLocaleString()} {booking.currency}</p></div>
        <div><p className="text-xs uppercase text-slate-400">Departure</p><p className="mt-1 font-semibold">{booking.departure_date || '—'}</p></div>
        <div><p className="text-xs uppercase text-slate-400">Return</p><p className="mt-1 font-semibold">{booking.return_date || '—'}</p></div>
        <div><p className="text-xs uppercase text-slate-400">Phone</p><p className="mt-1 font-semibold">{c?.phone || '—'}</p></div>
        <div><p className="text-xs uppercase text-slate-400">WhatsApp</p><p className="mt-1 font-semibold">{c?.whatsapp || '—'}</p></div>
        <div><p className="text-xs uppercase text-slate-400">Passport</p><p className="mt-1 font-semibold">{c?.passport_no || '—'}</p></div>
        <div><p className="text-xs uppercase text-slate-400">Country</p><p className="mt-1 font-semibold">{c?.country || '—'}</p></div>
      </div>

      <Section title="✈️ Flights">
        <AddPanel label="Add flight">
          <form action={addFlight} className="grid gap-4 sm:grid-cols-4">
            <input type="hidden" name="booking_id" value={booking.id} />
            <Field label="Airline"><input className="input" name="airline" placeholder="Saudia / PIA" /></Field>
            <Field label="Flight no."><input className="input" name="flight_no" /></Field>
            <Field label="From"><input className="input" name="departure_airport" placeholder="LHE" /></Field>
            <Field label="To"><input className="input" name="arrival_airport" placeholder="JED" /></Field>
            <Field label="Departure"><input className="input" name="departure_time" type="datetime-local" /></Field>
            <Field label="Arrival"><input className="input" name="arrival_time" type="datetime-local" /></Field>
            <Field label="PAX"><input className="input" name="pax_count" type="number" defaultValue={booking.pilgrims_count} /></Field>
            <Field label="Confirmation"><input className="input" name="confirmation_code" /></Field>
            <div className="sm:col-span-4"><button className="btn-primary" type="submit">Save flight</button></div>
          </form>
        </AddPanel>
        <Table head={['Flight', 'Route', 'Departure', 'Arrival', 'PAX', 'Confirmation', 'Status']}>
          {flights.data?.length ? flights.data.map((f) => (
            <tr key={f.id}>
              <td className="px-4 py-2 font-medium">{f.airline} {f.flight_no}</td>
              <td className="px-4 py-2">{f.departure_airport} → {f.arrival_airport}</td>
              <td className="px-4 py-2">{f.departure_time ? new Date(f.departure_time).toLocaleString() : '—'}</td>
              <td className="px-4 py-2">{f.arrival_time ? new Date(f.arrival_time).toLocaleString() : '—'}</td>
              <td className="px-4 py-2">{f.pax_count}</td>
              <td className="px-4 py-2">{f.confirmation_code || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={f.status} /></td>
            </tr>
          )) : <Empty msg="No flights yet." />}
        </Table>
      </Section>

      <Section title="🏨 Hotels">
        <AddPanel label="Add hotel">
          <form action={addHotel} className="grid gap-4 sm:grid-cols-4">
            <input type="hidden" name="booking_id" value={booking.id} />
            <Field label="City"><select className="input" name="city"><option value="makkah">Makkah</option><option value="madinah">Madinah</option><option value="jeddah">Jeddah</option><option value="taif">Taif</option><option value="other">Other</option></select></Field>
            <Field label="Hotel name"><input className="input" name="hotel_name" required /></Field>
            <Field label="Check-in"><input className="input" name="check_in" type="date" /></Field>
            <Field label="Check-out"><input className="input" name="check_out" type="date" /></Field>
            <Field label="Room type"><input className="input" name="room_type" placeholder="Quad / Triple" /></Field>
            <Field label="Rooms"><input className="input" name="rooms_count" type="number" defaultValue={1} /></Field>
            <Field label="Meal plan"><input className="input" name="meal_plan" placeholder="Breakfast" /></Field>
            <Field label="Confirmation"><input className="input" name="confirmation_code" /></Field>
            <div className="sm:col-span-4"><button className="btn-primary" type="submit">Save hotel</button></div>
          </form>
        </AddPanel>
        <Table head={['City', 'Hotel', 'Check-in', 'Check-out', 'Rooms', 'Meal plan', 'Status']}>
          {hotels.data?.length ? hotels.data.map((h) => (
            <tr key={h.id}>
              <td className="px-4 py-2 capitalize">{h.city}</td>
              <td className="px-4 py-2 font-medium">{h.hotel_name}</td>
              <td className="px-4 py-2">{h.check_in || '—'}</td>
              <td className="px-4 py-2">{h.check_out || '—'}</td>
              <td className="px-4 py-2">{h.rooms_count}</td>
              <td className="px-4 py-2">{h.meal_plan || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={h.status} /></td>
            </tr>
          )) : <Empty msg="No hotels yet." />}
        </Table>
      </Section>

      <Section title="🛂 Visas">
        <AddPanel label="Add visa">
          <form action={addVisa} className="grid gap-4 sm:grid-cols-4">
            <input type="hidden" name="booking_id" value={booking.id} />
            <Field label="Visa type"><select className="input" name="visa_type"><option value="umrah">Umrah</option><option value="hajj">Hajj</option><option value="visit">Visit</option></select></Field>
            <Field label="Applied date"><input className="input" name="application_date" type="date" /></Field>
            <Field label="Visa no."><input className="input" name="visa_no" /></Field>
            <Field label="Status"><select className="input" name="status">{['applied', 'processing', 'issued', 'rejected', 'expired'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            <Field label="Notes" span><input className="input" name="notes" /></Field>
            <div className="sm:col-span-4"><button className="btn-primary" type="submit">Save visa</button></div>
          </form>
        </AddPanel>
        <Table head={['Type', 'Applied', 'Visa no.', 'Status', 'Notes']}>
          {visas.data?.length ? visas.data.map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-2 capitalize">{v.visa_type}</td>
              <td className="px-4 py-2">{v.application_date || '—'}</td>
              <td className="px-4 py-2">{v.visa_no || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={v.status} /></td>
              <td className="px-4 py-2 text-slate-500">{v.notes || '—'}</td>
            </tr>
          )) : <Empty msg="No visas yet." />}
        </Table>
      </Section>

      <Section title="🚌 Transport & Ziyarah">
        <AddPanel label="Add transport / ziyarah">
          <form action={addTransport} className="grid gap-4 sm:grid-cols-4">
            <input type="hidden" name="booking_id" value={booking.id} />
            <Field label="Type"><select className="input" name="transport_type"><option value="airport_transfer">Airport transfer</option><option value="intercity">Intercity (Makkah ↔ Madinah)</option><option value="local">Local</option><option value="ziyarah">Ziyarah tour</option></select></Field>
            <Field label="From"><input className="input" name="from_location" /></Field>
            <Field label="To"><input className="input" name="to_location" /></Field>
            <Field label="Date"><input className="input" name="transport_date" type="date" /></Field>
            <Field label="Time"><input className="input" name="transport_time" placeholder="09:00" /></Field>
            <Field label="Vehicle"><input className="input" name="vehicle_type" placeholder="Bus / GMC" /></Field>
            <Field label="Driver"><input className="input" name="driver_name" /></Field>
            <Field label="Driver phone"><input className="input" name="driver_phone" /></Field>
            <div className="sm:col-span-4"><button className="btn-primary" type="submit">Save transport</button></div>
          </form>
        </AddPanel>
        <Table head={['Type', 'From → To', 'Date', 'Time', 'Vehicle', 'Driver', 'Status']}>
          {transports.data?.length ? transports.data.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-2 capitalize">{t.transport_type.replace(/_/g, ' ')}</td>
              <td className="px-4 py-2">{[t.from_location, t.to_location].filter(Boolean).join(' → ') || '—'}</td>
              <td className="px-4 py-2">{t.transport_date || '—'}</td>
              <td className="px-4 py-2">{t.transport_time || '—'}</td>
              <td className="px-4 py-2">{t.vehicle_type || '—'}</td>
              <td className="px-4 py-2">{t.driver_name || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
            </tr>
          )) : <Empty msg="No transport yet." />}
        </Table>
      </Section>

      <Section title="📄 Documents">
        <Table head={['Title', 'Type', 'Expires', 'Link']}>
          {documents.data?.length ? documents.data.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-2 font-medium">{d.title}</td>
              <td className="px-4 py-2 capitalize">{d.doc_type.replace(/_/g, ' ')}</td>
              <td className="px-4 py-2">{d.expiry_date || '—'}</td>
              <td className="px-4 py-2">{d.file_url ? <a className="text-gold hover:underline" href={d.file_url} target="_blank" rel="noreferrer">Open</a> : '—'}</td>
            </tr>
          )) : <Empty msg="No documents on this booking." />}
        </Table>
        <p className="mt-2 text-sm text-slate-400">Upload documents from the Documents page.</p>
      </Section>
    </div>
  );
}
