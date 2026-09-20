'use client';
import { useState } from 'react';
import { COUNTRIES } from '@/lib/format';

export default function CountryRegionPicker({ country, currency, timezone }: {
  country: string | null; currency: string; timezone: string;
}) {
  const [c, setC] = useState(country || '');
  const [cur, setCur] = useState(currency || 'USD');
  const [tz, setTz] = useState(timezone || 'UTC');
  const onCountry = (code: string) => {
    setC(code);
    const p = COUNTRIES.find((x) => x.code === code);
    if (p) { setCur(p.currency); setTz(p.timezone); }
  };
  return (
    <>
      <label className="block">
        <span className="text-xs font-semibold text-slate-600">Country</span>
        <select className="input" name="country" value={c} onChange={(e) => onCountry(e.target.value)}>
          <option value="">Select your country…</option>
          {COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-slate-600">Currency <span className="font-normal text-slate-400">(auto-set by country)</span></span>
        <select className="input" name="currency" value={cur} onChange={(e) => setCur(e.target.value)}>
          {Array.from(new Set(COUNTRIES.map((x) => x.currency))).sort().map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-slate-600">Timezone <span className="font-normal text-slate-400">(auto-set by country)</span></span>
        <select className="input" name="timezone" value={tz} onChange={(e) => setTz(e.target.value)}>
          {Array.from(new Set(COUNTRIES.map((x) => x.timezone))).concat(['UTC']).sort().map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
    </>
  );
}
