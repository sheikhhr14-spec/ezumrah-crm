'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  const toggle = () => {
    const d = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', d);
    try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch {}
    setDark(d);
  };
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm transition hover:bg-slate-50"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
