import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { updateBookingStatus, addFlight, addHotel, addVisa, addTransport, updateRecord, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import SubmitButton from '@/components/submit-button';
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
        <div className="flex items-center gap-4">
        <a className="btn-primary" href={`/api/invoice-pdf?type=booking&id=${booking.id}`}>⬇ Download PDF invoice</a>
        <form action={updateBookingStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={booking.id} />
          <select name="status" defaultValue={booking.status} className="input w-40">
            {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <button className="btn-secondary" type="submit">Update</button>
        </form>
        </div>
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

      {/* edit booking */}
      <Section title="✏️ Edit booking">
        <form action={updateRecord} className="grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="table" value="bookings" />
          <input type="hidden" name="id" value={booking.id} />
          <Field label="Package name"><input className="input" name="package_name" defaultValue={booking.package_name || ''} /></Field>
          <Field label="Trip type">
            <select className="input" name="trip_type" defaultValue={booking.trip_type || 'umrah'}>
              {['umrah', 'hajj', 'ziyarah', 'holiday'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Pilgrims"><input className="input" name="pilgrims_count" type="number" defaultValue={booking.pilgrims_count || 1} /></Field>
          <Field label="Departure"><input className="input" name="departure_date" type="date" defaultValue={booking.departure_date || ''} /></Field>
          <Field label="Return"><input className="input" name="return_date" type="date" defaultValue={booking.return_date || ''} /></Field>
          <Field label="Currency"><input className="input" name="currency" defaultValue={booking.currency || 'USD'} /></Field>
          <Field label="Total amount"><input className="input" name="total_amount" type="number" step="0.01" defaultValue={booking.total_amount || ''} /></Field>
          <Field label="Paid amount"><input className="input" name="paid_amount" type="number" step="0.01" defaultValue={booking.paid_amount || ''} /></Field>
          <Field label="Status">
            <select className="input" name="status" defaultValue={booking.status}>
              {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notes"><input className="input" name="notes" defaultValue={booking.notes || ''} /></Field>
          <div className="flex items-end gap-3">
            <SubmitButton className="btn-primary px-4 py-2 text-xs">Save booking</SubmitButton>
            <form action={deleteRecord}>
              <input type="hidden" name="table" value="bookings" />
              <input type="hidden" name="id" value={booking.id} />
              <button className="btn-secondary px-4 py-2 text-xs text-red-500" type="submit">Delete booking</button>
            </form>
          </div>
        </form>
      </Section>

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
        <Table head={['Flight', 'Route', 'Departure', 'Arrival', 'PAX', 'Confirmation', 'Status', 'Actions']}>
          {flights.data?.length ? flights.data.map((f) => (
            <tr key={f.id}>
              <td className="px-4 py-2 font-medium">{f.airline} {f.flight_no}</td>
              <td className="px-4 py-2">{f.departure_airport} → {f.arrival_airport}</td>
              <td className="px-4 py-2">{f.departure_time ? new Date(f.departure_time).toLocaleString() : '—'}</td>
              <td className="px-4 py-2">{f.arrival_time ? new Date(f.arrival_time).toLocaleString() : '—'}</td>
              <td className="px-4 py-2">{f.pax_count}</td>
              <td className="px-4 py-2">{f.confirmation_code || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={f.status} /></td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <RowEdit table="flights" id={f.id} title="Edit flight">
                    <label className="text-[10px] text-slate-400">Airline</label><input className="input px-2 py-1 text-xs" name="airline" defaultValue={f.airline || ''} />
                    <label className="text-[10px] text-slate-400">Flight no</label><input className="input px-2 py-1 text-xs" name="flight_no" defaultValue={f.flight_no || ''} />
                    <label className="text-[10px] text-slate-400">From</label><input className="input px-2 py-1 text-xs" name="departure_airport" defaultValue={f.departure_airport || ''} />
                    <label className="text-[10px] text-slate-400">To</label><input className="input px-2 py-1 text-xs" name="arrival_airport" defaultValue={f.arrival_airport || ''} />
                    <label className="text-[10px] text-slate-400">Departure</label><input className="input px-2 py-1 text-xs" type="datetime-local" name="departure_time" defaultValue={f.departure_time ? new Date(f.departure_time).toISOString().slice(0, 16) : ''} />
                    <label className="text-[10px] text-slate-400">Arrival</label><input className="input px-2 py-1 text-xs" type="datetime-local" name="arrival_time" defaultValue={f.arrival_time ? new Date(f.arrival_time).toISOString().slice(0, 16) : ''} />
                    <label className="text-[10px] text-slate-400">PAX</label><input className="input px-2 py-1 text-xs" name="pax_count" type="number" defaultValue={f.pax_count || ''} />
                    <label className="text-[10px] text-slate-400">Confirmation code</label><input className="input px-2 py-1 text-xs" name="confirmation_code" defaultValue={f.confirmation_code || ''} />
                    <label className="text-[10px] text-slate-400">Status</label>
                    <select className="input px-2 py-1 text-xs" name="status" defaultValue={f.status}>
                      {['scheduled', 'confirmed', 'cancelled', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </RowEdit>
                  <form action={deleteRecord}><input type="hidden" name="table" value="flights" /><input type="hidden" name="id" value={f.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
                </div>
              </td>
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
        <Table head={['City', 'Hotel', 'Check-in', 'Check-out', 'Rooms', 'Meal plan', 'Status', 'Actions']}>
          {hotels.data?.length ? hotels.data.map((h) => (
            <tr key={h.id}>
              <td className="px-4 py-2 capitalize">{h.city}</td>
              <td className="px-4 py-2 font-medium">{h.hotel_name}</td>
              <td className="px-4 py-2">{h.check_in || '—'}</td>
              <td className="px-4 py-2">{h.check_out || '—'}</td>
              <td className="px-4 py-2">{h.rooms_count}</td>
              <td className="px-4 py-2">{h.meal_plan || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={h.status} /></td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <RowEdit table="hotels" id={h.id} title="Edit hotel">
                    <label className="text-[10px] text-slate-400">City</label><input className="input px-2 py-1 text-xs" name="city" defaultValue={h.city || ''} />
                    <label className="text-[10px] text-slate-400">Hotel name</label><input className="input px-2 py-1 text-xs" name="hotel_name" defaultValue={h.hotel_name || ''} />
                    <label className="text-[10px] text-slate-400">Check-in</label><input className="input px-2 py-1 text-xs" type="date" name="check_in" defaultValue={h.check_in || ''} />
                    <label className="text-[10px] text-slate-400">Check-out</label><input className="input px-2 py-1 text-xs" type="date" name="check_out" defaultValue={h.check_out || ''} />
                    <label className="text-[10px] text-slate-400">Rooms</label><input className="input px-2 py-1 text-xs" name="rooms_count" type="number" defaultValue={h.rooms_count || ''} />
                    <label className="text-[10px] text-slate-400">Room type</label><input className="input px-2 py-1 text-xs" name="room_type" defaultValue={h.room_type || ''} />
                    <label className="text-[10px] text-slate-400">Meal plan</label><input className="input px-2 py-1 text-xs" name="meal_plan" defaultValue={h.meal_plan || ''} />
                    <label className="text-[10px] text-slate-400">Confirmation code</label><input className="input px-2 py-1 text-xs" name="confirmation_code" defaultValue={h.confirmation_code || ''} />
                    <label className="text-[10px] text-slate-400">Status</label>
                    <select className="input px-2 py-1 text-xs" name="status" defaultValue={h.status}>
                      {['pending', 'confirmed', 'cancelled', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </RowEdit>
                  <form action={deleteRecord}><input type="hidden" name="table" value="hotels" /><input type="hidden" name="id" value={h.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
                </div>
              </td>
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
        <Table head={['Type', 'Applied', 'Visa no.', 'Status', 'Notes', 'Actions']}>
          {visas.data?.length ? visas.data.map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-2 capitalize">{v.visa_type}</td>
              <td className="px-4 py-2">{v.application_date || '—'}</td>
              <td className="px-4 py-2">{v.visa_no || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={v.status} /></td>
              <td className="px-4 py-2 text-slate-500">{v.notes || '—'}</td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <RowEdit table="visas" id={v.id} title="Edit visa">
                    <label className="text-[10px] text-slate-400">Visa type</label><input className="input px-2 py-1 text-xs" name="visa_type" defaultValue={v.visa_type || ''} />
                    <label className="text-[10px] text-slate-400">Application date</label><input className="input px-2 py-1 text-xs" type="date" name="application_date" defaultValue={v.application_date || ''} />
                    <label className="text-[10px] text-slate-400">Visa no.</label><input className="input px-2 py-1 text-xs" name="visa_no" defaultValue={v.visa_no || ''} />
                    <label className="text-[10px] text-slate-400">Notes</label><input className="input px-2 py-1 text-xs" name="notes" defaultValue={v.notes || ''} />
                    <label className="text-[10px] text-slate-400">Status</label>
                    <select className="input px-2 py-1 text-xs" name="status" defaultValue={v.status}>
                      {['pending', 'processing', 'issued', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </RowEdit>
                  <form action={deleteRecord}><input type="hidden" name="table" value="visas" /><input type="hidden" name="id" value={v.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
                </div>
              </td>
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
        <Table head={['Type', 'From → To', 'Date', 'Time', 'Vehicle', 'Driver', 'Status', 'Actions']}>
          {transports.data?.length ? transports.data.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-2 capitalize">{t.transport_type.replace(/_/g, ' ')}</td>
              <td className="px-4 py-2">{[t.from_location, t.to_location].filter(Boolean).join(' → ') || '—'}</td>
              <td className="px-4 py-2">{t.transport_date || '—'}</td>
              <td className="px-4 py-2">{t.transport_time || '—'}</td>
              <td className="px-4 py-2">{t.vehicle_type || '—'}</td>
              <td className="px-4 py-2">{t.driver_name || '—'}</td>
              <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <RowEdit table="transports" id={t.id} title="Edit transport">
                    <label className="text-[10px] text-slate-400">From</label><input className="input px-2 py-1 text-xs" name="from_location" defaultValue={t.from_location || ''} />
                    <label className="text-[10px] text-slate-400">To</label><input className="input px-2 py-1 text-xs" name="to_location" defaultValue={t.to_location || ''} />
                    <label className="text-[10px] text-slate-400">Date</label><input className="input px-2 py-1 text-xs" type="date" name="transport_date" defaultValue={t.transport_date || ''} />
                    <label className="text-[10px] text-slate-400">Time</label><input className="input px-2 py-1 text-xs" name="transport_time" defaultValue={t.transport_time || ''} />
                    <label className="text-[10px] text-slate-400">Vehicle</label><input className="input px-2 py-1 text-xs" name="vehicle_type" defaultValue={t.vehicle_type || ''} />
                    <label className="text-[10px] text-slate-400">Driver</label><input className="input px-2 py-1 text-xs" name="driver_name" defaultValue={t.driver_name || ''} />
                    <label className="text-[10px] text-slate-400">Driver phone</label><input className="input px-2 py-1 text-xs" name="driver_phone" defaultValue={t.driver_phone || ''} />
                    <label className="text-[10px] text-slate-400">Status</label>
                    <select className="input px-2 py-1 text-xs" name="status" defaultValue={t.status}>
                      {['pending', 'confirmed', 'cancelled', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </RowEdit>
                  <form action={deleteRecord}><input type="hidden" name="table" value="transports" /><input type="hidden" name="id" value={t.id} /><button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button></form>
                </div>
              </td>
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
