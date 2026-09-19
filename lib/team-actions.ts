'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole, defaultModulesForRole } from '@/lib/data';
import { revalidatePath } from 'next/cache';

export async function inviteMember(fd: FormData) {
  const ctx = await requireRole('owner');
  const db = createAdminClient();
  const email = String(fd.get('email'));
  const password = String(fd.get('password'));
  const fullName = String(fd.get('full_name'));
  const role = String(fd.get('role') || 'staff');

  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(error.message);

  await db.from('profiles').upsert({
    id: created.user.id,
    agency_id: ctx.profile.agency_id,
    full_name: fullName,
    role,
    modules: defaultModulesForRole(role),
  });
  revalidatePath('/dashboard/team');
}

export async function changeMemberRole(fd: FormData) {
  const ctx = await requireRole('owner');
  const db = createAdminClient();
  const id = String(fd.get('id'));
  // never allow editing yourself or the superadmin
  if (id === ctx.user.id) throw new Error('You cannot change your own role here.');
  await db.from('profiles').update({ role: String(fd.get('role')) })
    .eq('id', id)
    .eq('agency_id', ctx.profile.agency_id);
  revalidatePath('/dashboard/team');
}

export async function removeMember(fd: FormData) {
  const ctx = await requireRole('owner');
  const db = createAdminClient();
  const id = String(fd.get('id'));
  if (id === ctx.user.id) throw new Error('You cannot remove yourself.');
  const { data: member } = await db.from('profiles').select('id, agency_id')
    .eq('id', id).eq('agency_id', ctx.profile.agency_id).single();
  if (!member) throw new Error('Member not found in your agency.');
  await db.from('profiles').delete().eq('id', id);
  await db.auth.admin.deleteUser(id);
  revalidatePath('/dashboard/team');
}

// Owner assigns which modules a member can access
export async function setMemberModules(fd: FormData) {
  const ctx = await requireRole('owner');
  const db = createAdminClient();
  const id = String(fd.get('id'));
  if (id === ctx.user.id) throw new Error('Owners always have full access.');
  const selected = fd.getAll('modules').map(String);
  await db.from('profiles').update({ modules: selected })
    .eq('id', id).eq('agency_id', ctx.profile.agency_id);
  revalidatePath('/dashboard/team');
}
