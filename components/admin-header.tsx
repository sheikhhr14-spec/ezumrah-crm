import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import { logout } from '@/lib/auth-actions';

export default function AdminHeader({ userName }: { userName: string }) {
  const initials = (userName || 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <Link href="/admin" className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg accent-bg font-bold text-white">E</span>
        <span className="hidden text-sm font-bold text-slate-900 sm:block">EzUmrah Platform</span>
      </Link>
      <form action="/admin/agencies" className="ml-auto hidden max-w-sm flex-1 items-center gap-2 md:flex">
        <input className="input h-9" name="q" placeholder="Search agencies by name or email…" />
        <button className="btn-secondary h-9 px-3 text-xs" type="submit">Search</button>
      </form>
      <div className="ml-auto flex items-center gap-3 md:ml-0">
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full accent-bg text-[11px] font-bold text-white">{initials}</span>
          <span className="hidden text-xs font-semibold text-slate-600 sm:block">{userName}</span>
        </div>
        <form action={logout}>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-red-500"
            title="Sign out" type="submit">⏻</button>
        </form>
      </div>
    </header>
  );
}
