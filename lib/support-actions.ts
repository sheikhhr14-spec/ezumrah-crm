'use server';

import { createClient } from '@/lib/supabase/server';
import { requireActiveAgency } from '@/lib/data';
import { revalidatePath } from 'next/cache';

export async function createTenantTicket(fd: FormData) {
  const ctx = await requireActiveAgency();
  const db = await createClient();
  const subject = String(fd.get('subject') || '').trim();
  const message = String(fd.get('message') || '').trim();
  if (!subject || !message) return;
  await db.from('support_tickets').insert({
    agency_id: (ctx.agency as any).id,
    profile_id: ctx.profile!.id,
    subject,
    message,
    priority: String(fd.get('priority') || 'normal'),
    status: 'open',
  });
  revalidatePath('/dashboard/support');
}

export async function replyTenantTicket(fd: FormData) {
  const ctx = await requireActiveAgency();
  const db = await createClient();
  const ticket_id = String(fd.get('ticket_id'));
  const message = String(fd.get('message') || '').trim();
  if (!message) return;
  await db.from('support_ticket_replies').insert({
    ticket_id,
    profile_id: ctx.profile!.id,
    message,
    is_staff: false,
  });
  await db.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticket_id);
  revalidatePath('/dashboard/support');
}
