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
    ],
    desc: (r) => `${r.hotel_name || 'Hotel'}${r.city ? ', ' + r.city : ''}${r.nights ? ' — ' + r.nights + ' night(s)' : ''}`,
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
    ],
    desc: (r) => `${(r.visa_type || 'Visa').toUpperCase()}${r.visa_no ? ' No. ' + r.visa_no : ''}`,
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
    ],
    desc: (r) => `${(r.transport_type || 'transport').replace(/_/g, ' ')}: ${r.from_location || '?'} → ${r.to_location || '?'}${r.transport_date ? ' (' + r.transport_date + ')' : ''}`,
  },
};

export const SALE_PAYMENT_FIELDS: SvcField[] = [
  { name: 'sale_price', label: 'Sale price (to customer)', type: 'number' },
  { name: 'cost', label: 'Cost (our price)', type: 'number' },
  { name: 'admin_fee', label: 'Admin fee', type: 'number' },
  { name: 'amount_paid', label: 'Amount paid', type: 'number' },
];
