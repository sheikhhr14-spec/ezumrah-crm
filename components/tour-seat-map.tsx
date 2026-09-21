'use client';
import { useState, useTransition } from 'react';
import { movePassengerSeat, toggleSeatBlock } from '@/lib/tour-actions';

type Chip = { id: string; name: string; ref?: string };

export default function TourSeatMap({ departureId, vehicles, occupied, unassigned, blocks }: {
  departureId: string;
  vehicles: { id: string; label: string; type: string; total: number }[];
  occupied: { key: string; id: string; name: string }[];
  unassigned: Chip[];
  blocks: { key: string; kind: string; reason: string }[];
}) {
  const [drag, setDrag] = useState<Chip | null>(null);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const occ = new Map(occupied.map((o) => [o.key, o]));
  const blk = new Map(blocks.map((b) => [b.key, b]));

  const call = (fd: FormData) => start(async () => {
    try { setErr(''); await movePassengerSeat(fd); setDrag(null); }
    catch (e: any) { setErr(String(e?.message || e)); }
  });
  const block = (vehId: string, n: number, kind: string) => {
    const fd = new FormData();
    fd.set('departure_id', departureId); fd.set('vehicle_id', vehId);
    fd.set('seat_no', String(n)); fd.set('kind', kind);
    start(async () => { try { setErr(''); await toggleSeatBlock(fd); } catch (e: any) { setErr(String(e?.message || e)); } });
  };
  const drop = (vehId: string, n: number) => {
    if (!drag) return;
    if (occ.has(`${vehId}-${n}`) || blk.has(`${vehId}-${n}`)) { setErr('That seat is not available.'); return; }
    const fd = new FormData();
    fd.set('passenger_id', drag.id); fd.set('vehicle_id', vehId); fd.set('seat_no', String(n));
    call(fd);
  };

  return (
    <div>
      {err && <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">{err}</p>}
      {pending && (
        <p className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 p-2 text-xs font-semibold text-slate-600">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          Assigning seat — please wait…
        </p>
      )}
      {unassigned.length > 0 && (
        <div className="mb-3 rounded-lg border border-dashed border-slate-300 p-2">
          <p className="mb-1 text-[11px] font-semibold text-slate-500">Unassigned passengers ({unassigned.length}) — drag onto a free seat</p>
          <div className="flex flex-wrap gap-1">
            {unassigned.map((p) => (
              <span key={p.id} draggable onDragStart={() => setDrag(p)} onDragEnd={() => setDrag(null)}
                className={`cursor-grab rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${drag?.id === p.id ? 'bg-slate-800 opacity-50' : 'bg-slate-500 hover:bg-slate-700'}`}>
                👤 {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {vehicles.map((v) => (
        <div key={v.id} className="mb-4 rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-800">{v.label} <span className="font-normal text-slate-400">{v.type} · {v.total} seats</span></p>
            <a className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-800"
              href={`/api/tour/manifest?departure=${departureId}&vehicle=${v.id}`} target="_blank" rel="noreferrer">⬇ Driver sheet</a>
          </div>
          <div className={`inline-block rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-opacity ${pending ? 'pointer-events-none opacity-50' : ''}`}>
            {(() => {
              const pairs: number[][] = [];
              for (let i = 0; i < v.total; i += 2) {
                pairs.push(Array.from({ length: Math.min(2, v.total - i) }, (_, j) => i + j + 1));
              }
              const isBus = v.total >= 15;
              const groups: number[][][] = [];
              for (let i = 0; i < pairs.length; i += isBus ? 2 : 1) groups.push(pairs.slice(i, i + (isBus ? 2 : 1)));
              const cell = (n: number) => {
                const key = `${v.id}-${n}`;
                const o = occ.get(key);
                const b = blk.get(key);
                if (o) return (
                  <div key={n} draggable onDragStart={() => setDrag({ id: o.id, name: o.name })} onDragEnd={() => setDrag(null)}
                    title={`${o.name} — drag to move to another seat`} style={{ height: 52, width: 46 }}
                    className="flex cursor-grab flex-col items-center justify-center rounded bg-slate-800 px-0.5 text-center text-white">
                    <span className="text-[10px] font-bold">{n}</span>
                    <span className="w-full truncate text-[8px] font-normal opacity-80">{o.name.split(' ')[0]}</span>
                  </div>
                );
                if (b) return (
                  <button key={n} type="button" title={`${b.kind}${b.reason ? ': ' + b.reason : ''} — click to release`}
                    onClick={() => block(v.id, n, b.kind)} style={{ height: 52, width: 46 }}
                    className={`flex flex-col items-center justify-center rounded text-[9px] font-bold text-white ${b.kind === 'blocked' ? 'bg-red-500' : 'bg-amber-500'}`}>
                    <span className="text-[10px]">{n}</span>{b.kind === 'blocked' ? 'blocked' : 'held'}
                  </button>
                );
                return (
                  <div key={n} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(v.id, n)}
                    title={`Seat ${n} — drag a passenger here, or click to block`} onClick={() => { if (!drag) block(v.id, n, 'blocked'); }}
                    style={{ height: 52, width: 46 }}
                    className="flex flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-white text-slate-400 hover:border-slate-500 hover:bg-slate-50">
                    <span className="text-[10px] font-bold">{n}</span><span className="text-[8px]">free</span>
                  </div>
                );
              };
              return (
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex h-[52px] w-7 flex-col items-center justify-center rounded bg-slate-200 text-center text-[9px] font-bold text-slate-500">🚍<span>drv</span></div>
                  {groups.map((g, gi) => (
                    <div key={gi} className="flex items-start gap-1">
                      {g.map((pair, pi) => (
                        <div key={pi} className="flex items-start gap-1">
                          {pair.map((n) => cell(n))}
                          {isBus && pi === 0 && <div className="flex w-5 items-center justify-center text-[8px] text-slate-300">🚶</div>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      ))}
      <p className="mt-1 text-[10px] text-slate-400">Layout runs front (driver) → back, left to right. Pairs sit together; buses show 2+2 with a centre aisle; driver seat excluded. Dark chips = seated (drag to move) · red = blocked · amber = reserved · dashed = free (drop target; click to block). Driver seat excluded.</p>
    </div>
  );
}
