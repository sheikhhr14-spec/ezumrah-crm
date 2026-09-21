'use client';
import { useTransition, useState } from 'react';
import { updateTourPassenger, deleteTourPassenger, setPassengerCheckin } from '@/lib/tour-actions';

type P = {
  id: string; full_name: string; gender: string | null; age: number | null; passport_no: string | null; phone: string | null;
  booking_ref: string; group_name: string; room_group: string | null; room_preference: string | null; room_type: string | null;
  hotel_room: string | null; bed_label: string | null; seat_vehicle_id: string | null; seat_no: number | null; seat_label: string;
  pickup_id: string | null; checkin_status: string | null; notes: string | null;
};
type V = { id: string; label: string; type: string };
type K = { id: string; location: string; time: string | null };

const STATUS: Record<string, string> = {
  booked: 'bg-slate-100 text-slate-600', confirmed: 'bg-sky-100 text-sky-700',
  checked_in: 'bg-indigo-100 text-indigo-700', picked_up: 'bg-emerald-100 text-emerald-700',
  no_show: 'bg-red-100 text-red-700',
};

export default function TourPassengerTable({ departureId, passengers, vehicles, pickups }: {
  departureId: string; passengers: P[]; vehicles: V[]; pickups: K[];
}) {
  const [edit, setEdit] = useState<P | null>(null);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const [q, setQ] = useState('');
  const list = passengers.filter((p) =>
    !q || `${p.full_name} ${p.passport_no || ''} ${p.room_group || ''} ${p.booking_ref}`.toLowerCase().includes(q.toLowerCase()));
  const initials = (n: string) => n.split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search name, passport, family…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-xs text-slate-400">{list.length} of {passengers.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-xs">
          <thead><tr className="border-b border-slate-200 text-left text-slate-400">
            <th className="p-2">Passenger</th><th className="p-2">Booking</th><th className="p-2">Group</th>
            <th className="p-2">Bus seat</th><th className="p-2">Hotel room</th><th className="p-2">Pickup</th>
            <th className="p-2">Status</th><th className="p-2 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${p.gender === 'female' ? 'bg-rose-400' : 'bg-slate-600'}`}>{initials(p.full_name)}</span>
                    <span><b className="block text-slate-900">{p.full_name}</b>
                      <span className="text-slate-400">{p.gender === 'female' ? 'F' : 'M'}{p.age ? ` · ${p.age}` : ''}{p.passport_no ? ` · PP ${p.passport_no}` : ''}</span></span>
                  </div>
                </td>
                <td className="p-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{p.booking_ref}</span></td>
                <td className="p-2">{p.room_group ? <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">👨‍👩‍👧 {p.room_group}</span> : <span className="text-slate-300">—</span>}</td>
                <td className="p-2">{p.seat_vehicle_id && p.seat_no ? <span className="rounded bg-slate-800 px-1.5 py-0.5 font-bold text-white">🚌 {p.seat_label} · {p.seat_no}</span> : <button onClick={() => setEdit(p)} className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-slate-400 hover:border-slate-500">assign</button>}</td>
                <td className="p-2">{p.hotel_room ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">🏨 {p.hotel_room} · bed {p.bed_label || '—'}</span> : <button onClick={() => setEdit(p)} className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-slate-400 hover:border-slate-500">assign</button>}</td>
                <td className="p-2 text-slate-600">{pickups.find((k) => k.id === p.pickup_id)?.location || <span className="text-slate-300">—</span>}</td>
                <td className="p-2"><span className={`rounded px-1.5 py-0.5 font-semibold ${STATUS[p.checkin_status || 'booked']}`}>{(p.checkin_status || 'booked').replace('_', ' ')}</span></td>
                <td className="p-2">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEdit(p)} className="rounded border border-slate-200 px-2 py-0.5 font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900" type="button">✏ Edit</button>
                    <form action={async (fd) => { await deleteTourPassenger(fd); }}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="departure_id" value={departureId} />
                      <button className="rounded border border-red-200 px-2 py-0.5 text-red-400 hover:border-red-400" type="submit">✕</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit passenger — {edit.full_name}</h3>
              <button onClick={() => setEdit(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white" type="button">✕</button>
            </div>
            <form action={(fd) => start(async () => {
              try { setErr(''); await updateTourPassenger(fd); setEdit(null); }
              catch (e: any) { setErr(String(e?.message || e)); }
            })} className="grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="id" value={edit.id} />
              <input type="hidden" name="departure_id" value={departureId} />
              {err && <p className="sm:col-span-3 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">{err}</p>}
              {pending && <p className="sm:col-span-3 flex items-center gap-2 rounded-lg bg-slate-100 p-2 text-xs font-semibold text-slate-600"><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" /> Saving…</p>}
              <label className="block sm:col-span-3"><span className="text-[11px] font-semibold text-slate-500">Full name</span>
                <input className="input" name="full_name" defaultValue={edit.full_name} required /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Gender</span>
                <select className="input" name="gender" defaultValue={edit.gender || 'male'}><option value="male">Male</option><option value="female">Female</option></select></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Age</span>
                <input className="input" name="age" type="number" defaultValue={edit.age || ''} /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Passport no.</span>
                <input className="input" name="passport_no" defaultValue={edit.passport_no || ''} /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Phone</span>
                <input className="input" name="phone" defaultValue={edit.phone || ''} /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Family / room group</span>
                <input className="input" name="room_group" defaultValue={edit.room_group || ''} placeholder="same label = same room" /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Room preference</span>
                <select className="input" name="room_preference" defaultValue={edit.room_preference || 'shared'}>
                  <option value="shared">Shared</option><option value="private">Private</option><option value="family">Family</option>
                </select></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Room type</span>
                <select className="input" name="room_type" defaultValue={edit.room_type || 'quad'}>
                  {['single', 'double', 'triple', 'quad'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Hotel room label</span>
                <input className="input" name="hotel_room" defaultValue={edit.hotel_room || ''} placeholder="H1-Q1" /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Bed</span>
                <input className="input" name="bed_label" defaultValue={edit.bed_label || ''} placeholder="A / B / C / D" /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Rooming notes</span>
                <input className="input" name="notes" defaultValue={edit.notes || ''} /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Vehicle</span>
                <select className="input" name="seat_vehicle_id" defaultValue={edit.seat_vehicle_id || ''}>
                  <option value="">— no vehicle —</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.type})</option>)}
                </select></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Seat no.</span>
                <input className="input" name="seat_no" type="number" defaultValue={edit.seat_no || ''} /></label>
              <label className="block"><span className="text-[11px] font-semibold text-slate-500">Pickup point</span>
                <select className="input" name="pickup_id" defaultValue={edit.pickup_id || ''}>
                  <option value="">— pickup —</option>
                  {pickups.map((k) => <option key={k.id} value={k.id}>{k.location}{k.time ? ` (${k.time})` : ''}</option>)}
                </select></label>
              <label className="block sm:col-span-2"><span className="text-[11px] font-semibold text-slate-500">Check-in status</span>
                <select className="input" name="checkin_status" defaultValue={edit.checkin_status || 'booked'}>
                  {['booked', 'confirmed', 'checked_in', 'picked_up', 'no_show'].map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select></label>
              <div className="sm:col-span-3 mt-1 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1">
                  {['confirmed', 'checked_in', 'picked_up', 'no_show'].map((c) => (
                    <form key={c} action={async (fd) => { await setPassengerCheckin(fd); }}>
                      <input type="hidden" name="id" value={edit.id} /><input type="hidden" name="departure_id" value={departureId} /><input type="hidden" name="checkin_status" value={c} />
                      <button className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:border-slate-400" type="submit">{c.replace('_', ' ')}</button>
                    </form>
                  ))}
                </div>
                <button className="btn-primary" type="submit">Save passenger</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
