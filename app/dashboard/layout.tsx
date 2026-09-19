import Sidebar from '@/components/Sidebar';
import { requireActiveAgency } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

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

  return (
    <div className="flex min-h-screen">
      <Sidebar
        agencyName={agency.name}
        userName={ctx.profile?.full_name || ctx.user.email || ''}
        role={ctx.role}
        isAdmin={ctx.profile?.role === 'superadmin'}
        accentColor={agency.brand_color}
        label={agency.label}
        profile={ctx.profile}
      />
      <main className="flex-1 overflow-x-auto bg-slate-50 p-8">
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
      </main>
    </div>
  );
}
