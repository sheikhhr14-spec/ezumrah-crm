import { logout } from '@/lib/auth-actions';
import NotificationBell from '@/components/notification-bell';
import ThemeToggle from '@/components/theme-toggle';
import QuickAddMenu from '@/components/quick-add-menu';

export default function DashboardHeader({ userName, userRole, notifications = [] }: {
  userName: string;
  userRole?: string;
  notifications?: { id: string; title: string; body: string | null; href: string | null; read: boolean; created_at: string }[];
}) {
  const initials = (userName || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="sticky top-0 z-40 -mx-2 mb-6 flex h-14 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/90 px-3 shadow-sm backdrop-blur">
      <form action="/dashboard/search" className="relative min-w-[180px] flex-1 md:max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
        <input name="q" placeholder="Search customers, bookings, invoices, sales…" className="input h-9 pl-9" autoComplete="off" />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <QuickAddMenu />
        <NotificationBell items={notifications} />
        <ThemeToggle />
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full accent-bg text-[11px] font-bold text-white">{initials}</span>
          <span className="hidden text-xs font-semibold text-slate-600 md:block">
            {userName}
            {userRole && <span className="ml-1 rounded accent-soft-bg px-1 py-0.5 text-[10px] font-bold uppercase accent">{userRole}</span>}
          </span>
        </div>
        <form action={logout}>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            title={`Sign out (${userName})`} type="submit">⏻</button>
        </form>
      </div>
    </header>
  );
}
