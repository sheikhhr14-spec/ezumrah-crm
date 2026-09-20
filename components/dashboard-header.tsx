import { logout } from '@/lib/auth-actions';
import NotificationBell from '@/components/notification-bell';
import ThemeToggle from '@/components/theme-toggle';

export default function DashboardHeader({ userName, notifications = [] }: {
  userName: string;
  notifications?: { id: string; title: string; body: string | null; href: string | null; read: boolean; created_at: string }[];
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <form action="/dashboard/search" className="relative min-w-[220px] flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
        <input
          name="q"
          placeholder="Search customers, bookings, invoices, sales…"
          className="input pl-9"
          autoComplete="off"
        />
      </form>
      <div className="flex items-center gap-2">
        <NotificationBell items={notifications} />
        <ThemeToggle />
      </div>
      <div className="hidden h-6 w-px bg-slate-200 sm:block" />
      <div className="flex items-center gap-2">
        <span className="hidden text-xs font-medium text-slate-400 md:block">{userName}</span>
        <form action={logout}>
          <button className="btn-secondary !px-3 !py-2 text-xs" type="submit" title={`Sign out (${userName})`}>Sign out</button>
        </form>
      </div>
    </header>
  );
}
