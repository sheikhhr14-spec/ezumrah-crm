'use client';
import { useState } from 'react';
import Link from 'next/link';

const ITEMS: { label: string; icon: string; href: string }[] = [
  { label: 'Customer', icon: '👤', href: '/dashboard/customers' },
  { label: 'Lead', icon: '🎯', href: '/dashboard/leads' },
  { label: 'Booking', icon: '🧾', href: '/dashboard/bookings' },
  { label: 'Flight sale', icon: '✈️', href: '/dashboard/flight-sales' },
  { label: 'Hotel sale', icon: '🏨', href: '/dashboard/hotel-sales' },
  { label: 'Visa sale', icon: '🛂', href: '/dashboard/visa-sales' },
  { label: 'Transport / Ziyarat', icon: '🚌', href: '/dashboard/transport-sales' },
  { label: 'Package sale', icon: '📦', href: '/dashboard/package-sales' },
  { label: 'Invoice', icon: '💵', href: '/dashboard/invoices' },
  { label: 'Task', icon: '✅', href: '/dashboard/tasks' },
];

export default function QuickAddMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="btn-primary flex items-center gap-1 !py-2 text-xs"
      >
        ＋ New <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {ITEMS.map((it) => (
            <Link key={it.href} href={it.href} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
              <span>{it.icon}</span> {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
