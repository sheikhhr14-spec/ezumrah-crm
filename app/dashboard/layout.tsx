import Sidebar from '@/components/Sidebar';
import { requireActiveAgency } from '@/lib/data';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireActiveAgency();
  return (
    <div className="flex min-h-screen">
      <Sidebar
        agencyName={ctx.agency.name}
        userName={ctx.profile?.full_name || ctx.user.email || ''}
      />
      <main className="flex-1 overflow-x-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}
