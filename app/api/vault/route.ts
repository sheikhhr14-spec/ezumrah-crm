import { NextRequest } from 'next/server';
import { requireActiveAgency } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptSecret, decryptSecret } from '@/lib/crypto';

async function auth() {
  try { return await requireActiveAgency(); } catch { return null; }
}

export async function GET() {
  const ctx = await auth();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const db = createAdminClient();
  const { data } = await db.from('credentials')
    .select('id, platform, category, username, url, notes, created_at, updated_at')
    .eq('agency_id', ctx.profile.agency_id!).order('created_at', { ascending: false });
  return Response.json({ credentials: data || [], role: ctx.role });
}

export async function POST(req: NextRequest) {
  const ctx = await auth();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (ctx.role !== 'owner' && ctx.role !== 'manager') {
    return Response.json({ error: 'Only owners and managers can access the credential vault' }, { status: 403 });
  }
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const body = await req.json().catch(() => ({}));

  if (body.action === 'save') {
    const rec: Record<string, unknown> = {
      platform: String(body.platform || '').trim(),
      category: String(body.category || 'other').trim(),
      username: String(body.username || '').trim() || null,
      url: String(body.url || '').trim() || null,
      notes: String(body.notes || '').trim() || null,
      updated_by: ctx.profile.id,
      updated_at: new Date().toISOString(),
    };
    if (!rec.platform) return Response.json({ error: 'Platform name is required' }, { status: 400 });
    if (body.id) {
      if (body.password) rec.password_enc = encryptSecret(String(body.password));
      const { error } = await db.from('credentials').update(rec).eq('id', body.id).eq('agency_id', aid);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ ok: true, id: body.id });
    }
    if (!body.password) return Response.json({ error: 'Password is required' }, { status: 400 });
    rec.password_enc = encryptSecret(String(body.password));
    rec.created_by = ctx.profile.id;
    const { data: c, error } = await db.from('credentials').insert(rec).select('id').single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, id: c.id });
  }

  if (body.action === 'reveal') {
    const { data: c } = await db.from('credentials').select('id, agency_id, password_enc').eq('id', body.id).single();
    if (!c || c.agency_id !== aid) return Response.json({ error: 'not found' }, { status: 404 });
    try {
      return Response.json({ password: decryptSecret(c.password_enc) });
    } catch {
      return Response.json({ error: 'Unable to decrypt (key changed?)' }, { status: 500 });
    }
  }

  if (body.action === 'delete') {
    await db.from('credentials').delete().eq('id', body.id).eq('agency_id', aid);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
}
