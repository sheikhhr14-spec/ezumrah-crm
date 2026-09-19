import Sidebar from '@/components/Sidebar';
import { requireSuperadmin } from '@/lib/data';
import Link from 'next/link';

const ADMIN_NAV = [
  { href: '/admin', label: 'Platform Overview', icon: '📈' },
  { href: '/admin/agencies', label: 'Agencies (Tenants)', icon: '🏢' },
  { href: '/admin/users', label: 'Users', icon: '👤' },
  { href: '/dashboard', label: 'Agency CRM →', icon: '↗' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSuperadmin();
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 font-bold text-white">E</div>
          <div>
            <p className="text-sm font-bold text-slate-900">EzUmrah Platform</p>
            <p className="text-xs text-gold">Super Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {ADMIN_NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-gold/10 hover:text-gold">
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="px-3 pb-2 text-xs text-slate-400">{ctx.profile?.full_name || ctx.user.email}</p>
          <form action={async () => { 'use server'; const { logout } = await import('@/lib/auth-actions'); await logout(); }}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}
