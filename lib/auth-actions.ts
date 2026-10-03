'use server';

import { createClient } from '@/lib/supabase/server';

function serverConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { PLANS } from '@/lib/billing';

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const fullName = String(formData.get('full_name'));
  const agencyName = String(formData.get('agency_name'));
  const plan = String(formData.get('plan') || 'professional');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) redirect('/signup?error=' + encodeURIComponent(error.message));
  if (!data.user) redirect('/signup?error=Check your email to confirm your account');

  // Create the agency + link the profile
  const db = createAdminClient();
  const isEnterprise = plan === 'enterprise';
  const seats = isEnterprise ? null : (Number((PLANS as any)[plan]?.users_included) || 2);
  const trialEndsAt = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
  const { data: agency } = await db
    .from('agencies')
    .insert({ name: agencyName, plan, subscription_status: 'trialing', trial_ends_at: trialEndsAt, seats })
    .select()
    .single();

  await db
    .from('profiles')
    .update({ agency_id: agency.id, full_name: fullName, role: 'owner' })
    .eq('id', data.user.id);

  if (isEnterprise) {
    try {
      const { sendPlatformEmail } = await import('@/lib/email');
      await sendPlatformEmail({
        to: 'hamza@ezumrah.com',
        subject: `New Enterprise enquiry — ${agencyName}`,
        html: `<p>An agency signed up for the <b>Enterprise</b> plan:</p><p><b>${agencyName}</b><br/>Owner: ${fullName} (${email})</p><p>Contact them to prepare custom pricing (white-labeling, GDS, API access).</p>`,
      });
    } catch { /* non-fatal */ }
  }

  redirect(isEnterprise ? '/billing?enterprise=1' : '/billing');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
