'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperadmin } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/* ============ AGENCIES (tenants) CRUD ============ */

export async function createAgency(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const name = String(fd.get('name') || '').trim();
  if (!name) return;
  const { data } = await db.from('agencies').insert({
    name,
    email: String(fd.get('email') || '').trim() || null,
    plan: String(fd.get('plan') || 'starter'),
    subscription_status: String(fd.get('subscription_status') || 'trialing'),
    trial_ends_at: String(fd.get('trial_ends_at') || '') || null,
    label: String(fd.get('label') || '').trim() || null,
    brand_color: String(fd.get('brand_color') || '').trim() || null,
  }).select('id').single();
  revalidatePath('/admin/agencies');
  revalidatePath('/admin');
  if (data) redirect(`/admin/agencies/${data.id}`);
}

export async function updateAgency(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.from('agencies').update({
    name: String(fd.get('name') || '').trim(),
    email: String(fd.get('email') || '').trim() || null,
    plan: String(fd.get('plan') || 'starter'),
    subscription_status: String(fd.get('subscription_status') || 'trialing'),
    trial_ends_at: String(fd.get('trial_ends_at') || '') || null,
    label: String(fd.get('label') || '').trim() || null,
    brand_color: String(fd.get('brand_color') || '').trim() || null,
  }).eq('id', id);
  revalidatePath('/admin/agencies');
  revalidatePath(`/admin/agencies/${id}`);
  revalidatePath('/admin/subscriptions');
}

export async function setAgencyStatus(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.from('agencies').update({ subscription_status: String(fd.get('status')) }).eq('id', id);
  revalidatePath('/admin/agencies');
  revalidatePath(`/admin/agencies/${id}`);
  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin');
}

export async function setAgencyPlan(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.from('agencies').update({ plan: String(fd.get('plan')) }).eq('id', id);
  revalidatePath(`/admin/agencies/${id}`);
  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin');
}

export async function deleteAgency(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  // delete tenant data first (FK-safe order)
  for (const t of ['support_ticket_replies', 'support_tickets', 'platform_invoices', 'documents', 'tasks',
                   'invoice_items', 'invoices', 'quotation_items', 'quotations', 'transports', 'visas',
                   'flights', 'hotels', 'bookings', 'customers', 'packages', 'announcements']) {
    const col = t === 'announcements' ? 'agency_id' : 'agency_id';
    if (t === 'support_ticket_replies') {
      const { data: tids } = await db.from('support_tickets').select('id').eq('agency_id', id);
      const ids = (tids || []).map((r: any) => r.id);
      if (ids.length) await db.from('support_ticket_replies').delete().in('ticket_id', ids);
      continue;
    }
    await db.from(t).delete().eq(col, id);
  }
  // remove tenant users (auth + profile)
  const { data: members } = await db.from('profiles').select('id').eq('agency_id', id);
  for (const m of members || []) {
    await db.auth.admin.deleteUser(m.id).catch(() => {});
    await db.from('profiles').delete().eq('id', m.id);
  }
  await db.from('agencies').delete().eq('id', id);
  revalidatePath('/admin/agencies');
  revalidatePath('/admin');
  redirect('/admin/agencies');
}

/* ============ USERS ============ */

export async function setUserRole(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  await db.from('profiles').update({ role: String(fd.get('role')) }).eq('id', String(fd.get('id')));
  revalidatePath('/admin/users');
  revalidatePath(`/admin/agencies/${fd.get('agency_id')}`);
}

export async function deleteUser(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.auth.admin.deleteUser(id);
  await db.from('profiles').delete().eq('id', id);
  revalidatePath('/admin/users');
  revalidatePath(`/admin/agencies/${fd.get('agency_id')}`);
}

/* ============ SAAS INVOICES & PAYMENTS ============ */

export async function createInvoice(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const agency_id = String(fd.get('agency_id'));
  const amount = Number(fd.get('amount') || 0);
  const plan = String(fd.get('plan') || 'starter');
  const n = Date.now().toString().slice(-6);
  await db.from('platform_invoices').insert({
    agency_id,
    number: `SAAS-${n}`,
    plan,
    amount,
    currency: String(fd.get('currency') || 'USD'),
    period_start: String(fd.get('period_start') || '') || null,
    period_end: String(fd.get('period_end') || '') || null,
    status: 'open',
  });
  revalidatePath('/admin/invoices');
  revalidatePath('/admin');
}

export async function markInvoicePaid(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.from('platform_invoices').update({
    status: 'paid', paid_at: new Date().toISOString(),
    stripe_payment_id: String(fd.get('stripe_payment_id') || '').trim() || null,
  }).eq('id', id);
  revalidatePath('/admin/invoices');
  revalidatePath('/admin');
}

export async function voidInvoice(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  await db.from('platform_invoices').update({ status: 'void' }).eq('id', String(fd.get('id')));
  revalidatePath('/admin/invoices');
}

export async function deleteInvoice(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  await db.from('platform_invoices').delete().eq('id', String(fd.get('id')));
  revalidatePath('/admin/invoices');
  revalidatePath('/admin');
}

/* ============ ANNOUNCEMENTS ============ */

export async function createAnnouncement(fd: FormData) {
  const ctx = await requireSuperadmin();
  const db = createAdminClient();
  const title = String(fd.get('title') || '').trim();
  const body = String(fd.get('body') || '').trim();
  if (!title || !body) return;
  const agency = String(fd.get('agency_id') || '');
  await db.from('announcements').insert({
    title, body,
    type: String(fd.get('type') || 'info'),
    agency_id: agency || null,
    created_by: ctx.profile?.id || null,
  });
  revalidatePath('/admin/announcements');
  revalidatePath('/admin');
}

export async function deleteAnnouncement(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  await db.from('announcements').delete().eq('id', String(fd.get('id')));
  revalidatePath('/admin/announcements');
}

/* ============ SUPPORT ============ */

export async function replyTicket(fd: FormData) {
  const ctx = await requireSuperadmin();
  const db = createAdminClient();
  const ticket_id = String(fd.get('ticket_id'));
  const message = String(fd.get('message') || '').trim();
  if (!message) return;
  await db.from('support_ticket_replies').insert({
    ticket_id, message, is_staff: true,
    profile_id: ctx.profile?.id || null,
  });
  await db.from('support_tickets').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', ticket_id);
  revalidatePath(`/admin/support/${ticket_id}`);
  revalidatePath('/admin/support');
}

export async function setTicketStatus(fd: FormData) {
  await requireSuperadmin();
  const db = createAdminClient();
  const id = String(fd.get('id'));
  await db.from('support_tickets').update({ status: String(fd.get('status')), updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/admin/support/${id}`);
  revalidatePath('/admin/support');
}

/* ============ PORTAL SETTINGS (super-admin theming) ============ */

export async function savePortalTheme(fd: FormData) {
  const ctx = await requireSuperadmin();
  const db = createAdminClient();
  await db.from('profiles').update({
    portal_accent: String(fd.get('portal_accent') || '#b8923f'),
  }).eq('id', ctx.profile!.id);
  revalidatePath('/admin', 'layout');
  revalidatePath('/admin/settings');
}
