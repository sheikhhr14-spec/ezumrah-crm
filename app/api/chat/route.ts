import { NextRequest } from 'next/server';
import { requireActiveAgency } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';

async function auth() {
  try { return await requireActiveAgency(); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const ctx = await auth();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const me = ctx.profile.id;
  const convo = req.nextUrl.searchParams.get('convo'); // 'group' | conversation uuid

  const [{ data: team }, { data: reads }, { data: recent }, { data: myA }, { data: myB }] = await Promise.all([
    db.from('profiles').select('id, full_name, role').eq('agency_id', aid).neq('id', me).order('full_name'),
    db.from('chat_reads').select('scope, last_read_at').eq('profile_id', me),
    db.from('chat_messages').select('id, conversation_id, profile_id, body, created_at, deleted_at')
      .eq('agency_id', aid).order('created_at', { ascending: false }).limit(300),
    db.from('chat_conversations').select('id, a_id, b_id, created_at').eq('agency_id', aid).eq('a_id', me),
    db.from('chat_conversations').select('id, a_id, b_id, created_at').eq('agency_id', aid).eq('b_id', me),
  ]);

  let threadData: any[] | null = null;
  if (convo) {
    const base = db.from('chat_messages').select('id, conversation_id, profile_id, body, created_at, deleted_at');
    const q = convo === 'group'
      ? base.eq('agency_id', aid).is('conversation_id', null)
      : base.eq('conversation_id', convo);
    const { data: td } = await q.order('created_at', { ascending: true }).limit(150);
    threadData = td || [];
  }

  const readMap = new Map((reads || []).map((r: any) => [r.scope, new Date(r.last_read_at).getTime()]));
  const all = (recent || []) as any[];

  // group conversation
  const groupMsgs = all.filter((m) => !m.conversation_id);
  const gRead = readMap.get('group') || 0;
  const convos: any[] = [{
    key: 'group', kind: 'group', name: 'Team Group',
    last: groupMsgs[0] || null,
    unread: groupMsgs.filter((m) => m.profile_id !== me && new Date(m.created_at).getTime() > gRead).length,
  }];

  // direct conversations (one per team member)
  const convMap = new Map<string, string>(); // otherId -> conversation id
  for (const cv of [...(myA || []), ...(myB || [])] as any[]) {
    convMap.set(cv.a_id === me ? cv.b_id : cv.a_id, cv.id);
  }
  for (const t of (team || []) as any[]) {
    const cvId = convMap.get(t.id);
    const msgs = cvId ? all.filter((m) => m.conversation_id === cvId) : [];
    const r = cvId ? (readMap.get(cvId) || 0) : 0;
    convos.push({
      key: 'dm:' + t.id, kind: 'direct', other: t.id, name: t.full_name, role: t.role,
      convoId: cvId || null, last: msgs[0] || null,
      unread: msgs.filter((m) => m.profile_id !== me && new Date(m.created_at).getTime() > r).length,
    });
  }

  if (convo) {
    const scope = convo === 'group' ? 'group' : convo;
    await db.from('chat_reads').upsert({ profile_id: me, scope, last_read_at: new Date().toISOString() }, { onConflict: 'profile_id,scope' });
  }

  return Response.json({
    me: { id: me, name: ctx.profile.full_name, role: ctx.role },
    team: team || [],
    convos,
    messages: threadData,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await auth();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const me = ctx.profile.id;
  const body = await req.json().catch(() => ({}));

  if (body.action === 'send') {
    const text = String(body.body || '').trim().slice(0, 2000);
    if (!text) return Response.json({ error: 'empty' }, { status: 400 });
    let conversationId: string | null = null;
    if (body.convo === 'group') conversationId = null;
    else if (body.convoId) {
      const { data: cv } = await db.from('chat_conversations').select('id, agency_id, a_id, b_id').eq('id', body.convoId).single();
      if (!cv || cv.agency_id !== aid || (cv.a_id !== me && cv.b_id !== me)) return Response.json({ error: 'forbidden' }, { status: 403 });
      conversationId = cv.id;
    } else if (body.to) {
      // direct message: find or create conversation (ordered pair)
      const { data: other } = await db.from('profiles').select('id, agency_id').eq('id', body.to).single();
      if (!other || other.agency_id !== aid) return Response.json({ error: 'forbidden' }, { status: 403 });
      const lo = me < other.id ? me : other.id;
      const hi = me < other.id ? other.id : me;
      const { data: existing } = await db.from('chat_conversations').select('id').eq('agency_id', aid).eq('a_id', lo).eq('b_id', hi).maybeSingle();
      if (existing) conversationId = existing.id;
      else {
        const { data: created } = await db.from('chat_conversations').insert({ agency_id: aid, kind: 'direct', a_id: lo, b_id: hi }).select('id').single();
        conversationId = created?.id || null;
      }
    } else return Response.json({ error: 'bad convo' }, { status: 400 });

    const { data: msg } = await db.from('chat_messages').insert({
      agency_id: aid, profile_id: me, body: text, conversation_id: conversationId,
    }).select('id, profile_id, body, created_at, deleted_at, conversation_id').single();
    return Response.json({ ok: true, message: msg, convoId: conversationId });
  }

  if (body.action === 'read') {
    const scope = body.convo === 'group' ? 'group' : String(body.convo || body.convoId || '');
    if (scope) await db.from('chat_reads').upsert({ profile_id: me, scope, last_read_at: new Date().toISOString() }, { onConflict: 'profile_id,scope' });
    return Response.json({ ok: true });
  }

  if (body.action === 'delete') {
    if (ctx.role !== 'owner') return Response.json({ error: 'Only the agency owner can delete messages' }, { status: 403 });
    const { data: m } = await db.from('chat_messages').select('id, agency_id').eq('id', body.id).single();
    if (!m || m.agency_id !== aid) return Response.json({ error: 'not found' }, { status: 404 });
    await db.from('chat_messages').update({ deleted_at: new Date().toISOString(), body: '' }).eq('id', body.id);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
}
