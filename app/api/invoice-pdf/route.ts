import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getCurrentUser } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';

// Helvetica (WinAnsi) can't encode arrows/unicode — sanitize every string we draw
const clean = (t: string) => (t || '')
  .replace(/→/g, '->').replace(/←/g, '<-').replace(/[—–]/g, '-').replace(/…/g, '...')
  .replace(/·/g, '-').replace(/[^ -~]/g, '');

const GOLD = rgb(0.72, 0.57, 0.25);
const DARK = rgb(0.1, 0.1, 0.12);
const GRAY = rgb(0.45, 0.45, 0.5);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || '';
  const id = url.searchParams.get('id') || '';
  const TYPES = ['booking', 'quotation', 'invoice', 'package', 'flight', 'hotel', 'transport', 'visa', 'flightsale', 'hotel_sale', 'visa_sale', 'transport_sale'];
  if (!TYPES.includes(type) || !id) return new Response('Bad request', { status: 400 });

  const ctx = await getCurrentUser();
  const profile: any = ctx?.profile;
  if (!profile?.agency_id) return new Response('Forbidden', { status: 403 });
  const aid = profile.agency_id;
  const agency = profile.agencies || {};

  const db = createAdminClient();
  type Item = { desc: string; qty: string; unit: string; amount: number };
  let docTitle = 'INVOICE';
  let ref = '';
  let dateStr = new Date().toISOString().slice(0, 10);
  let customer: any = null;
  let items: Item[] = [];
  let total = 0;
  let paid: number | null = null;
  let extraNote = '';

  const one = async (table: string) => {
    const { data } = await db.from(table).select('*').eq('id', id).eq('agency_id', aid).maybeSingle();
    return data;
  };

  if (type === 'booking') {
    const b = await one('bookings');
    if (!b) return new Response('Not found', { status: 404 });
    ref = b.booking_ref; docTitle = 'BOOKING INVOICE';
    dateStr = (b.created_at || '').slice(0, 10) || dateStr;
    if (b.customer_id) customer = (await db.from('customers').select('*').eq('id', b.customer_id).maybeSingle()).data;
    items.push({ desc: `${b.package_name || 'Umrah package'} (${b.trip_type || 'umrah'}, ${b.pilgrims_count || 1} pax)`, qty: '1', unit: '', amount: Number(b.total_amount) || 0 });
    const svc = async (table: string, pick: (r: any) => Item) => {
      const { data: rows } = await db.from(table).select('*').eq('agency_id', aid).eq('booking_id', b.id);
      for (const r of rows || []) { const it = pick(r); if (it.amount) items.push(it); }
    };
    await svc('flights', (r) => ({ desc: `Flight: ${r.airline || ''} ${r.flight_no || ''} ${r.departure_airport || ''}→${r.arrival_airport || ''} (${r.trip_kind || 'oneway'})`, qty: String(r.pax_count || 1), unit: '', amount: Number(r.amount) || 0 }));
    await svc('hotels', (r) => ({ desc: `Hotel: ${r.hotel_name || ''}, ${(r.city || '').toUpperCase()} — ${r.nights || 0} nights`, qty: String(r.rooms_count || 1), unit: '', amount: Number(r.amount) || 0 }));
    await svc('transports', (r) => ({ desc: `Transport (${(r.transport_type || '').replace(/_/g, ' ')}): ${r.from_location || ''} → ${r.to_location || ''}`, qty: '1', unit: '', amount: Number(r.amount) || 0 }));
    await svc('visas', (r) => ({ desc: `Visa: ${(r.visa_type || '').toUpperCase()} ${r.visa_no ? 'No. ' + r.visa_no : ''}`, qty: '1', unit: '', amount: Number(r.amount) || 0 }));
    total = Number(b.total_amount) || 0;
    paid = Number(b.paid_amount) || 0;
    if (b.currency && b.currency !== 'USD') extraNote = `All amounts in ${b.currency}.`;
  } else if (type === 'flight' || type === 'hotel' || type === 'transport' || type === 'visa') {
    const r = await one(type + 's');
    if (!r) return new Response('Not found', { status: 404 });
    ref = `${type.toUpperCase()}-${(r.id || '').slice(0, 8).toUpperCase()}`;
    const custId = r.customer_id || (r.booking_id ? ((await db.from('bookings').select('customer_id').eq('id', r.booking_id).maybeSingle()).data as any)?.customer_id : null);
    if (custId) customer = (await db.from('customers').select('*').eq('id', custId).maybeSingle()).data;
    if (type === 'flight') items.push({ desc: `Flight: ${r.airline || ''} ${r.flight_no || ''} ${r.departure_airport || ''} → ${r.arrival_airport || ''} (${(r.trip_kind || 'oneway').replace('multicity', 'multi-city')}, ${(r.cabin_class || 'economy')} class)`, qty: String(r.pax_count || 1), unit: '', amount: Number(r.amount) || 0 });
    if (type === 'hotel') items.push({ desc: `Hotel: ${r.hotel_name || ''}, ${(r.city || '').toUpperCase()} — ${r.nights || 0} night(s), ${r.room_type || ''} room`, qty: String(r.rooms_count || 1), unit: '', amount: Number(r.amount) || 0 });
    if (type === 'transport') items.push({ desc: `Transport (${(r.transport_type || '').replace(/_/g, ' ')}): ${r.from_location || ''} → ${r.to_location || ''}, ${r.vehicle_type || ''}`, qty: '1', unit: '', amount: Number(r.amount) || 0 });
    if (type === 'visa') items.push({ desc: `Visa service: ${(r.visa_type || '').toUpperCase()} ${r.visa_no ? 'No. ' + r.visa_no : ''}`, qty: '1', unit: '', amount: Number(r.amount) || 0 });
    total = Number(r.amount) || 0;
  } else if (type === 'quotation') {
    const q = await one('quotations');
    if (!q) return new Response('Not found', { status: 404 });
    ref = q.quote_no; docTitle = 'QUOTATION';
    dateStr = (q.created_at || '').slice(0, 10) || dateStr;
    if (q.customer_id) customer = (await db.from('customers').select('*').eq('id', q.customer_id).maybeSingle()).data;
    const { data: lines } = await db.from('quotation_items').select('*').eq('agency_id', aid).eq('quotation_id', q.id);
    items = (lines || []).map((l: any) => ({ desc: l.description, qty: String(l.quantity), unit: Number(l.unit_price).toFixed(2), amount: Number(l.amount) }));
    total = Number(q.total) || 0;
  } else if (type === 'invoice') {
    const inv = await one('invoices');
    if (!inv) return new Response('Not found', { status: 404 });
    ref = inv.invoice_no;
    dateStr = (inv.issue_date || dateStr).slice(0, 10);
    if (inv.booking_id) {
      const b = (await db.from('bookings').select('customer_id').eq('id', inv.booking_id).maybeSingle()).data as any;
      if (b?.customer_id) customer = (await db.from('customers').select('*').eq('id', b.customer_id).maybeSingle()).data;
    }
    const { data: lines } = await db.from('invoice_items').select('*').eq('agency_id', aid).eq('invoice_id', inv.id);
    items = (lines || []).map((l: any) => ({ desc: l.description, qty: String(l.quantity), unit: Number(l.unit_price).toFixed(2), amount: Number(l.amount) }));
    if (!items.length) items.push({ desc: 'Services as agreed', qty: '1', unit: '', amount: Number(inv.subtotal) || 0 });
    total = Number(inv.total) || 0;
    paid = inv.status === 'paid' ? total : null;
  } else if (type === 'hotel_sale' || type === 'visa_sale' || type === 'transport_sale') {
    const table = type.replace('_sale', '_sales');
    const row = await one(table);
    if (!row) return new Response('Not found', { status: 404 });
    ref = row.ref;
    docTitle = (type.startsWith('hotel') ? 'HOTEL' : type.startsWith('visa') ? 'VISA' : 'TRANSPORT') + ' INVOICE';
    dateStr = (row.created_at || '').slice(0, 10) || dateStr;
    if (row.customer_id) customer = (await db.from('customers').select('*').eq('id', row.customer_id).maybeSingle()).data;
    const descMap: Record<string, string> = {
      hotel_sale: `Hotel: ${row.hotel_name || ''}${row.city ? ', ' + row.city.toUpperCase() : ''} - ${row.nights || 0} night(s), ${row.room_type || ''} room x ${row.rooms_count || 1}`,
      visa_sale: `Visa service: ${(row.visa_type || '').toUpperCase()} ${row.visa_no ? 'No. ' + row.visa_no : ''}`,
      transport_sale: `Transport (${(row.transport_type || '').replace(/_/g, ' ')}): ${row.from_location || ''} -> ${row.to_location || ''}${row.transport_date ? ' on ' + row.transport_date : ''}`,
    };
    items.push({ desc: descMap[type], qty: '1', unit: '', amount: Number(row.sale_price) || 0 });
    if (Number(row.admin_fee)) items.push({ desc: 'Admin / service fee', qty: '1', unit: '', amount: Number(row.admin_fee) });
    if (Number(row.discount)) items.push({ desc: 'Discount', qty: '1', unit: '', amount: -Number(row.discount) });
    total = Number(row.sale_price) + Number(row.admin_fee) - (Number(row.discount) || 0);
    paid = Number(row.amount_paid) || 0;
  } else if (type === 'flightsale') {
    const fs = await one('flight_sales');
    if (!fs) return new Response('Not found', { status: 404 });
    ref = fs.ref; docTitle = 'FLIGHT INVOICE';
    dateStr = (fs.created_at || '').slice(0, 10) || dateStr;
    if (fs.customer_id) customer = (await db.from('customers').select('*').eq('id', fs.customer_id).maybeSingle()).data;
    const { data: legs } = await db.from('flight_sale_legs').select('*').eq('agency_id', aid).eq('flight_sale_id', fs.id).order('leg_no');
    for (const l of legs || []) {
      items.push({ desc: `Leg ${l.leg_no}: ${l.airline || ''} ${l.flight_no || ''} ${l.from_airport || ''} -> ${l.to_airport || ''} (${fs.trip_kind}, ${fs.pax || 1} pax)`, qty: String(fs.pax || 1), unit: '', amount: (Number(l.fare) + Number(l.tax)) * (fs.pax || 1) * 0 + Number(l.fare) + Number(l.tax) });
    }
    if (Number(fs.admin_fee)) items.push({ desc: 'Admin / service fee', qty: '1', unit: '', amount: Number(fs.admin_fee) });
    if (Number(fs.discount)) items.push({ desc: 'Discount', qty: '1', unit: '', amount: -Number(fs.discount) });
    total = Number(fs.sale_total) + Number(fs.admin_fee) - (Number(fs.discount) || 0);
    paid = Number(fs.amount_paid) || 0;
  } else if (type === 'package') {
    const p = await one('packages');
    if (!p) return new Response('Not found', { status: 404 });
    ref = `PKG-${(p.id || '').slice(0, 8).toUpperCase()}`;
    docTitle = 'PACKAGE PROFORMA';
    items.push({ desc: `${p.name || 'Package'} (${p.service_type || 'umrah'}${p.duration_days ? ', ' + p.duration_days + ' days' : ''})`, qty: '1', unit: '', amount: Number(p.price_from) || 0 });
    total = Number(p.price_from) || 0;
    extraNote = 'Proforma — final itinerary & pricing on confirmation.';
  }

  if (!items.length) items.push({ desc: 'Services', qty: '1', unit: '', amount: total });

  // ---------- render PDF ----------
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: GOLD });
  page.drawText(clean('EzUmrah'), { x: 40, y: 810, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText(clean(docTitle), { x: 400, y: 810, size: 20, font: bold, color: rgb(1, 1, 1) });

  let y = 760;
  page.drawText(clean(agency.name || 'Travel Agency'), { x: 40, y, size: 14, font: bold, color: DARK });
  y -= 16;
  page.drawText(clean(`${ref ? 'Ref: ' + ref : ''}    Date: ${dateStr}`), { x: 40, y, size: 10, font, color: GRAY });

  y -= 40;
  page.drawText(clean('BILL TO'), { x: 40, y, size: 9, font: bold, color: GRAY });
  y -= 14;
  page.drawText(clean(customer?.full_name || '—'), { x: 40, y, size: 12, font: bold, color: DARK });
  if (customer?.country || customer?.phone) { y -= 14; page.drawText(clean([customer.country, customer.phone].filter(Boolean).join(' · ')), { x: 40, y, size: 10, font, color: GRAY }); }

  y -= 30;
  const cols = { desc: 40, qty: 380, unit: 440, amount: 520 };
  page.drawText(clean('DESCRIPTION'), { x: cols.desc, y, size: 9, font: bold, color: GRAY });
  page.drawText(clean('QTY'), { x: cols.qty, y, size: 9, font: bold, color: GRAY });
  page.drawText(clean('UNIT'), { x: cols.unit, y, size: 9, font: bold, color: GRAY });
  page.drawText(clean('AMOUNT'), { x: cols.amount, y, size: 9, font: bold, color: GRAY });
  y -= 6;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: GOLD });
  y -= 18;

  for (const it of items) {
    const desc = it.desc.length > 58 ? it.desc.slice(0, 57) + '…' : it.desc;
    page.drawText(clean(desc), { x: cols.desc, y, size: 10, font, color: DARK });
    page.drawText(clean(it.qty), { x: cols.qty, y, size: 10, font, color: DARK });
    page.drawText(clean(it.unit || '—'), { x: cols.unit, y, size: 10, font, color: DARK });
    const amt = `$${it.amount.toFixed(2)}`;
    page.drawText(clean(amt), { x: 555 - bold.widthOfTextAtSize(amt, 10), y, size: 10, font: bold, color: DARK });
    y -= 18;
    if (y < 120) break;
  }

  y -= 10;
  page.drawLine({ start: { x: 340, y }, end: { x: 555, y }, thickness: 0.5, color: GRAY });
  y -= 20;
  const totalStr = `TOTAL: $${total.toFixed(2)}`;
  page.drawText(clean(totalStr), { x: 555 - bold.widthOfTextAtSize(totalStr, 12), y, size: 12, font: bold, color: DARK });
  if (paid !== null) { y -= 16; const pStr = `Paid: $${paid.toFixed(2)}   Balance: $${(total - paid).toFixed(2)}`; page.drawText(clean(pStr), { x: 555 - font.widthOfTextAtSize(pStr, 10), y, size: 10, font, color: GRAY }); }
  if (extraNote) { y -= 16; page.drawText(clean(extraNote), { x: 555 - font.widthOfTextAtSize(extraNote, 9), y, size: 9, font, color: GRAY }); }

  page.drawText(clean('Thank you for choosing us. Jazak Allah Khair!'), { x: 40, y: 60, size: 10, font: bold, color: GOLD });
  page.drawText(clean('Generated by EzUmrah CRM'), { x: 40, y: 46, size: 8, font, color: GRAY });

  const bytes = await doc.save();
  const filename = `${docTitle.toLowerCase().replace(' ', '-')}-${(ref || id.slice(0, 8)).toLowerCase()}.pdf`;
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
