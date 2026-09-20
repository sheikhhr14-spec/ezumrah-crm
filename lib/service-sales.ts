// Client-safe config for standalone service sale modules (hotel / visa / transport+ziyarat).
// Field names MUST match DB column names; the server actions only accept these names.
export type SvcField = {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'select';
  ph?: string;
  options?: string[];
};

export type SvcConfig = {
  table: string;
  route: string;
  title: string;
  subtitle: string;
  prefix: string;
  fields: SvcField[];
  desc: (r: any) => string;
};

export const SERVICE_SALES: Record<string, SvcConfig> = {
  hotel_sales: {
    table: 'hotel_sales',
    route: 'hotel-sales',
    title: 'Hotel Sales',
    subtitle: 'Standalone hotel bookings — no package or booking needed.',
    prefix: 'HS',
    fields: [
      { name: 'hotel_name', label: 'Hotel name *' },
      { name: 'city', label: 'City', ph: 'Makkah / Madinah' },
      { name: 'check_in', label: 'Check-in', type: 'date' },
      { name: 'check_out', label: 'Check-out', type: 'date' },
      { name: 'nights', label: 'Nights', type: 'number' },
      { name: 'room_type', label: 'Room type', ph: 'double / triple / quad' },
      { name: 'rooms_count', label: 'Rooms', type: 'number' },
      { name: 'meal_plan', label: 'Meal plan', ph: 'BB / HB / FB' },
      { name: 'confirmation_code', label: 'Confirmation code' },
      { name: 'adults', label: 'Adults', type: 'number' },
      { name: 'children', label: 'Children', type: 'number' },
      { name: 'guest_names', label: 'Guest names', ph: 'all room occupants' },
      { name: 'supplier', label: 'Supplier / source', ph: 'hotel direct / GDS / wholesaler' },
      { name: 'rate_per_night', label: 'Rate per night (per room)', type: 'number' },
      { name: 'cancellation_policy', label: 'Cancellation policy', ph: 'free until … / non-refundable' },
      { name: 'special_requests', label: 'Special requests', ph: 'twin beds, high floor…' },
      { name: 'due_date', label: 'Payment due date', type: 'date' },
    ],
    desc: (r) => `${r.hotel_name || 'Hotel'}${r.city ? ', ' + r.city : ''}${r.nights ? ' — ' + r.nights + ' night(s)' : ''}${(r.adults || r.children) ? ` (${r.adults || 0}A + ${r.children || 0}C)` : ''}`,
  },
  visa_sales: {
    table: 'visa_sales',
    route: 'visa-sales',
    title: 'Visa Sales',
    subtitle: 'Standalone visa processing — no package or booking needed.',
    prefix: 'VS',
    fields: [
      { name: 'visa_type', label: 'Visa type *', ph: 'umrah / visit / work' },
      { name: 'application_date', label: 'Application date', type: 'date' },
      { name: 'visa_no', label: 'Visa no.' },
      { name: 'processing_status', label: 'Processing status', type: 'select', options: ['submitted', 'processing', 'issued', 'rejected', 'expired'] },
      { name: 'issued_date', label: 'Issued date', type: 'date' },
      { name: 'expiry_date', label: 'Visa expiry', type: 'date' },
      { name: 'insurance', label: 'Insurance', type: 'select', options: ['not included', 'included'] },
      { name: 'pax', label: 'Travelers', type: 'number' },
      { name: 'sponsor_name', label: 'Sponsor name' },
      { name: 'processing_center', label: 'Processing center', ph: 'Tasheer / Waseelo / VFS' },
      { name: 'processing_speed', label: 'Processing speed', type: 'select', options: ['standard', 'express', 'urgent'] },
      { name: 'due_date', label: 'Payment due date', type: 'date' },
    ],
    desc: (r) => `${(r.visa_type || 'Visa').toUpperCase()}${r.visa_no ? ' No. ' + r.visa_no : ''} — ${(r.processing_status || 'processing').toUpperCase()}${r.expiry_date && new Date(r.expiry_date) < new Date() ? ' ⚠ EXPIRED' : ''}`,
  },
  transport_sales: {
    table: 'transport_sales',
    route: 'transport-sales',
    title: 'Transport & Ziyarat Sales',
    subtitle: 'Standalone transport, ziyarat tours and transfers — no package or booking needed.',
    prefix: 'TR',
    fields: [
      { name: 'transport_type', label: 'Type', type: 'select', options: ['airport pickup', 'airport drop', 'ziyarah', 'intercity', 'private driver', 'bus tour'] },
      { name: 'from_location', label: 'From *', ph: 'Jeddah Airport' },
      { name: 'to_location', label: 'To *', ph: 'Hotel in Makkah' },
      { name: 'transport_date', label: 'Date', type: 'date' },
      { name: 'transport_time', label: 'Time', ph: '14:00' },
      { name: 'vehicle_type', label: 'Vehicle', ph: 'GMC / bus / sedan' },
      { name: 'seats', label: 'Seats', type: 'number' },
      { name: 'driver_name', label: 'Driver name' },
      { name: 'driver_phone', label: 'Driver phone' },
      { name: 'flight_no', label: 'Flight no. (for pickup)', ph: 'SV 123' },
      { name: 'meeting_point', label: 'Meeting point' },
      { name: 'luggage', label: 'Luggage (pcs)', type: 'number' },
      { name: 'pax', label: 'Passengers', type: 'number' },
      { name: 'return_date', label: 'Return date (round trip)', type: 'date' },
      { name: 'vehicle_no', label: 'Vehicle no. / plate' },
      { name: 'guide_name', label: 'Guide name (ziyarah)' },
      { name: 'supplier', label: 'Supplier / transport company' },
      { name: 'due_date', label: 'Payment due date', type: 'date' },
    ],
    desc: (r) => `${(r.transport_type || 'transport').replace(/_/g, ' ')}: ${r.from_location || '?'} → ${r.to_location || '?'}${r.transport_date ? ' (' + r.transport_date + ')' : ''}`,
  },
};

export const SALE_PAYMENT_FIELDS: SvcField[] = [
  { name: 'sale_price', label: 'Sale price (to customer)', type: 'number' },
  { name: 'cost', label: 'Cost (our price)', type: 'number' },
  { name: 'admin_fee', label: 'Admin fee', type: 'number' },
  { name: 'discount', label: 'Discount', type: 'number' },
  { name: 'commission', label: 'Commission (from supplier)', type: 'number' },
  { name: 'amount_paid', label: 'Amount paid', type: 'number' },
];
