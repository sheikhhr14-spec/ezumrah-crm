'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperadmin } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function setAgencyStatus(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  const status = String(fd.get('status'));
  await db.from('agencies').update({ subscription_status: status }).eq('id', id);
  revalidatePath('/admin/agencies');
  revalidatePath(`/admin/agencies/${id}`);
}

export async function setAgencyPlan(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.from('agencies').update({ plan: String(fd.get('plan')) }).eq('id', id);
  revalidatePath(`/admin/agencies/${id}`);
}

export async function deleteAgency(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.from('agencies').delete().eq('id', id);
  revalidatePath('/admin/agencies');
  redirect('/admin/agencies');
}

export async function setUserRole(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  await db.from('profiles').update({ role: String(fd.get('role')) }).eq('id', String(fd.get('id')));
  revalidatePath('/admin/users');
  revalidatePath('/admin/agencies/' + fd.get('agency_id'));
}

// Ban a user from the platform (deletes auth user)
export async function deleteUser(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.auth.admin.deleteUser(id);
  await db.from('profiles').delete().eq('id', id);
  revalidatePath('/admin/users');
}
