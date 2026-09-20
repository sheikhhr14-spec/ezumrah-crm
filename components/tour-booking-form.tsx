'use client';
import { useState } from 'react';
import { createTourBooking } from '@/lib/tour-actions';

const empty = () => ({ full_name: '', gender: 'male', age: '', passport_no: '', phone: '', room_group: '', room_preference: 'shared', room_type: 'quad', pickup_id: '' });
const PREFS = ['shared', 'private', 'family'];
const RTYPES = ['single', 'double', 'triple', 'quad'];

export default function TourBookingForm({ departureId, pickups }: {
  departureId: string; pickups: { id: string; location: string; pickup_time: string | null }[];
}) {
  const [pax, setPax] = useState([empty()]);
  const up = (i: number, k: string) => (e: any) => setPax(pax.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
  const inflight = { fontSize: '11px', padding: '4px 6px' } as const;
  return (
    <form action={createTourBooking} className="space-y-4">
      <input type="hidden" name="departure_id" value={departureId} />
      <input type="hidden" name="passengers_json" value={JSON.stringify(pax)} />
      <div className="grid gap-3 sm:grid-cols-3">
        <input className="input" name="group_name" placeholder="Group / family name (optional)" />
        <input className="input" name="contact_name" placeholder="Contact person *" required />
        <input className="input" name="contact_phone" placeholder="Contact phone" />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600">Passengers ({pax.length}) — manage each individually</p>
          <div className="flex gap-1">
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setPax([...pax, empty()])}>+ Passenger</button>
            {pax.length > 1 && <button type="button" className="text-xs text-red-400" onClick={() => setPax(pax.slice(0, -1))}>− remove last</button>}
          </div>
        </div>
        <div className="space-y-2">
          {pax.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-50 p-2">
              <span className="text-[11px] font-bold text-slate-400">#{i + 1}</span>
              <input className="input" style={inflight} placeholder="Full name *" value={p.full_name} onChange={up(i, 'full_name')} />
              <select className="input" style={inflight} value={p.gender} onChange={up(i, 'gender')}>
                <option value="male">M</option><option value="female">F</option>
              </select>
              <input className="input" style={inflight} type="number" placeholder="Age" value={p.age} onChange={up(i, 'age')} />
              <input className="input" style={inflight} placeholder="Passport no." value={p.passport_no} onChange={up(i, 'passport_no')} />
              <input className="input" style={inflight} placeholder="Family / room group" title="Passengers with the same label stay in the same room" value={p.room_group} onChange={up(i, 'room_group')} />
              <select className="input" style={inflight} value={p.room_preference} onChange={up(i, 'room_preference')} title="Room preference">
                {PREFS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <select className="input" style={inflight} value={p.room_type} onChange={up(i, 'room_type')} title="Room type">
                {RTYPES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <select className="input" style={inflight} value={p.pickup_id} onChange={up(i, 'pickup_id')} title="Pickup point">
                <option value="">— pickup —</option>
                {pickups.map((pk) => <option key={pk.id} value={pk.id}>{pk.location} {pk.pickup_time ? `(${pk.pickup_time})` : ''}</option>)}
              </select>
              {pax.length > 1 && <button type="button" className="text-xs text-red-400" onClick={() => setPax(pax.filter((_, j) => j !== i))}>✕</button>}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <input className="input" name="sale_price" type="number" step="0.01" placeholder="Sale price (total booking)" />
        <input className="input" name="cost" type="number" step="0.01" placeholder="Our cost" />
        <input className="input" name="amount_paid" type="number" step="0.01" placeholder="Amount paid" />
        <input className="input" name="due_date" type="date" title="Payment due date" />
        <select className="input" name="payment_method">
          <option value="">Payment method…</option>
          <option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option>
        </select>
        <input className="input sm:col-span-2" name="notes" placeholder="Notes" />
        <select className="input" name="status" defaultValue="confirmed">
          <option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <label className="flex items-center gap-1"><input type="checkbox" name="auto_seat" defaultChecked /> Auto-assign bus seats</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="auto_room" defaultChecked /> Auto-assign hotel rooms (family groups kept together)</label>
      </div>
      <button className="btn-primary" type="submit">Create booking ({pax.length} passenger{pax.length === 1 ? '' : 's'})</button>
    </form>
  );
}
