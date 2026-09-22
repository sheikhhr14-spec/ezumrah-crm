import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveAgency } from '@/lib/data';

export type ActivityEntry = { t: string; actor_id?: string; actor_name: string; action: string; detail?: string };
const BUCKET = 'activity-logs';

export async function actor() {
  try {
    const ctx = await requireActiveAgency();
    return { id: ctx.profile.id, name: ctx.profile.full_name || ctx.profile.email || 'Staff' };
  } catch {
    return { id: '', name: 'System' };
  }
}

export async function logActivity(aid: string, table: string, recordId: string, action: string, detail?: string, who?: { id?: string; name?: string } | null) {
  try {
    const db = createAdminClient();
    try { await db.storage.createBucket(BUCKET, { public: false }); } catch {}
    const path = `${aid}/${table}/${recordId}.json`;
    let list: ActivityEntry[] = [];
    try {
      const { data } = await db.storage.from(BUCKET).download(path);
      if (data) list = JSON.parse((await data.text()) || '[]');
    } catch {}
    list.push({ t: new Date().toISOString(), actor_id: who?.id, actor_name: who?.name || 'System', action, detail: detail || '' });
    if (list.length > 300) list = list.slice(-300);
    const body = new Blob([JSON.stringify(list)], { type: 'application/json' });
    await db.storage.from(BUCKET).upload(path, body, { upsert: true, contentType: 'application/json' });
  } catch {} // never break the main action
}

export async function getActivity(aid: string, table: string, recordId: string): Promise<ActivityEntry[]> {
  try {
    const db = createAdminClient();
    const { data } = await db.storage.from(BUCKET).download(`${aid}/${table}/${recordId}.json`);
    if (!data) return [];
    return JSON.parse((await data.text()) || '[]');
  } catch {
    return [];
  }
}
