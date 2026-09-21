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
  const ag: any = ctx.profile.agencies || {};
  const status = ag?.subscription_status;
  // auto-suspend on expired trial — payment is then marked manually by the platform admin
  if (status === 'trialing' && ag?.trial_ends_at && new Date(ag.trial_ends_at) < new Date()) {
    const db = createAdminClient();
    await db.from('agencies').update({ subscription_status: 'suspended' }).eq('id', ctx.profile.agency_id);
    redirect('/billing');
  }
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

/* ============ Per-user module permissions ============ */
// Module access by subscription plan (Starter / Professional / Enterprise)
export const PLAN_MODULES: Record<string, string[]> = {
  starter: ['calendar', 'leads', 'customers', 'bookings', 'flightsales', 'hotelsales', 'visasales', 'transportsales',
    'umrahsales', 'hajjsales', 'toursales', 'packages', 'documents', 'tasks', 'support', 'invoices', 'settings', 'billing'],
  professional: ['calendar', 'leads', 'customers', 'bookings', 'flightsales', 'hotelsales', 'visasales', 'transportsales',
    'umrahsales', 'hajjsales', 'toursales', 'packages', 'documents', 'tasks', 'support', 'invoices', 'quotations', 'reports', 'accounts', 'settings', 'billing'],
  enterprise: ['calendar', 'leads', 'customers', 'bookings', 'flightsales', 'hotelsales', 'visasales', 'transportsales',
    'umrahsales', 'hajjsales', 'toursales', 'packages', 'documents', 'tasks', 'support', 'invoices', 'quotations', 'reports', 'accounts', 'hr', 'vault', 'settings', 'billing'],
};
export function planAllows(plan: any, key: string): boolean {
  const p = PLAN_MODULES[String(plan || '').toLowerCase()] || PLAN_MODULES.starter;
  return p.includes(key);
}

// All tenant modules. 'min' = minimum role that can ever be granted it.
export const MODULES: { key: string; label: string; icon: string; min: 'staff' | 'manager' | 'owner' }[] = [
  { key: 'calendar', label: 'Bookings Calendar', icon: '📅', min: 'staff' },
  { key: 'leads', label: 'Leads', icon: '🎯', min: 'staff' },
  { key: 'customers', label: 'Customers', icon: '👥', min: 'staff' },
  { key: 'bookings', label: 'Bookings', icon: '🧾', min: 'staff' },
  { key: 'flightsales', label: 'Flight Sales', icon: '🎫', min: 'staff' },
  { key: 'hotelsales', label: 'Hotel Sales', icon: '🏨', min: 'staff' },
  { key: 'visasales', label: 'Visa Sales', icon: '🛂', min: 'staff' },
  { key: 'transportsales', label: 'Transport & Ziyarat', icon: '🚌', min: 'staff' },
  { key: 'umrahsales', label: 'Umrah Sales', icon: '🕋', min: 'staff' },
  { key: 'vault', label: 'Credential Vault', icon: '🔐', min: 'manager' },
  { key: 'settings', label: 'Settings', icon: '⚙️', min: 'owner' },
  { key: 'billing', label: 'Billing', icon: '💳', min: 'owner' },
  { key: 'hajjsales', label: 'Hajj Sales', icon: '🕌', min: 'staff' },
  { key: 'toursales', label: 'Tour Sales', icon: '🌍', min: 'staff' },
  { key: 'packages', label: 'Packages', icon: '📦', min: 'staff' },
  { key: 'flights', label: 'Flights', icon: '✈️', min: 'staff' },
  { key: 'hotels', label: 'Hotels', icon: '🏨', min: 'staff' },
  { key: 'visas', label: 'Visas', icon: '🛂', min: 'staff' },
  { key: 'transports', label: 'Transports', icon: '🚌', min: 'staff' },
  { key: 'documents', label: 'Documents', icon: '🗄️', min: 'staff' },
  { key: 'tasks', label: 'Tasks', icon: '✅', min: 'staff' },
  { key: 'support', label: 'Support', icon: '🎧', min: 'staff' },
  { key: 'invoices', label: 'Invoices', icon: '💰', min: 'manager' },
  { key: 'quotations', label: 'Quotations', icon: '📝', min: 'manager' },
  { key: 'reports', label: 'Reports', icon: '📊', min: 'manager' },
  { key: 'hr', label: 'HR', icon: '🧑‍💼', min: 'manager' },
  { key: 'accounts', label: 'Accounts', icon: '🏦', min: 'manager' },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);

// modules a user can access. Owner: everything. null modules: everything for their rank.
export function allowedModules(profile: any, role: string): string[] {
  if (role === 'owner') return MODULE_KEYS.filter((k) => planAllows(profile?.agencies?.plan, k));
  const set = Array.isArray(profile?.modules) && profile.modules.length ? profile.modules : MODULE_KEYS;
  return set.filter((k: string) =>
    MODULES.some((m) => m.key === k && RANK[role] >= RANK[m.min]) && planAllows(profile?.agencies?.plan, k));

}

// gate for a specific module page
export async function requireModule(key: string) {
  const ctx = await requireActiveAgency();
  if (!allowedModules(ctx.profile, ctx.role).includes(key)) {
    redirect('/dashboard?denied=' + key);
  }
  return ctx;
}

// default modules for a new member by role
export function defaultModulesForRole(role: string): string[] | null {
  if (role === 'owner') return null; // all
  const base = ['leads', 'customers', 'bookings', 'packages', 'flights', 'hotels', 'visas', 'transports', 'documents', 'tasks', 'support'];
  return role === 'manager' ? [...base, 'invoices', 'quotations', 'reports'] : base;
}

// Super-admin portal gate
export async function requireSuperadmin() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== 'superadmin') redirect('/dashboard');
  return ctx;
}

// Staff privacy: when the agency owner enables it, staff-level users only see their own records
export function staffPrivacyOn(ctx: any): boolean {
  return ctx?.role === 'staff' && ctx?.agency?.staff_privacy === true;
}
