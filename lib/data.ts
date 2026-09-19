import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

// Current session user + their agency
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

export async function requireActiveAgency() {
  const ctx = await requireUser();
  if (!ctx.profile?.agency_id) redirect('/signup/agency');
  const status = ctx.profile.agencies?.subscription_status;
  if (status !== 'active' && status !== 'trialing') redirect('/billing');
  return { ...ctx, agency: ctx.profile.agencies };
}

import { redirect } from 'next/navigation';
