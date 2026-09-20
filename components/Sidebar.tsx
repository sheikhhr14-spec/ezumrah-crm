import Link from 'next/link';
import NotificationBell from '@/components/notification-bell';
import ThemeToggle from '@/components/theme-toggle';
import { logout } from '@/lib/auth-actions';
import { MODULES, allowedModules } from '@/lib/data';

// some module keys differ from their route slugs
const ROUTE: Record<string, string> = {
  flightsales: 'flight-sales',
  hotelsales: 'hotel-sales',
  visasales: 'visa-sales',
  transportsales: 'transport-sales',
  umrahsales: 'umrah-sales',
  settings: 'settings',
  billing: 'billing',
  hajjsales: 'hajj-sales',
  toursales: 'tour-sales',
};

export default function Sidebar({ agencyName, userName, isAdmin, role, accentColor, label, profile, notifications = [] }: {
  agencyName: string; userName: string; isAdmin?: boolean; role?: string; accentColor?: string | null; label?: string | null;
  profile?: any; notifications?: { id: string; title: string; body: string | null; href: string | null; read: boolean; created_at: string }[];
}) {
  const allowed = allowedModules(profile, role || 'staff');
  const NAV = MODULES.filter((m) => allowed.includes(m.key));
  const GROUPS: { label: string; keys: string[] }[] = [
    { label: 'Sales', keys: ['leads', 'customers', 'flightsales', 'hotelsales', 'visasales', 'transportsales', 'umrahsales', 'hajjsales', 'toursales', 'quotations'] },
    { label: 'Bookings', keys: ['bookings', 'packages'] },
    { label: 'Operations', keys: ['flights', 'hotels', 'visas', 'transports', 'documents', 'tasks'] },
    { label: 'Finance', keys: ['invoices', 'accounts', 'reports'] },
    { label: 'People', keys: ['hr'] },
    { label: 'Support', keys: ['support'] },
    { label: 'System', keys: ['settings', 'billing'] },
  ];

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white"
      style={{ '--portal-accent': accentColor || '#b8923f' } as React.CSSProperties}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg accent-bg font-bold text-white">E</div>
        <div>
          <p className="text-sm font-bold text-slate-900">EzUmrah CRM</p>
          <p className="flex items-center gap-1 text-xs text-slate-400">
            {agencyName}
            {label && <span className="badge accent-soft-bg accent">{label}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell items={notifications} />
      </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <Link href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 accent-hover transition">
          <span>📊</span> Overview
        </Link>
        <div className="my-2 border-t border-slate-100" />
        {GROUPS.map((group) => {
          const items = NAV.filter((m) => group.keys.includes(m.key));
          if (!items.length) return null;
          return (
            <div key={group.label} className="mb-1">
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.label}</p>
              {items.map((item) => (
                <Link key={item.key} href={`/dashboard/${ROUTE[item.key] || item.key}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 accent-hover transition">
                  <span>{item.icon}</span> {item.label}
                </Link>
              ))}
              {group.label === 'People' && role === 'owner' && (
                <Link href="/dashboard/team"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 accent-hover">
                  <span>🧑‍🤝‍🧑</span> Team & Permissions
                </Link>
              )}
            </div>
          );
        })}
        {isAdmin && (
          <div className="my-2 border-t border-slate-100" />
        )}
        {isAdmin && (
          <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold accent accent-hover">
            <span>🛡️</span> Admin Portal
          </Link>
        )}
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
