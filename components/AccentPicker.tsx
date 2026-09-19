'use client';

import { useState } from 'react';

const SWATCHES = [
  { name: 'Champagne Gold', value: '#b8923f' },
  { name: 'Royal Teal', value: '#0d9488' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Ocean Blue', value: '#2563eb' },
  { name: 'Royal Purple', value: '#7c3aed' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Slate (neutral)', value: '#334155' },
  { name: 'Midnight', value: '#1e293b' },
];

export default function AccentPicker({ current, name = 'portal_accent' }: { current?: string; name?: string }) {
  const [color, setColor] = useState(current || '#b8923f');
  return (
    <div>
      <input type="hidden" name={name} value={color} />
      <div className="mb-4 flex flex-wrap gap-2">
        {SWATCHES.map((s) => (
          <button key={s.value} type="button" onClick={() => setColor(s.value)} className="flex flex-col items-center gap-1">
            <span
              className={`h-10 w-10 rounded-full border-2 shadow-sm transition ${color === s.value ? 'border-white ring-2 ring-slate-900 scale-110' : 'border-white ring-1 ring-slate-200'}`}
              style={{ background: s.value }}
            />
            <span className="text-[10px] text-slate-500">{s.name}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border border-slate-200" />
        <input value={color} onChange={(e) => setColor(e.target.value)}
          className="input max-w-32 font-mono text-xs" />
        <span className="text-xs text-slate-400">Custom color</span>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Preview: <span className="font-semibold" style={{ color }}>Accent text</span> ·
        <span className="ml-2 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: color, color: '#fff' }}>Badge</span> ·
        <span className="ml-2 rounded-lg px-3 py-1 text-xs font-semibold" style={{ background: color }}>Button</span>
      </p>
    </div>
  );
}
