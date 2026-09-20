'use client';
import { useState } from 'react';
import { addTourPassengers } from '@/lib/tour-actions';

const empty = () => ({ full_name: '', gender: 'male', age: '', passport_no: '', room_group: '', room_preference: 'shared', room_type: 'quad', pickup_id: '' });

export default function TourAddPassengerForm({ bookings, pickups }: {
  bookings: { id: string; ref: string; label: string }[];
  pickups: { id: string; location: string; pickup_time: string | null }[];
}) {
  const [pax, setPax] = useState([empty()]);
  const up = (i: number, k: string) => (e: any) => setPax(pax.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
  const inflight = { fontSize: '11px', padding: '4px 6px' } as const;
  return (
    <form action={addTourPassengers} className="space-y-4">
      <select className="input" name="booking_id" required>
        <option value="">— choose booking —</option>
        {bookings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
      </select>
      <input type="hidden" name="passengers_json" value={JSON.stringify(pax)} />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600">Passengers to add ({pax.length})</p>
          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setPax([...pax, empty()])}>+ Passenger</button>
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
              <input className="input" style={inflight} placeholder="Family / room group" title="Same label = same room" value={p.room_group} onChange={up(i, 'room_group')} />
              <select className="input" style={inflight} value={p.room_preference} onChange={up(i, 'room_preference')}>
                <option value="shared">shared</option><option value="private">private</option><option value="family">family</option>
              </select>
              <select className="input" style={inflight} value={p.room_type} onChange={up(i, 'room_type')}>
                {['single', 'double', 'triple', 'quad'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="input" style={inflight} value={p.pickup_id} onChange={up(i, 'pickup_id')}>
                <option value="">— pickup —</option>
                {pickups.map((pk) => <option key={pk.id} value={pk.id}>{pk.location} {pk.pickup_time ? `(${pk.pickup_time})` : ''}</option>)}
              </select>
              {pax.length > 1 && <button type="button" className="text-xs text-red-400" onClick={() => setPax(pax.filter((_, j) => j !== i))}>✕</button>}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <label className="flex items-center gap-1"><input type="checkbox" name="auto_seat" defaultChecked /> Auto-assign bus seats</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="auto_room" defaultChecked /> Auto-assign rooms</label>
      </div>
      <button className="btn-primary" type="submit">Add {pax.length} passenger{pax.length === 1 ? '' : 's'}</button>
    </form>
  );
}
