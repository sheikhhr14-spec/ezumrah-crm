'use client';
import { useState } from 'react';
import { createDepartureVehicle } from '@/lib/tour-actions';

const TYPES = [
  { v: 'car', label: 'Car — 4 pax (excl. driver)', seats: 4 },
  { v: 'suv', label: 'SUV — 5 pax (excl. driver)', seats: 5 },
  { v: 'van', label: 'Minivan — 7 pax (excl. driver)', seats: 7 },
  { v: 'coaster', label: 'Coaster — 7 pax (excl. driver)', seats: 7 },
  { v: 'minibus', label: 'Minibus — 18 pax (excl. driver)', seats: 18 },
  { v: 'bus40', label: 'Bus — 40 seats', seats: 40 },
  { v: 'bus45', label: 'Bus — 45 seats', seats: 45 },
  { v: 'bus50', label: 'Bus — 50+ seats', seats: 50 },
];

export default function TourVehicleForm({ departureId }: { departureId: string }) {
  const [seats, setSeats] = useState(4);
  return (
    <form action={createDepartureVehicle} className="grid gap-2 sm:grid-cols-4">
      <input type="hidden" name="departure_id" value={departureId} />
      <select className="input" name="vehicle_type" onChange={(e) => setSeats(TYPES.find((t) => t.v === e.target.value)?.seats || 4)}>
        {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
      </select>
      <input className="input" name="vehicle_label" placeholder="Label (e.g. BUS-1)" />
      <input className="input" name="plate_no" placeholder="Plate no." />
      <input className="input" name="total_seats" type="number" value={seats} onChange={(e) => setSeats(Number(e.target.value))} title="Total seats (excluding driver)" />
      <button className="btn-primary" type="submit">Add vehicle</button>
      <p className="text-[11px] text-slate-400 sm:col-span-4">Seat count auto-fills by vehicle type (excludes the driver). Buses render 2+2 with an aisle; cars/minivans/coasters render in pairs.</p>
    </form>
  );
}
