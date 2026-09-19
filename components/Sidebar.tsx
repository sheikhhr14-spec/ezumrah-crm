import Link from 'next/link';
import { logout } from '@/lib/auth-actions';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/customers', label: 'Customers', icon: '👥' },
  { href: '/dashboard/bookings', label: 'Bookings', icon: '🧾' },
  { href: '/dashboard/packages', label: 'Packages', icon: '📦' },
  { href: '/dashboard/invoices', label: 'Invoices', icon: '💰' },
  { href: '/dashboard/quotations', label: 'Quotations', icon: '📝' },
  { href: '/dashboard/documents', label: 'Documents', icon: '🗄️' },
  { href: '/dashboard/tasks', label: 'Tasks', icon: '✅' },
];

export default function Sidebar({ agencyName, userName }: { agencyName: string; userName: string }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold font-bold text-white">E</div>
        <div>
          <p className="text-sm font-bold text-slate-900">EzUmrah CRM</p>
          <p className="text-xs text-slate-400">{agencyName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-gold/10 hover:text-gold"
          >
            <span>{item.icon}</span> {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <p className="px-3 pb-2 text-xs text-slate-400">{userName}</p>
        <form action={logout}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100" type="submit">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
