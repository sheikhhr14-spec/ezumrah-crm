'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v === null || v === '' ? null : String(v);
};
const num = (fd: FormData, k: string, d = 0) => (str(fd, k) ? Number(str(fd, k)) : d);

async function agencyId() {
  const ctx = await requireActiveAgency();
  return ctx.profile.agency_id;
}

// ---------- CUSTOMERS ----------
export async function createCustomer(fd: FormData) {
  const db = createAdminClient();
  await db.from('customers').insert({
    agency_id: await agencyId(),
    full_name: str(fd, 'full_name'),
    email: str(fd, 'email'),
    phone: str(fd, 'phone'),
    whatsapp: str(fd, 'whatsapp'),
    country: str(fd, 'country'),
    passport_no: str(fd, 'passport_no'),
    notes: str(fd, 'notes'),
  });
  revalidatePath('/dashboard/customers');
}

// ---------- PACKAGES ----------
export async function createPackage(fd: FormData) {
  const db = createAdminClient();
  await db.from('packages').insert({
    agency_id: await agencyId(),
    name: str(fd, 'name'),
    service_type: str(fd, 'service_type') || 'umrah',
    duration_days: num(fd, 'duration_days'),
    description: str(fd, 'description'),
    price_from: num(fd, 'price_from'),
  });
  revalidatePath('/dashboard/packages');
}

// ---------- BOOKINGS ----------
export async function createBooking(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const count = await db.from('bookings').select('id', { count: 'exact', head: true }).eq('agency_id', aid);
  const ref = `EZ-${new Date().getFullYear()}-${String((count.count || 0) + 1).padStart(4, '0')}`;
  const { data } = await db.from('bookings').insert({
    agency_id: aid,
    booking_ref: ref,
    customer_id: str(fd, 'customer_id'),
    package_name: str(fd, 'package_name'),
    trip_type: str(fd, 'trip_type') || 'umrah',
    status: str(fd, 'status') || 'pending',
    pilgrims_count: num(fd, 'pilgrims_count', 1),
    departure_date: str(fd, 'departure_date'),
    return_date: str(fd, 'return_date'),
    total_amount: num(fd, 'total_amount'),
    currency: str(fd, 'currency') || 'USD',
    source: str(fd, 'source'),
    notes: str(fd, 'notes'),
  }).select('id').single();
  revalidatePath('/dashboard/bookings');
  if (data) redirect(`/dashboard/bookings/${data.id}`);
}

export async function updateBookingStatus(fd: FormData) {
  const db = createAdminClient();
  await db.from('bookings').update({ status: String(fd.get('status')) }).eq('id', String(fd.get('id')));
  revalidatePath(`/dashboard/bookings/${fd.get('id')}`);
  revalidatePath('/dashboard/bookings');
}

// ---------- SUB-RECORDS (flights, hotels, visas, transports incl. ziyarah) ----------
export async function addFlight(fd: FormData) {
  const db = createAdminClient();
  const bookingId = String(fd.get('booking_id'));
  await db.from('flights').insert({
    agency_id: await agencyId(),
    booking_id: bookingId,
    airline: str(fd, 'airline'),
    flight_no: str(fd, 'flight_no'),
    departure_airport: str(fd, 'departure_airport'),
    arrival_airport: str(fd, 'arrival_airport'),
    departure_time: str(fd, 'departure_time'),
    arrival_time: str(fd, 'arrival_time'),
    pax_count: num(fd, 'pax_count', 1),
    cabin_class: str(fd, 'cabin_class') || 'economy',
    confirmation_code: str(fd, 'confirmation_code'),
    status: str(fd, 'status') || 'scheduled',
  });
  revalidatePath(`/dashboard/bookings/${bookingId}`);
}

export async function addHotel(fd: FormData) {
  const db = createAdminClient();
  const bookingId = String(fd.get('booking_id'));
  await db.from('hotels').insert({
    agency_id: await agencyId(),
    booking_id: bookingId,
    city: str(fd, 'city') || 'makkah',
    hotel_name: str(fd, 'hotel_name'),
    check_in: str(fd, 'check_in'),
    check_out: str(fd, 'check_out'),
    nights: num(fd, 'nights'),
    room_type: str(fd, 'room_type'),
    rooms_count: num(fd, 'rooms_count', 1),
    meal_plan: str(fd, 'meal_plan'),
    confirmation_code: str(fd, 'confirmation_code'),
  });
  revalidatePath(`/dashboard/bookings/${bookingId}`);
}

export async function addVisa(fd: FormData) {
  const db = createAdminClient();
  const bookingId = String(fd.get('booking_id'));
  await db.from('visas').insert({
    agency_id: await agencyId(),
    booking_id: bookingId,
    visa_type: str(fd, 'visa_type') || 'umrah',
    application_date: str(fd, 'application_date'),
    visa_no: str(fd, 'visa_no'),
    status: str(fd, 'status') || 'applied',
    notes: str(fd, 'notes'),
  });
  revalidatePath(`/dashboard/bookings/${bookingId}`);
}

export async function addTransport(fd: FormData) {
  const db = createAdminClient();
  const bookingId = String(fd.get('booking_id'));
  await db.from('transports').insert({
    agency_id: await agencyId(),
    booking_id: bookingId,
    transport_type: str(fd, 'transport_type') || 'airport_transfer',
    from_location: str(fd, 'from_location'),
    to_location: str(fd, 'to_location'),
    transport_date: str(fd, 'transport_date'),
    transport_time: str(fd, 'transport_time'),
    vehicle_type: str(fd, 'vehicle_type'),
    seats: num(fd, 'seats'),
    driver_name: str(fd, 'driver_name'),
    driver_phone: str(fd, 'driver_phone'),
    status: str(fd, 'status') || 'scheduled',
  });
  revalidatePath(`/dashboard/bookings/${bookingId}`);
}

// ---------- INVOICES ----------
export async function createInvoice(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const count = await db.from('invoices').select('id', { count: 'exact', head: true }).eq('agency_id', aid);
  const no = `INV-${new Date().getFullYear()}-${String((count.count || 0) + 1).padStart(4, '0')}`;
  await db.from('invoices').insert({
    agency_id: aid,
    invoice_no: no,
    booking_id: str(fd, 'booking_id'),
    due_date: str(fd, 'due_date'),
    status: str(fd, 'status') || 'draft',
    subtotal: num(fd, 'subtotal'),
    tax_amount: num(fd, 'tax_amount'),
    total: num(fd, 'subtotal', 0) + num(fd, 'tax_amount', 0),
    currency: str(fd, 'currency') || 'USD',
    notes: str(fd, 'notes'),
  });
  revalidatePath('/dashboard/invoices');
}

// ---------- QUOTATIONS ----------
export async function createQuotation(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const count = await db.from('quotations').select('id', { count: 'exact', head: true }).eq('agency_id', aid);
  const no = `QT-${new Date().getFullYear()}-${String((count.count || 0) + 1).padStart(4, '0')}`;
  await db.from('quotations').insert({
    agency_id: aid,
    quote_no: no,
    customer_id: str(fd, 'customer_id'),
    valid_until: str(fd, 'valid_until'),
    status: str(fd, 'status') || 'draft',
    subtotal: num(fd, 'subtotal'),
    tax_amount: num(fd, 'tax_amount'),
    total: num(fd, 'subtotal', 0) + num(fd, 'tax_amount', 0),
    currency: str(fd, 'currency') || 'USD',
    notes: str(fd, 'notes'),
  });
  revalidatePath('/dashboard/quotations');
}

// ---------- DOCUMENTS ----------
export async function addDocument(fd: FormData) {
  const db = createAdminClient();
  await db.from('documents').insert({
    agency_id: await agencyId(),
    booking_id: str(fd, 'booking_id'),
    customer_id: str(fd, 'customer_id'),
    title: str(fd, 'title'),
    doc_type: str(fd, 'doc_type') || 'other',
    file_url: str(fd, 'file_url'),
    expiry_date: str(fd, 'expiry_date'),
    notes: str(fd, 'notes'),
  });
  revalidatePath('/dashboard/documents');
}

// ---------- TASKS ----------
export async function createTask(fd: FormData) {
  const db = createAdminClient();
  await db.from('tasks').insert({
    agency_id: await agencyId(),
    title: str(fd, 'title'),
    description: str(fd, 'description'),
    related_booking_id: str(fd, 'related_booking_id'),
    due_date: str(fd, 'due_date'),
    priority: str(fd, 'priority') || 'medium',
    assigned_to: str(fd, 'assigned_to'),
  });
  revalidatePath('/dashboard/tasks');
}

export async function toggleTask(fd: FormData) {
  const db = createAdminClient();
  const id = String(fd.get('id'));
  const next = String(fd.get('next')) === 'done' ? 'done' : 'todo';
  await db.from('tasks').update({ status: next }).eq('id', id);
  revalidatePath('/dashboard/tasks');
}

// ---------- FLIGHT / HOTEL / VISA / TRANSPORT status + delete ----------
export async function setRecordStatus(fd: FormData) {
  const db = createAdminClient();
  const table = String(fd.get('table')); // flights | hotels | visas | transports
  const id = String(fd.get('id'));
  if (!['flights', 'hotels', 'visas', 'transports'].includes(table)) throw new Error('bad table');
  const aid = await agencyId();
  const { data: rec } = await db.from(table).select('id, agency_id').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  await db.from(table).update({ status: String(fd.get('status')), updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/dashboard/${table}`);
}

export async function deleteRecord(fd: FormData) {
  const db = createAdminClient();
  const table = String(fd.get('table'));
  const id = String(fd.get('id'));
  if (!['flights', 'hotels', 'visas', 'transports'].includes(table)) throw new Error('bad table');
  const aid = await agencyId();
  const { data: rec } = await db.from(table).select('id, agency_id').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  await db.from(table).delete().eq('id', id);
  revalidatePath(`/dashboard/${table}`);
}
