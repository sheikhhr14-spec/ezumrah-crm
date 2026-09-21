import Link from 'next/link';
import { requireSuperadmin } from '@/lib/data';
import { logout } from '@/lib/auth-actions';
import AdminHeader from '@/components/admin-header';
import ActionSpinner from '@/components/action-spinner';
import { getPlatformLogo } from '@/lib/admin-actions';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📈' },
  { href: '/admin/agencies', label: 'Agencies (Tenants)', icon: '🏢' },
  { href: '/admin/subscriptions', label: 'Subscriptions & Access', icon: '🔑' },
  { href: '/admin/invoices', label: 'Invoices & Payments', icon: '🧾' },
  { href: '/admin/users', label: 'Users', icon: '👤' },
  { href: '/admin/reports', label: 'Reports', icon: '📊' },
  { href: '/admin/announcements', label: 'Announcements', icon: '📢' },
  { href: '/admin/support', label: 'Support Tickets', icon: '🎧' },
  { href: '/admin/settings', label: 'Settings & Theme', icon: '⚙️' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSuperadmin();
  const accent = (ctx.profile as any)?.portal_accent || '#b8923f';
  const logoUrl = await getPlatformLogo();
  const name = ctx.profile?.full_name || ctx.user.email || 'Admin';

  return (
    <div className="flex min-h-screen" style={{ '--portal-accent': accent } as React.CSSProperties}>
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          {logoUrl
            ? <img src={logoUrl} alt="logo" className="h-9 w-9 rounded-lg object-cover" />
            : <div className="flex h-9 w-9 items-center justify-center rounded-lg accent-bg font-bold text-white">E</div>}
          <div>
            <p className="text-sm font-bold text-slate-900">EzUmrah Platform</p>
            <p className="accent text-xs font-semibold">Super Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {ADMIN_NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 accent-hover transition">
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
          <div className="my-2 border-t border-slate-100" />
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 accent-hover">
            <span>↗</span> Agency CRM
          </Link>
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="px-3 pb-2 text-xs text-slate-400">{ctx.profile?.full_name || ctx.user.email}</p>
          <form action={logout}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto bg-slate-50">
        <AdminHeader userName={name} />
        <div className="p-8">{children}</div>
        <ActionSpinner />
      </main>
    </div>
  );
}
