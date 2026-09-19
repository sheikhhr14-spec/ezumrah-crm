import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';
import { redirect } from 'next/navigation';

export type Role = 'superadmin' | 'owner' | 'manager' | 'staff';

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  const { data: profile } = await db
    .from('profiles')
    .select('*, agencies(*)')
    .eq('id', user.id)
    .single();

  return { user, profile };
});

export async function requireUser() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect('/login');
  return ctx;
}

// Tenant area: needs an active agency + paid subscription
export async function requireActiveAgency() {
  const ctx = await requireUser();
  const role = (ctx.profile?.role as Role) || 'staff';
  if (role === 'superadmin') redirect('/admin');
  if (!ctx.profile?.agency_id) redirect('/signup/agency');
  const status = ctx.profile.agencies?.subscription_status;
  if (status !== 'active' && status !== 'trialing') redirect('/billing');
  return { ...ctx, role, agency: ctx.profile.agencies };
}

// Role-based access: 'owner' > 'manager' > 'staff'
const RANK: Record<string, number> = { owner: 3, manager: 2, staff: 1 };
export async function requireRole(min: 'owner' | 'manager' | 'staff') {
  const ctx = await requireActiveAgency();
  if ((RANK[ctx.role] || 0) < RANK[min]) {
    redirect('/dashboard?denied=1');
  }
  return ctx;
}

// Super-admin portal gate
export async function requireSuperadmin() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== 'superadmin') redirect('/dashboard');
  return ctx;
}
