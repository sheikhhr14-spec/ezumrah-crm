'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

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
  const plan = String(formData.get('plan') || 'starter');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) redirect('/signup?error=' + encodeURIComponent(error.message));
  if (!data.user) redirect('/signup?error=Check your email to confirm your account');

  // Create the agency + link the profile
  const db = createAdminClient();
  const { data: agency } = await db
    .from('agencies')
    .insert({ name: agencyName, plan, subscription_status: 'incomplete' })
    .select()
    .single();

  await db
    .from('profiles')
    .update({ agency_id: agency.id, full_name: fullName, role: 'owner' })
    .eq('id', data.user.id);

  redirect('/billing');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
