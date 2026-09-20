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

async function currentProfileId(): Promise<string | null> {
  const ctx = await requireActiveAgency();
  return ctx.profile.id || null;
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
    notes: str(fd, 'notes'), created_by: await currentProfileId(),});
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
    notes: str(fd, 'notes'), created_by: await currentProfileId(),}).select('id').single();

  // AUTOMATION: auto-generate operations checklist for every new booking
  if (data) {
    const dep = str(fd, 'departure_date');
    const d = (offset: number) => {
      if (!dep) return null;
      const dt = new Date(dep); dt.setDate(dt.getDate() - offset);
      return dt.toISOString().slice(0, 10);
    };
    await db.from('tasks').insert([
      { agency_id: aid, related_booking_id: data.id, title: `Collect passports & documents (${ref})`, priority: 'high', status: 'todo', due_date: d(21) },
      { agency_id: aid, related_booking_id: data.id, title: `Apply for visas (${ref})`, priority: 'high', status: 'todo', due_date: d(18) },
      { agency_id: aid, related_booking_id: data.id, title: `Confirm hotels in Makkah & Madinah (${ref})`, priority: 'medium', status: 'todo', due_date: d(14) },
      { agency_id: aid, related_booking_id: data.id, title: `Issue flight tickets (${ref})`, priority: 'medium', status: 'todo', due_date: d(10) },
      { agency_id: aid, related_booking_id: data.id, title: `Arrange airport transfer (${ref})`, priority: 'low', status: 'todo', due_date: d(5) },
    ]);
  }
  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard/tasks');
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
    booking_id: bookingId || null,
    customer_id: String(fd.get('customer_id')) || null,
    trip_kind: str(fd, 'trip_kind') || 'oneway',
    amount: num(fd, 'amount'),
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
    booking_id: bookingId || null,
    customer_id: String(fd.get('customer_id')) || null,
    amount: num(fd, 'amount'),
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
    booking_id: bookingId || null,
    customer_id: String(fd.get('customer_id')) || null,
    amount: num(fd, 'amount'),
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
    booking_id: bookingId || null,
    customer_id: String(fd.get('customer_id')) || null,
    amount: num(fd, 'amount'),
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
  if (!EDITABLE[table]) throw new Error('bad table');
  const aid = await agencyId();
  const { data: rec } = await db.from(table).select('id, agency_id').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  await cleanupChildren(db, table, id);
  await db.from(table).delete().eq('id', id);
  revalidatePath(pathFor(table));
}

// removes child rows / storage files that belong to a record being deleted
async function cleanupChildren(db: any, table: string, id: string) {
  if (table === 'invoices') {
    await db.from('invoice_items').delete().eq('invoice_id', id);
  } else if (table === 'quotations') {
    await db.from('quotation_items').delete().eq('quotation_id', id);
  } else if (table === 'bookings') {
    for (const t of ['flights', 'hotels', 'visas', 'transports']) {
      await db.from(t).delete().eq('booking_id', id);
    }
  } else if (table === 'flight_sales') {
    await db.from('flight_sale_legs').delete().eq('flight_sale_id', id);
    await purgeSaleDocs(db, 'flight_sales', id);
  } else if (table === 'package_sales') {
    await db.from('package_sale_passengers').delete().eq('package_sale_id', id);
    await db.from('package_sale_transports').delete().eq('package_sale_id', id);
    await purgeSaleDocs(db, table, id);
  } else if (['hotel_sales', 'visa_sales', 'transport_sales'].includes(table)) {
    await purgeSaleDocs(db, table, id);
  } else if (table === 'support_tickets') {
    await db.from('support_ticket_replies').delete().eq('ticket_id', id);
  }
}

async function purgeSaleDocs(db: any, saleTable: string, saleId: string) {
  const { data: docs } = await db.from('sale_documents').select('storage_path')
    .eq('sale_table', saleTable).eq('sale_id', saleId);
  if (docs?.length) {
    await db.storage.from('sale-documents').remove(docs.map((d: any) => d.storage_path));
    await db.from('sale_documents').delete().eq('sale_table', saleTable).eq('sale_id', saleId);
  }
}

// ---------- LEADS (sales pipeline) ----------
export async function createLead(fd: FormData) {
  const db = createAdminClient();
  await db.from('leads').insert({
    agency_id: await agencyId(),
    full_name: str(fd, 'full_name'),
    phone: str(fd, 'phone'),
    whatsapp: str(fd, 'whatsapp'),
    email: str(fd, 'email'),
    country: str(fd, 'country'),
    source: str(fd, 'source') || 'website',
    interest: str(fd, 'interest') || 'umrah',
    budget: num(fd, 'budget'),
    assigned_to: str(fd, 'assigned_to'),
    notes: str(fd, 'notes'), created_by: await currentProfileId(),});
  revalidatePath('/dashboard/leads');
}

export async function setLeadStatus(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const { data: lead } = await db.from('leads').select('id, agency_id').eq('id', String(fd.get('id'))).single();
  if (!lead || lead.agency_id !== aid) throw new Error('Lead not found.');
  await db.from('leads').update({ status: String(fd.get('status')) }).eq('id', lead.id);
  revalidatePath('/dashboard/leads');
}

export async function deleteLead(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  await db.from('leads').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath('/dashboard/leads');
}

// AUTOMATION: convert lead -> customer, mark converted
export async function convertLead(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const { data: lead } = await db.from('leads').select('*').eq('id', String(fd.get('id'))).eq('agency_id', aid).single();
  if (!lead) throw new Error('Lead not found.');
  await db.from('customers').insert({
    agency_id: aid,
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    country: lead.country,
    notes: `Converted from lead (${lead.interest}). ${lead.notes || ''}`.trim(),
  });
  await db.from('leads').update({ status: 'converted' }).eq('id', lead.id);
  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard/customers');
}

// ---------- HR: EMPLOYEES ----------
export async function addEmployee(fd: FormData) {
  const db = createAdminClient();
  await db.from('employees').insert({
    agency_id: await agencyId(),
    full_name: str(fd, 'full_name'),
    email: str(fd, 'email'),
    phone: str(fd, 'phone'),
    designation: str(fd, 'designation'),
    department: str(fd, 'department'),
    join_date: str(fd, 'join_date'),
    monthly_salary: num(fd, 'monthly_salary'),
  });
  revalidatePath('/dashboard/hr');
}

export async function setEmployeeStatus(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const { data: emp } = await db.from('employees').select('id, agency_id').eq('id', String(fd.get('id'))).single();
  if (!emp || emp.agency_id !== aid) throw new Error('Employee not found.');
  await db.from('employees').update({ status: String(fd.get('status')) }).eq('id', emp.id);
  revalidatePath('/dashboard/hr');
}

export async function deleteEmployee(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  await db.from('employees').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath('/dashboard/hr');
}

// ---------- HR: ATTENDANCE ----------
export async function markAttendance(fd: FormData) {
  const db = createAdminClient();
  await db.from('attendance').upsert({
    agency_id: await agencyId(),
    employee_id: str(fd, 'employee_id'),
    att_date: str(fd, 'att_date') || new Date().toISOString().slice(0, 10),
    check_in: str(fd, 'check_in'),
    check_out: str(fd, 'check_out'),
    status: str(fd, 'status') || 'present',
  }, { onConflict: 'employee_id,att_date' });
  revalidatePath('/dashboard/hr/attendance');
}

// ---------- HR: LEAVES ----------
export async function applyLeave(fd: FormData) {
  const db = createAdminClient();
  await db.from('leaves').insert({
    agency_id: await agencyId(),
    employee_id: str(fd, 'employee_id'),
    leave_type: str(fd, 'leave_type') || 'annual',
    leave_from: str(fd, 'leave_from'),
    leave_to: str(fd, 'leave_to'),
    days: num(fd, 'days', 1),
    reason: str(fd, 'reason'),
  });
  revalidatePath('/dashboard/hr/leaves');
}

export async function setLeaveStatus(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const { data: lv } = await db.from('leaves').select('id, agency_id').eq('id', String(fd.get('id'))).single();
  if (!lv || lv.agency_id !== aid) throw new Error('Leave not found.');
  await db.from('leaves').update({ status: String(fd.get('status')) }).eq('id', lv.id);
  revalidatePath('/dashboard/hr/leaves');
}

// ---------- HR: PAYROLL ----------
export async function runPayroll(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const month = str(fd, 'pay_month') || new Date().toISOString().slice(0, 7);
  const { data: emps } = await db.from('employees').select('id, monthly_salary').eq('agency_id', aid).eq('status', 'active');
  if (!emps?.length) throw new Error('No active employees.');
  await db.from('payroll').upsert(
    (emps || []).map((e) => ({
      agency_id: aid,
      employee_id: e.id,
      pay_month: month,
      basic: Number(e.monthly_salary) || 0,
      allowances: 0,
      deductions: 0,
      net: Number(e.monthly_salary) || 0,
    })),
    { onConflict: 'employee_id,pay_month' }
  );
  revalidatePath('/dashboard/hr/payroll');
}

export async function updatePayrollLine(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: line } = await db.from('payroll').select('id, agency_id, basic').eq('id', id).single();
  if (!line || line.agency_id !== aid) throw new Error('Payroll record not found.');
  const allowances = num(fd, 'allowances');
  const deductions = num(fd, 'deductions');
  await db.from('payroll').update({
    allowances, deductions,
    net: Number(line.basic) + allowances - deductions,
  }).eq('id', id);
  revalidatePath('/dashboard/hr/payroll');
}

export async function markPayrollPaid(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: line } = await db.from('payroll').select('id, agency_id').eq('id', id).single();
  if (!line || line.agency_id !== aid) throw new Error('Payroll record not found.');
  await db.from('payroll').update({ status: 'paid', paid_on: new Date().toISOString().slice(0, 10) }).eq('id', id);
  revalidatePath('/dashboard/hr/payroll');
}

// ---------- ACCOUNTS ----------
export async function addExpense(fd: FormData) {
  const db = createAdminClient();
  await db.from('expenses').insert({
    agency_id: await agencyId(),
    category: str(fd, 'category') || 'other',
    description: str(fd, 'description'),
    amount: num(fd, 'amount'),
    expense_date: str(fd, 'expense_date'),
    payment_method: str(fd, 'payment_method') || 'bank',
    reference: str(fd, 'reference'),
  });
  revalidatePath('/dashboard/accounts');
}

export async function deleteExpense(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  await db.from('expenses').delete().eq('id', String(fd.get('id'))).eq('agency_id', aid);
  revalidatePath('/dashboard/accounts');
}

// AUTOMATION: record payment -> invoice goes partial/paid, booking paid_amount syncs
export async function recordPayment(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const invoiceId = str(fd, 'invoice_id');
  const amount = num(fd, 'amount');

  const { data: invoice } = await db.from('invoices').select('*, bookings(id, paid_amount)').eq('id', invoiceId!).eq('agency_id', aid).single();
  if (!invoice) throw new Error('Invoice not found in your agency.');

  await db.from('payments').insert({
    agency_id: aid,
    invoice_id: invoice.id,
    booking_id: invoice.booking_id,
    amount,
    payment_date: str(fd, 'payment_date'),
    method: str(fd, 'method') || 'bank',
    reference: str(fd, 'reference'),
  });

  // recalc invoice status from all payments
  const { data: allPays } = await db.from('payments').select('amount').eq('invoice_id', invoice.id);
  const paidTotal = (allPays || []).reduce((s, p) => s + Number(p.amount), 0);
  const invTotal = Number(invoice.total);
  const newStatus = paidTotal >= invTotal ? 'paid' : paidTotal > 0 ? 'partial' : invoice.status;
  await db.from('invoices').update({ status: newStatus }).eq('id', invoice.id);

  // sync booking paid_amount
  if (invoice.booking_id) {
    const { data: bkPays } = await db.from('payments').select('amount').eq('booking_id', invoice.booking_id);
    const bookingPaid = (bkPays || []).reduce((s, p) => s + Number(p.amount), 0);
    await db.from('bookings').update({ paid_amount: bookingPaid }).eq('id', invoice.booking_id);
  }
  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/bookings/${invoice.booking_id}`);
}

// ---------- GENERIC EDIT (whitelisted tables/fields) ----------
const EDITABLE: Record<string, string[]> = {
  customers: ['full_name', 'country', 'phone', 'whatsapp', 'passport_no', 'email', 'notes'],
  packages: ['name', 'service_type', 'duration_days', 'price_from', 'description'],
  bookings: ['package_name', 'trip_type', 'status', 'pilgrims_count', 'departure_date', 'return_date', 'total_amount', 'paid_amount', 'currency', 'notes'],
  flights: ['airline', 'flight_no', 'departure_airport', 'arrival_airport', 'departure_time', 'arrival_time', 'pax_count', 'cabin_class', 'confirmation_code', 'status', 'trip_kind', 'amount', 'customer_id'],
  hotels: ['city', 'hotel_name', 'check_in', 'check_out', 'nights', 'room_type', 'rooms_count', 'meal_plan', 'confirmation_code', 'status', 'amount', 'customer_id'],
  visas: ['visa_type', 'application_date', 'visa_no', 'status', 'notes', 'amount', 'customer_id'],
  transports: ['transport_type', 'from_location', 'to_location', 'transport_date', 'transport_time', 'vehicle_type', 'seats', 'driver_name', 'driver_phone', 'status', 'amount', 'customer_id'],
  invoices: ['issue_date', 'due_date', 'subtotal', 'tax_amount', 'total', 'status', 'notes'],
  quotations: ['valid_until', 'status', 'subtotal', 'tax_amount', 'notes'],
  documents: ['title', 'doc_type', 'expiry_date', 'file_url', 'notes'],
  tasks: ['title', 'due_date', 'priority', 'status', 'assigned_to'],
  leads: ['full_name', 'phone', 'whatsapp', 'email', 'country', 'source', 'interest', 'budget', 'assigned_to', 'notes'],
  employees: ['full_name', 'email', 'phone', 'designation', 'department', 'join_date', 'monthly_salary'],
  expenses: ['category', 'description', 'amount', 'expense_date', 'payment_method', 'reference'],
  payments: ['amount', 'payment_date', 'method', 'reference', 'notes'],
  leaves: ['leave_type', 'leave_from', 'leave_to', 'days', 'reason'],
  flight_sales: ['trip_kind', 'pax', 'admin_fee', 'tax', 'amount_paid', 'payment_method', 'notes', 'status', 'customer_id'],
  hotel_sales: ['hotel_name', 'city', 'check_in', 'check_out', 'nights', 'room_type', 'rooms_count', 'meal_plan', 'confirmation_code', 'sale_price', 'cost', 'admin_fee', 'tax', 'amount_paid', 'payment_method', 'notes', 'status', 'customer_id'],
  visa_sales: ['visa_type', 'application_date', 'visa_no', 'sale_price', 'cost', 'admin_fee', 'tax', 'amount_paid', 'payment_method', 'notes', 'status', 'customer_id'],
  transport_sales: ['transport_type', 'from_location', 'to_location', 'transport_date', 'transport_time', 'vehicle_type', 'seats', 'driver_name', 'driver_phone', 'sale_price', 'cost', 'admin_fee', 'tax', 'amount_paid', 'payment_method', 'notes', 'status', 'customer_id'],
  support_tickets: ['subject', 'priority', 'status'],
  package_sales: ['package_category', 'package_name', 'departure_date', 'return_date', 'pax',
    'airline', 'flight_no', 'from_airport', 'to_airport', 'depart_at', 'return_flight_no', 'pnr',
    'makkah_hotel', 'makkah_nights', 'madinah_hotel', 'madinah_nights',
    'tour_destination', 'tour_hotel', 'tour_nights',
    'rooms_quint', 'rooms_quad', 'rooms_triple', 'rooms_double', 'rooms_single',
    'sale_price', 'supplement', 'admin_fee', 'tax', 'discount', 'commission', 'cost',
    'amount_paid', 'payment_method', 'due_date', 'notes', 'status', 'customer_id',
    'ziyarat_scope', 'ziyarat_date', 'ziyarat_guide', 'ziyarat_notes'],
  attendance: ['att_date', 'check_in', 'check_out', 'status'],
  payroll: ['basic', 'allowances', 'deductions', 'net', 'status'],
};

function pathFor(table: string): string {
  if (table === 'support_tickets') return '/dashboard/support';
  if (table === 'package_sales') return '/dashboard/package-sales';
  if (table === 'attendance') return '/dashboard/hr/attendance';
  if (table === 'payroll') return '/dashboard/hr/payroll';
  if (table === 'employees') return '/dashboard/hr';
  if (table === 'leaves') return '/dashboard/hr/leaves';
  if (table === 'expenses' || table === 'payments') return '/dashboard/accounts';
  if (table === 'flight_sales') return '/dashboard/flight-sales';
  if (table === 'flight_sale_legs') return '/dashboard/flight-sales';
  if (table === 'hotel_sales') return '/dashboard/hotel-sales';
  if (table === 'visa_sales') return '/dashboard/visa-sales';
  if (table === 'transport_sales') return '/dashboard/transport-sales';
  return `/dashboard/${table}`;
}

export async function updateRecord(fd: FormData) {
  const db = createAdminClient();
  const table = String(fd.get('table'));
  const id = String(fd.get('id'));
  const allowed = EDITABLE[table];
  if (!allowed) throw new Error('This record type cannot be edited here.');
  const aid = await agencyId();
  const { data: rec } = await db.from(table).select('id, agency_id').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of allowed) {
    const v = fd.get(f);
    if (v !== null && String(v) !== '') patch[f] = String(v);
  }
  await db.from(table).update(patch).eq('id', id);
  revalidatePath(pathFor(table));
}


// ================= FLIGHT SALES (standalone, multi-leg) =================
async function recomputeSale(db: any, aid: string, saleId: string) {
  const { data: legs } = await db.from('flight_sale_legs').select('fare, tax, cost').eq('agency_id', aid).eq('flight_sale_id', saleId);
  const { data: sale } = await db.from('flight_sales').select('admin_fee, amount_paid, discount, commission, tax').eq('agency_id', aid).eq('id', saleId).single();
  if (!sale) return;
  const saleTotal = (legs || []).reduce((s: number, l: any) => s + Number(l.fare) + Number(l.tax), 0);
  const costTotal = (legs || []).reduce((s: number, l: any) => s + Number(l.cost), 0);
  const grand = saleTotal + Number(sale.admin_fee) - Number(sale.discount || 0) + Number(sale.tax || 0);
  const paid = Number(sale.amount_paid);
  const paymentStatus = paid <= 0 ? 'unpaid' : paid >= grand ? 'full' : 'partial';
  await db.from('flight_sales').update({
    sale_total: saleTotal, cost_total: costTotal, payment_status: paymentStatus,
    balance: grand - paid, profit: grand + Number(sale.commission || 0) - costTotal,
    updated_at: new Date().toISOString(),
  }).eq('id', saleId);
}

export async function createFlightSale(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  let customerId = String(fd.get('existing_customer_id')) || '';
  if (!customerId) {
    const name = str(fd, 'customer_name');
    if (name) {
      const { data: c } = await db.from('customers').insert({
        agency_id: aid, full_name: name, phone: str(fd, 'phone'), whatsapp: str(fd, 'whatsapp'),
        country: str(fd, 'country'), passport_no: str(fd, 'passport_no'),
      }).select('id').single();
      customerId = c?.id || '';
    }
  }
  const adminFee = num(fd, 'admin_fee');
  const discount = num(fd, 'discount');
  const commission = num(fd, 'commission');
  const amountPaid = num(fd, 'amount_paid');
  const legs: Record<string, unknown>[] = [];
  for (let i = 0; i < 20; i++) {
    if (fd.get(`leg_airline_${i}`) === null && fd.get(`leg_from_${i}`) === null) continue;
    if (!str(fd, `leg_airline_${i}`) && !str(fd, `leg_from_${i}`)) continue;
    legs.push({
      leg_no: legs.length + 1,
      airline: str(fd, `leg_airline_${i}`), flight_no: str(fd, `leg_flight_${i}`),
      from_airport: str(fd, `leg_from_${i}`), to_airport: str(fd, `leg_to_${i}`),
      depart_at: str(fd, `leg_depart_${i}`) || null, arrive_at: str(fd, `leg_arrive_${i}`) || null,
      cabin: str(fd, `leg_cabin_${i}`), fare: num(fd, `leg_fare_${i}`),
      tax: num(fd, `leg_tax_${i}`), cost: num(fd, `leg_cost_${i}`),
      ticket_no: str(fd, `leg_ticket_${i}`), baggage: str(fd, `leg_baggage_${i}`),
    });
  }
  const saleTotal = legs.reduce((s, l) => s + Number(l.fare) + Number(l.tax), 0);
  const costTotal = legs.reduce((s, l) => s + Number(l.cost), 0);
  const taxV = num(fd, 'tax');
  const grand = saleTotal + adminFee - discount + taxV;
  const paymentStatus = amountPaid <= 0 ? 'unpaid' : amountPaid >= grand ? 'full' : 'partial';
  const { count } = await db.from('flight_sales').select('id', { count: 'exact', head: true }).eq('agency_id', aid);
  const ref = `FS-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
  const { data: sale } = await db.from('flight_sales').insert({
    agency_id: aid, customer_id: customerId || null, ref,
    trip_kind: str(fd, 'trip_kind') || 'oneway', pax: num(fd, 'pax', 1),
    pnr: str(fd, 'pnr'), ticket_numbers: str(fd, 'ticket_numbers'),
    supplier: str(fd, 'supplier'), issue_date: str(fd, 'issue_date') || null,
    refundable: str(fd, 'refundable'), due_date: str(fd, 'due_date') || null,
    sold_by: ctx.profile.full_name || null,
    sale_total: saleTotal, cost_total: costTotal, admin_fee: adminFee, tax: taxV,
    discount: discount, commission: commission,
    amount_paid: amountPaid, payment_method: str(fd, 'payment_method'),
    payment_status: paymentStatus, notes: str(fd, 'notes'),
    status: str(fd, 'status') || 'confirmed',
    balance: grand - amountPaid, profit: grand + commission - costTotal,
  }).select('id').single();
  if (sale && legs.length) {
    await db.from('flight_sale_legs').insert(legs.map((l) => ({ ...l, agency_id: aid, flight_sale_id: sale.id })));
  }
  revalidatePath('/dashboard/flight-sales');
}

export async function updateSale(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: rec } = await db.from('flight_sales').select('id, agency_id').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  const amountPaid = num(fd, 'amount_paid');
  const adminFee = num(fd, 'admin_fee');
  const taxV = num(fd, 'tax');
  const patch: Record<string, unknown> = {
    admin_fee: adminFee, tax: taxV, amount_paid: amountPaid,
    discount: num(fd, 'discount'), commission: num(fd, 'commission'),
    due_date: str(fd, 'due_date') || null,
    payment_method: str(fd, 'payment_method'), notes: str(fd, 'notes'),
    status: str(fd, 'status') || 'confirmed',
    customer_id: String(fd.get('customer_id')) || null,
    updated_at: new Date().toISOString(),
  };
  await db.from('flight_sales').update(patch).eq('id', id);
  await recomputeSale(db, aid, id);
  revalidatePath(`/dashboard/flight-sales`);
  revalidatePath(`/dashboard/flight-sales/${id}`);
}

export async function updateSaleLeg(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('leg_id'));
  const saleId = String(fd.get('sale_id'));
  const { data: rec } = await db.from('flight_sale_legs').select('id, agency_id').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  await db.from('flight_sale_legs').update({
    airline: str(fd, 'airline'), flight_no: str(fd, 'flight_no'),
    from_airport: str(fd, 'from_airport'), to_airport: str(fd, 'to_airport'),
    depart_at: str(fd, 'depart_at') || null, arrive_at: str(fd, 'arrive_at') || null,
    cabin: str(fd, 'cabin'), fare: num(fd, 'fare'), tax: num(fd, 'tax'), cost: num(fd, 'cost'),
    ticket_no: str(fd, 'ticket_no'), baggage: str(fd, 'baggage'),
  }).eq('id', id);
  await recomputeSale(db, aid, saleId);
  revalidatePath(`/dashboard/flight-sales/${saleId}`);
}

export async function addSaleLeg(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const saleId = String(fd.get('sale_id'));
  const { data: rec } = await db.from('flight_sales').select('id, agency_id').eq('id', saleId).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  const { count } = await db.from('flight_sale_legs').select('id', { count: 'exact', head: true }).eq('flight_sale_id', saleId);
  await db.from('flight_sale_legs').insert({
    agency_id: aid, flight_sale_id: saleId, leg_no: (count || 0) + 1,
    airline: str(fd, 'airline'), flight_no: str(fd, 'flight_no'),
    from_airport: str(fd, 'from_airport'), to_airport: str(fd, 'to_airport'),
    depart_at: str(fd, 'depart_at') || null, arrive_at: str(fd, 'arrive_at') || null,
    cabin: str(fd, 'cabin'), fare: num(fd, 'fare'), tax: num(fd, 'tax'), cost: num(fd, 'cost'),
    ticket_no: str(fd, 'ticket_no'), baggage: str(fd, 'baggage'),
  });
  await recomputeSale(db, aid, saleId);
  revalidatePath(`/dashboard/flight-sales/${saleId}`);
}

export async function deleteSaleLeg(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('leg_id'));
  const saleId = String(fd.get('sale_id'));
  const { data: rec } = await db.from('flight_sale_legs').select('id, agency_id').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  await db.from('flight_sale_legs').delete().eq('id', id);
  await recomputeSale(db, aid, saleId);
  revalidatePath(`/dashboard/flight-sales/${saleId}`);
}


// ============ GENERIC STANDALONE SERVICE SALES (hotel / visa / transport) ============
async function saleCustomer(db: any, aid: string, fd: FormData): Promise<string> {
  let customerId = String(fd.get('existing_customer_id')) || '';
  if (!customerId) {
    const name = str(fd, 'customer_name');
    if (name) {
      const { data: c } = await db.from('customers').insert({
        agency_id: aid, full_name: name, phone: str(fd, 'phone'), whatsapp: str(fd, 'whatsapp'),
        country: str(fd, 'country'), passport_no: str(fd, 'passport_no'),
      }).select('id').single();
      customerId = c?.id || '';
    }
  }
  return customerId || '';
}

function saleStatus(grand: number, paid: number) {
  return paid <= 0 ? 'unpaid' : paid >= grand ? 'full' : 'partial';
}

export async function createServiceSale(fd: FormData) {
  const { SERVICE_SALES } = await import('@/lib/service-sales');
  const table = String(fd.get('table'));
  const cfg = SERVICE_SALES[table];
  if (!cfg) throw new Error('Unknown service type.');
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const customerId = await saleCustomer(db, aid, fd);
  const patch: Record<string, unknown> = {};
  for (const f of cfg.fields) patch[f.name] = f.type === 'number' ? num(fd, f.name) : (str(fd, f.name) || null);
  // auto: hotel nights from check-in/check-out dates
  if (table === 'hotel_sales' && patch.check_in && patch.check_out) {
    const n = Math.round((new Date(String(patch.check_out)).getTime() - new Date(String(patch.check_in)).getTime()) / 86400000);
    if (n > 0) patch.nights = n;
  }
  const adminFee = num(fd, 'admin_fee');
  const discount = num(fd, 'discount');
  const commission = num(fd, 'commission');
  const amountPaid = num(fd, 'amount_paid');
  let salePrice = num(fd, 'sale_price');
  // auto: hotel total price from rate/night x nights x rooms when not entered
  if (table === 'hotel_sales' && !salePrice && num(fd, 'rate_per_night') && Number(patch.nights || 0) > 0) {
    salePrice = num(fd, 'rate_per_night') * Number(patch.nights) * Math.max(num(fd, 'rooms_count'), 1);
  }
  const cost = num(fd, 'cost');
  // extra hotels (hotel_sales) / extra legs incl. ziyarat (transport_sales)
  const extras: Record<string, unknown>[] = [];
  let extrasPrice = 0, extrasCost = 0;
  for (let i = 0; i < 10; i++) {
    const price = num(fd, `extra_sale_price_${i}`);
    const ecost = num(fd, `extra_cost_${i}`);
    if (!price && !ecost) continue;
    extrasPrice += price; extrasCost += ecost;
    if (table === 'hotel_sales') {
      const ci = str(fd, `extra_checkin_${i}`) || null;
      const co = str(fd, `extra_checkout_${i}`) || null;
      let en: number | null = null;
      if (ci && co) { const d = Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000); if (d > 0) en = d; }
      extras.push({ agency_id: aid, city: str(fd, `extra_city_${i}`) || null, hotel_name: str(fd, `extra_hotel_${i}`) || null,
        check_in: ci, check_out: co, nights: en, room_type: str(fd, `extra_roomtype_${i}`) || null,
        rooms_count: num(fd, `extra_rooms_${i}`), meal_plan: str(fd, `extra_meal_${i}`) || null, sale_price: price, cost: ecost });
    } else if (table === 'transport_sales') {
      extras.push({ agency_id: aid, leg_no: extras.length + 1,
        from_location: str(fd, `extra_from_${i}`) || null, to_location: str(fd, `extra_to_${i}`) || null,
        transport_date: str(fd, `extra_date_${i}`) || null, transport_time: str(fd, `extra_time_${i}`) || null,
        vehicle_type: str(fd, `extra_vehicle_${i}`) || null, seats: num(fd, `extra_seats_${i}`),
        driver_name: str(fd, `extra_driver_${i}`) || null, driver_phone: str(fd, `extra_phone_${i}`) || null,
        sale_price: price, cost: ecost });
    }
  }
  const taxV = num(fd, 'tax');
  const grand = salePrice + extrasPrice + adminFee - discount + taxV;
  const { count } = await db.from(table).select('id', { count: 'exact', head: true }).eq('agency_id', aid);
  const ref = `${cfg.prefix}-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
  const { data: rec2 } = await db.from(table).insert({
    ...patch, agency_id: aid, customer_id: customerId || null, ref,
    sale_price: salePrice + extrasPrice, cost: cost + extrasCost, admin_fee: adminFee, tax: taxV,
    discount: discount, commission: commission,
    sold_by: ctx.profile.full_name || null,
    amount_paid: amountPaid, payment_method: str(fd, 'payment_method'),
    payment_status: saleStatus(grand, amountPaid), notes: str(fd, 'notes'),
    status: str(fd, 'status') || 'confirmed',
    balance: grand - amountPaid, profit: grand + commission - (cost + extrasCost),
  }).select('id').single();
  if (extras.length && rec2?.id) {
    const legTable = table === 'hotel_sales' ? 'hotel_sale_stays' : 'transport_sale_legs';
    const fk = table === 'hotel_sales' ? 'hotel_sale_id' : 'transport_sale_id';
    await db.from(legTable).insert(extras.map((e) => ({ ...e, [fk]: rec2.id })));
  }
  revalidatePath(`/dashboard/${cfg.route}`);
}

export async function updateServiceSale(fd: FormData) {
  const { SERVICE_SALES } = await import('@/lib/service-sales');
  const table = String(fd.get('table'));
  const cfg = SERVICE_SALES[table];
  if (!cfg) throw new Error('Unknown service type.');
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: rec } = await db.from(table).select('*').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of cfg.fields) {
    const v = fd.get(f.name);
    if (v !== null) patch[f.name] = f.type === 'number' ? num(fd, f.name) : (str(fd, f.name) || null);
  }
  // auto: hotel nights from check-in/check-out dates
  if (table === 'hotel_sales') {
    const ci = patch.check_in ?? rec.check_in;
    const co = patch.check_out ?? rec.check_out;
    if (ci && co) {
      const n = Math.round((new Date(String(co)).getTime() - new Date(String(ci)).getTime()) / 86400000);
      if (n > 0) patch.nights = n;
    }
  }
  let salePrice = fd.get('sale_price') !== null ? num(fd, 'sale_price') : Number(rec.sale_price);
  if (table === 'hotel_sales' && !salePrice) {
    const rate = fd.get('rate_per_night') !== null ? num(fd, 'rate_per_night') : Number(rec.rate_per_night || 0);
    const nights = Number(patch.nights ?? rec.nights ?? 0);
    const rooms = fd.get('rooms_count') !== null ? num(fd, 'rooms_count') : Number(rec.rooms_count || 1);
    if (rate && nights) salePrice = rate * nights * Math.max(rooms, 1);
  }
  const cost = fd.get('cost') !== null ? num(fd, 'cost') : Number(rec.cost);
  const adminFee = fd.get('admin_fee') !== null ? num(fd, 'admin_fee') : Number(rec.admin_fee);
  const discount = fd.get('discount') !== null ? num(fd, 'discount') : Number(rec.discount || 0);
  const commission = fd.get('commission') !== null ? num(fd, 'commission') : Number(rec.commission || 0);
  const amountPaid = fd.get('amount_paid') !== null ? num(fd, 'amount_paid') : Number(rec.amount_paid);
  if (fd.get('payment_method') !== null) patch.payment_method = str(fd, 'payment_method');
  if (fd.get('notes') !== null) patch.notes = str(fd, 'notes');
  if (String(fd.get('status'))) patch.status = String(fd.get('status'));
  if (String(fd.get('customer_id'))) patch.customer_id = String(fd.get('customer_id'));
  patch.sale_price = salePrice; patch.cost = cost; patch.admin_fee = adminFee; patch.amount_paid = amountPaid;
  patch.discount = discount; patch.commission = commission;
  const taxV = num(fd, 'tax');
  const grand = salePrice + adminFee - discount + taxV; // customer owes this
  patch.payment_status = saleStatus(grand, amountPaid); // always auto
  patch.balance = grand - amountPaid;
  patch.profit = grand + commission - cost;
  await db.from(table).update(patch).eq('id', id);
  revalidatePath(`/dashboard/${cfg.route}`);
  revalidatePath(`/dashboard/${cfg.route}/${id}`);
}


// ============ SALE DOCUMENTS (upload with compression, view/download/delete) ============
const SALE_DOC_TABLES: Record<string, string> = {
  flight_sales: 'flight-sales', hotel_sales: 'hotel-sales',
  visa_sales: 'visa-sales', transport_sales: 'transport-sales',
  package_sales: 'package-sales',
};

export async function uploadSaleDocument(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const table = String(fd.get('table'));
  const saleId = String(fd.get('sale_id'));
  const route = SALE_DOC_TABLES[table];
  if (!route) throw new Error('Unsupported module.');
  const { data: sale } = await db.from(table).select('id, agency_id').eq('id', saleId).single();
  if (!sale || sale.agency_id !== aid) throw new Error('Sale not found in your agency.');

  const file = fd.get('file') as File | null;
  if (!file || !file.size) throw new Error('No file selected.');
  const okMime = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!okMime.includes(file.type)) throw new Error('Only PDF, JPG, JPEG or PNG files are allowed.');
  if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10 MB).');

  let body: Buffer = Buffer.from(await file.arrayBuffer());
  let mime = file.type;
  // compress images (max 2000px, jpeg quality 72)
  if (file.type.startsWith('image/')) {
    const sharpMod = await import('sharp');
    body = await sharpMod.default(body)
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    mime = 'image/jpeg';
  }

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${aid}/${table}/${saleId}/${Date.now()}-${safe}`;
  const { error } = await db.storage.from('sale-documents').upload(path, body, { contentType: mime });
  if (error) throw new Error('Upload failed: ' + error.message);
  await db.from('sale_documents').insert({
    agency_id: aid, sale_table: table, sale_id: saleId,
    file_name: file.name, storage_path: path, mime, size_bytes: body.length,
  });
  revalidatePath(`/dashboard/${route}/${saleId}`);
}

export async function deleteSaleDocument(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: doc } = await db.from('sale_documents').select('*').eq('id', id).single();
  if (!doc || doc.agency_id !== aid) throw new Error('Document not found in your agency.');
  await db.storage.from('sale-documents').remove([doc.storage_path]);
  await db.from('sale_documents').delete().eq('id', id);
  revalidatePath(`/dashboard/${SALE_DOC_TABLES[doc.sale_table] || 'flight-sales'}/${doc.sale_id}`);
}


// ============ PACKAGE SALES (Umrah / Hajj / Tour) ============
const PKG_PREFIX: Record<string, string> = { umrah: 'UPS', hajj: 'HPS', tour: 'TPS' };

function packageGrand(r: any) {
  return Number(r.sale_price || 0) + Number(r.supplement || 0) + Number(r.admin_fee || 0) - Number(r.discount || 0) + Number(r.tax || 0);
}

export async function createPackageSale(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const customerId = await saleCustomer(db, aid, fd);
  const category = str(fd, 'package_category') || 'umrah';
  const { count } = await db.from('package_sales').select('id', { count: 'exact', head: true }).eq('agency_id', aid);
  const ref = `${PKG_PREFIX[category] || 'UPS'}-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
  // passengers (lead + family) sent as JSON array
  let passengers: any[] = [];
  try { passengers = JSON.parse(String(fd.get('passengers_json') || '[]')); } catch { passengers = []; }
  const paxCount = Math.max(passengers.length, 1);
  const rec: Record<string, unknown> = {
    agency_id: aid, customer_id: customerId || null, ref,
    package_category: category,
    package_name: str(fd, 'package_name'),
    departure_date: str(fd, 'departure_date') || null,
    return_date: str(fd, 'return_date') || null,
    pax: paxCount,
    airline: str(fd, 'airline'), flight_no: str(fd, 'flight_no'),
    from_airport: str(fd, 'from_airport'), to_airport: str(fd, 'to_airport'),
    depart_at: str(fd, 'depart_at') || null, return_flight_no: str(fd, 'return_flight_no'),
    pnr: str(fd, 'pnr'),

    ziyarat_scope: str(fd, 'ziyarat_scope') || 'none',
    ziyarat_date: str(fd, 'ziyarat_date') || null,
    ziyarat_guide: fd.get('ziyarat_guide') === 'on' || fd.get('ziyarat_guide') === 'true',
    ziyarat_notes: str(fd, 'ziyarat_notes'),
    makkah_hotel: str(fd, 'makkah_hotel'), makkah_nights: num(fd, 'makkah_nights'),
    madinah_hotel: str(fd, 'madinah_hotel'), madinah_nights: num(fd, 'madinah_nights'),
    tour_destination: str(fd, 'tour_destination'), tour_hotel: str(fd, 'tour_hotel'),
    tour_nights: num(fd, 'tour_nights'),
    rooms_quint: num(fd, 'rooms_quint'), rooms_quad: num(fd, 'rooms_quad'),
    rooms_triple: num(fd, 'rooms_triple'), rooms_double: num(fd, 'rooms_double'),
    rooms_single: num(fd, 'rooms_single'),
    sale_price: (Number(fd.get('price_per_person')) || 0) * paxCount || num(fd, 'sale_price'),
    supplement: num(fd, 'supplement'),
    admin_fee: num(fd, 'admin_fee'), tax: num(fd, 'tax'), discount: num(fd, 'discount'),
    commission: num(fd, 'commission'), cost: num(fd, 'cost'),
    amount_paid: num(fd, 'amount_paid'), payment_method: str(fd, 'payment_method'),
    due_date: str(fd, 'due_date') || null,
    sold_by: ctx.profile.full_name || null,
    notes: str(fd, 'notes'), status: str(fd, 'status') || 'confirmed',
  };
  const grand = packageGrand(rec as any);
  const paid = Number(rec.amount_paid);
  const { data: sale } = await db.from('package_sales').insert({
    ...rec,
    payment_status: saleStatus(grand, paid),
    balance: grand - paid,
    profit: grand + Number(rec.commission) - Number(rec.cost),
  }).select('id').single();
  let legs: any[] = [];
  try { legs = JSON.parse(String(fd.get('transports_json') || '[]')); } catch { legs = []; }
  if (sale && legs.length) {
    await db.from('package_sale_transports').insert(
      legs.filter((t) => t.from_location || t.to_location || t.company).map((t) => ({
        agency_id: aid, package_sale_id: sale.id,
        leg_type: t.leg_type || 'arrival', mode: t.mode || 'bus',
        company: t.company || null, from_location: t.from_location || null,
        to_location: t.to_location || null, leg_date: t.leg_date || null,
        seats: t.seats || null, pax_count: paxCount,
        notes: t.notes || null,
      })));
  }
  if (sale && passengers.length) {
    await db.from('package_sale_passengers').insert(
      passengers.filter((p) => p.full_name).map((p) => ({
        agency_id: aid, package_sale_id: sale.id,
        full_name: p.full_name, relationship: p.relationship || null,
        gender: p.gender || null, age: p.age ? Number(p.age) : null,
        passport_no: p.passport_no || null, room_type: p.room_type || null,
        seat_no: p.seat_no || null, notes: p.notes || null,
      })));
  }
  revalidatePath('/dashboard/package-sales');
  revalidatePath(`/dashboard/package-sales/${sale?.id || ''}`);
  revalidatePath(`/dashboard/${category === 'tour' ? 'tour' : category}-sales`);
}

export async function updatePackageSale(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: rec } = await db.from('package_sales').select('*').eq('id', id).single();
  if (!rec || rec.agency_id !== aid) throw new Error('Record not found in your agency.');
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of EDITABLE.package_sales) {
    const v = fd.get(f);
    if (v !== null) patch[f] = str(fd, f) === '' && !['pax','makkah_nights','madinah_nights','tour_nights','rooms_quint','rooms_quad','rooms_triple','rooms_double','rooms_single','sale_price','supplement','admin_fee','discount','commission','cost','amount_paid'].includes(f) ? null : (['pax','makkah_nights','madinah_nights','tour_nights','rooms_quint','rooms_quad','rooms_triple','rooms_double','rooms_single','sale_price','supplement','admin_fee','discount','commission','cost','amount_paid'].includes(f) ? num(fd, f) : str(fd, f));
  }
  const merged = { ...rec, ...patch } as any;
  const grand = packageGrand(merged);
  const paid = Number(merged.amount_paid || 0);
  patch.payment_status = saleStatus(grand, paid);
  patch.balance = grand - paid;
  patch.profit = grand + Number(merged.commission || 0) - Number(merged.cost || 0);
  await db.from('package_sales').update(patch).eq('id', id);
  revalidatePath('/dashboard/package-sales');
  revalidatePath(`/dashboard/package-sales/${id}`);
  const cat = String((patch.package_category as string) || rec.package_category || 'umrah');
  revalidatePath(`/dashboard/${cat === 'tour' ? 'tour' : cat}-sales`);
}

// ===== package sale passengers CRUD =====
export async function addPassenger(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const saleId = String(fd.get('package_sale_id'));
  const { data: sale } = await db.from('package_sales').select('id, agency_id, pax').eq('id', saleId).single();
  if (!sale || sale.agency_id !== aid) throw new Error('Sale not found in your agency.');
  const name = str(fd, 'full_name');
  if (!name) throw new Error('Passenger name is required.');
  await db.from('package_sale_passengers').insert({
    agency_id: aid, package_sale_id: saleId, full_name: name,
    relationship: str(fd, 'relationship'), gender: str(fd, 'gender'),
    age: num(fd, 'age'), passport_no: str(fd, 'passport_no'),
    room_type: str(fd, 'room_type'), seat_no: str(fd, 'seat_no'), notes: str(fd, 'notes'),
  });
  const { count } = await db.from('package_sale_passengers').select('id', { count: 'exact', head: true }).eq('package_sale_id', saleId);
  await db.from('package_sales').update({ pax: Math.max(count || 1, 1) }).eq('id', saleId);
  revalidatePath(`/dashboard/package-sales/${saleId}`);
}

export async function updatePassenger(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: p } = await db.from('package_sale_passengers').select('id, agency_id, package_sale_id').eq('id', id).single();
  if (!p || p.agency_id !== aid) throw new Error('Passenger not found in your agency.');
  await db.from('package_sale_passengers').update({
    full_name: str(fd, 'full_name'), relationship: str(fd, 'relationship'),
    gender: str(fd, 'gender'), age: num(fd, 'age'), passport_no: str(fd, 'passport_no'),
    room_type: str(fd, 'room_type'), seat_no: str(fd, 'seat_no'), notes: str(fd, 'notes'),
  }).eq('id', id);
  revalidatePath(`/dashboard/package-sales/${p.package_sale_id}`);
}

export async function deletePassenger(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: p } = await db.from('package_sale_passengers').select('id, agency_id, package_sale_id').eq('id', id).single();
  if (!p || p.agency_id !== aid) throw new Error('Passenger not found in your agency.');
  await db.from('package_sale_passengers').delete().eq('id', id);
  const { count } = await db.from('package_sale_passengers').select('id', { count: 'exact', head: true }).eq('package_sale_id', p.package_sale_id);
  await db.from('package_sales').update({ pax: Math.max(count || 1, 1) }).eq('id', p.package_sale_id);
  revalidatePath(`/dashboard/package-sales/${p.package_sale_id}`);
}


// ===== package sale transport legs CRUD =====
export async function addTransportLeg(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const saleId = String(fd.get('package_sale_id'));
  const { data: sale } = await db.from('package_sales').select('id, agency_id, pax').eq('id', saleId).single();
  if (!sale || sale.agency_id !== aid) throw new Error('Sale not found in your agency.');
  await db.from('package_sale_transports').insert({
    agency_id: aid, package_sale_id: saleId,
    leg_type: str(fd, 'leg_type') || 'arrival', mode: str(fd, 'mode') || 'bus',
    company: str(fd, 'company'), from_location: str(fd, 'from_location'),
    to_location: str(fd, 'to_location'), leg_date: str(fd, 'leg_date') || null,
    seats: str(fd, 'seats'), pax_count: sale.pax || 1, notes: str(fd, 'notes'),
  });
  revalidatePath(`/dashboard/package-sales/${saleId}`);
}

export async function updateTransportLeg(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: t } = await db.from('package_sale_transports').select('id, agency_id, package_sale_id').eq('id', id).single();
  if (!t || t.agency_id !== aid) throw new Error('Transport leg not found in your agency.');
  await db.from('package_sale_transports').update({
    leg_type: str(fd, 'leg_type'), mode: str(fd, 'mode'), company: str(fd, 'company'),
    from_location: str(fd, 'from_location'), to_location: str(fd, 'to_location'),
    leg_date: str(fd, 'leg_date') || null, seats: str(fd, 'seats'), notes: str(fd, 'notes'),
  }).eq('id', id);
  revalidatePath(`/dashboard/package-sales/${t.package_sale_id}`);
}

export async function deleteTransportLeg(fd: FormData) {
  const db = createAdminClient();
  const aid = await agencyId();
  const id = String(fd.get('id'));
  const { data: t } = await db.from('package_sale_transports').select('id, agency_id, package_sale_id').eq('id', id).single();
  if (!t || t.agency_id !== aid) throw new Error('Transport leg not found in your agency.');
  await db.from('package_sale_transports').delete().eq('id', id);
  revalidatePath(`/dashboard/package-sales/${t.package_sale_id}`);
}

// ============ AGENCY SETTINGS (owner) ============
export async function updateAgencySettings(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  if (ctx.role !== 'owner') throw new Error('Only the agency owner can change settings.');
  const aid = ctx.profile.agency_id!;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of ['name', 'brand_color', 'website', 'address', 'contact_email', 'contact_phone', 'country', 'currency', 'timezone', 'tax_no', 'tax_rate',
    'smtp_host', 'smtp_user', 'smtp_password', 'smtp_from_name', 'smtp_from_email']) {
    if (fd.get(f) !== null) patch[f] = str(fd, f);
  }
  if (fd.get('smtp_port') !== null) patch.smtp_port = num(fd, 'smtp_port');
  if (fd.get('smtp_secure') !== null) patch.smtp_secure = fd.get('smtp_secure') === 'true';
  if (fd.get('remove_logo') === 'true') patch.logo_url = null;
  patch.staff_privacy = fd.get('staff_privacy') === 'on';
  if (patch.tax_rate !== undefined && patch.tax_rate !== null && patch.tax_rate !== '') patch.tax_rate = Number(patch.tax_rate);
  if (patch.tax_rate === '') patch.tax_rate = 0;

  await db.from('agencies').update(patch).eq('id', aid);
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
}

// upload agency assets (logo / employee photo / employee contract) — owner or manager
export async function uploadAgencyAsset(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const kind = String(fd.get('kind'));
  const targetId = String(fd.get('target_id') || aid);
  const file = fd.get('file') as File | null;
  if (!file || !file.size) throw new Error('No file selected.');
  const okMime = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!okMime.includes(file.type)) throw new Error('Only PDF, JPG, JPEG or PNG files are allowed.');
  if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10 MB).');
  // owner-only for agency logo; managers may manage employee assets
  if (kind === 'logo' && ctx.role !== 'owner') throw new Error('Only the owner can change the agency logo.');

  let body: Buffer = Buffer.from(await file.arrayBuffer());
  let mime = file.type;
  if (file.type.startsWith('image/')) {
    const sharpMod = await import('sharp');
    body = await sharpMod.default(body)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    mime = 'image/jpeg';
  }
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${aid}/${kind}/${Date.now()}-${safe}`;
  const { error } = await db.storage.from('agency-assets').upload(path, body, { contentType: mime });
  if (error) throw new Error('Upload failed: ' + error.message);
  const { data: pub } = db.storage.from('agency-assets').getPublicUrl(path);

  if (kind === 'logo') {
    await db.from('agencies').update({ logo_url: pub.publicUrl, updated_at: new Date().toISOString() }).eq('id', aid);
    revalidatePath('/dashboard/settings');
  } else if (kind === 'employee_photo' || kind === 'employee_contract') {
    const { data: emp } = await db.from('employees').select('id, agency_id').eq('id', targetId).single();
    if (!emp || emp.agency_id !== aid) throw new Error('Employee not found in your agency.');
    await db.from('employees').update(
      kind === 'employee_photo' ? { photo_url: pub.publicUrl } : { contract_path: pub.publicUrl }
    ).eq('id', targetId);
    revalidatePath(`/dashboard/hr/${targetId}`);
  }
}

export async function updateEmployeeProfile(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const id = String(fd.get('id'));
  const { data: emp } = await db.from('employees').select('id, agency_id').eq('id', id).single();
  if (!emp || emp.agency_id !== aid) throw new Error('Employee not found in your agency.');
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of ['full_name', 'email', 'phone', 'designation', 'department', 'join_date',
    'monthly_salary', 'status', 'notes', 'national_id', 'bank_name', 'account_title', 'account_no', 'bank_code']) {
    if (fd.get(f) !== null) patch[f] = f === 'monthly_salary' ? num(fd, f) : (str(fd, f) || null);
  }
  if (fd.get('remove_photo') === 'true') patch.photo_url = null;
  if (fd.get('remove_contract') === 'true') patch.contract_path = null;
  await db.from('employees').update(patch).eq('id', id);
  revalidatePath(`/dashboard/hr/${id}`);
  revalidatePath('/dashboard/hr');
}


// ============ NOTIFICATIONS (auto-synced alerts per agency) ============
export async function syncNotifications() {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const overdueCount = async (table: string) => {
    const { count } = await db.from(table).select('id', { count: 'exact', head: true })
      .eq('agency_id', aid).gt('balance', 0).lt('due_date', today);
    return count || 0;
  };
  const [fs, hs, vs, ts, ps, departsR, saasR, visaR] = await Promise.all([
    overdueCount('flight_sales'), overdueCount('hotel_sales'), overdueCount('visa_sales'),
    overdueCount('transport_sales'), overdueCount('package_sales'),
    db.from('package_sales').select('id', { count: 'exact', head: true }).eq('agency_id', aid).gte('departure_date', today).lte('departure_date', in30),
    db.from('saas_invoices').select('id', { count: 'exact', head: true }).eq('agency_id', aid).eq('status', 'unpaid').lt('due_date', today),
    db.from('visa_sales').select('id', { count: 'exact', head: true }).eq('agency_id', aid).gte('expiry_date', today).lte('expiry_date', in30),
  ]);
  const overdue = fs + hs + vs + ts + ps;
  const visaExp = visaR?.count || 0;
  const departs = departsR?.count || 0;
  const saasCount = saasR?.count || 0;

  const alerts: { kind: string; key: string; title: string; body: string; href: string }[] = [];
  if (overdue > 0) alerts.push({ kind: 'overdue', key: 'overdue-payments', title: `${overdue} overdue payment${overdue > 1 ? 's' : ''}`,
    body: 'Customer balances are past their due date. Follow up now.', href: '/dashboard/reports' });
  if (visaExp > 0) alerts.push({ kind: 'visa', key: 'visa-expiry', title: `${visaExp} visa${visaExp > 1 ? 's' : ''} expiring soon`,
    body: 'Issued visas expire within 30 days.', href: '/dashboard/visa-sales' });
  if (departs > 0) alerts.push({ kind: 'departure', key: 'upcoming-departures', title: `${departs} departure${departs > 1 ? 's' : ''} in 30 days`,
    body: 'Package groups travelling this month. Confirm bookings & docs.', href: '/dashboard/package-sales' });
  if (saasCount > 0 && ctx.role === 'owner') alerts.push({ kind: 'saas', key: 'saas-unpaid', title: 'CRM subscription unpaid',
    body: 'Your EzUmrah CRM invoice is past its due date.', href: '/dashboard/billing' });

  if (alerts.length) {
    await db.from('notifications').upsert(
      alerts.map((x) => ({ agency_id: aid, ...x })), { onConflict: 'agency_id,key' }
    );
  }
  const keys = alerts.map((x) => x.key);
  const { data } = await db.from('notifications').select('id, title, body, href, read, created_at')
    .eq('agency_id', aid).order('created_at', { ascending: false }).limit(20);
  // drop alerts that no longer apply (e.g. everything got paid)
  const stale = (data || []).filter((n: any) => !keys.includes(n.key)).map((n: any) => n.id);
  if (stale.length) await db.from('notifications').delete().in('id', stale);
  return (data || []).filter((n: any) => keys.includes(n.key));
}

export async function markAllNotificationsRead() {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  await db.from('notifications').update({ read: true }).eq('agency_id', ctx.profile.agency_id!);
  revalidatePath('/dashboard');
}

// ============ CLOCK IN / OUT & BREAK (agency staff self-service) ============
export async function punchClock(fd: FormData) {
  const db = createAdminClient();
  const ctx = await requireActiveAgency();
  const aid = ctx.profile.agency_id!;
  const pid = ctx.profile.id;
  const type = String(fd.get('type'));
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const { data: row } = await db.from('user_attendance')
    .select('*').eq('profile_id', pid).eq('att_date', today).maybeSingle();

  if (!row) {
    if (type !== 'in') throw new Error('Clock in first.');
    await db.from('user_attendance').insert({
      agency_id: aid, profile_id: pid, att_date: today, clock_in: now,
    });
  } else if (type === 'in') {
    throw new Error('Already clocked in today.');
  } else if (type === 'break_start') {
    if (!row.clock_in || row.clock_out) throw new Error('Not clocked in.');
    if (row.break_start) throw new Error('Break already started.');
    await db.from('user_attendance').update({ break_start: now, updated_at: now }).eq('id', row.id);
  } else if (type === 'break_end') {
    if (!row.break_start || row.break_end) throw new Error('No break running.');
    await db.from('user_attendance').update({ break_end: now, updated_at: now }).eq('id', row.id);
  } else if (type === 'out') {
    if (!row.clock_in || row.clock_out) throw new Error('Not clocked in.');
    await db.from('user_attendance').update({ clock_out: now, updated_at: now }).eq('id', row.id);
  }
  revalidatePath('/dashboard');
}
