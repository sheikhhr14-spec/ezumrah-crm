import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/dashboard-header';
import ChatWidget from '@/components/chat-widget';
import { requireActiveAgency } from '@/lib/data';
import { syncNotifications } from '@/lib/crm-actions';
import { createClient } from '@/lib/supabase/server';
import ActionSpinner from '@/components/action-spinner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireActiveAgency();
  const agency: any = ctx.agency;

  // announcements visible to this tenant (broadcast + targeted)
  const supabase = await createClient();
  const { data: announcements } = await supabase.from('announcements')
    .select('id, title, body, type, created_at')
    .or(`agency_id.is.null,agency_id.eq.${agency.id}`)
    .order('created_at', { ascending: false })
    .limit(1);

  const latest = announcements?.[0];

  let notifications: any[] = [];
  try { notifications = await syncNotifications(); } catch { /* bell is non-critical */ }

  return (
    <div
      className="flex min-h-screen"
      style={{ '--portal-accent': agency.brand_color || '#b8923f' } as React.CSSProperties}
    >
      <Sidebar
        agencyName={agency.name}
        userName={ctx.profile?.full_name || ctx.user.email || ''}
        role={ctx.role}
        isAdmin={ctx.profile?.role === 'superadmin'}
        accentColor={agency.brand_color}
        label={agency.label}
        profile={ctx.profile}
        notifications={notifications}
      />
      <main className="flex-1 overflow-x-auto bg-slate-50 p-8">
        <ChatWidget />
        <DashboardHeader
          userName={ctx.profile?.full_name || ctx.user.email || ''}
          notifications={notifications}
        />
        {latest && (
          <div className={`mb-6 rounded-xl border p-4 ${
            latest.type === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-gold/30 accent-soft-bg'
          }`}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">📢 Announcement from EzUmrah</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{latest.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{latest.body}</p>
            <p className="mt-2 text-xs text-slate-400">{new Date(latest.created_at).toLocaleDateString()}</p>
          </div>
        )}
        {children}
        <ActionSpinner />
      </main>
    </div>
  );
}
