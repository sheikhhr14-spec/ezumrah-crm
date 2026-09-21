import { createAdminClient } from '@/lib/supabase/admin';

export type PlatformSettings = {
  smtp_host?: string; smtp_port?: number; smtp_secure?: boolean;
  smtp_user?: string; smtp_password?: string;
  smtp_from_name?: string; smtp_from_email?: string;
};
const BUCKET = 'platform-settings';

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const db = createAdminClient();
  try {
    const { data, error } = await db.storage.from(BUCKET).download('settings.json');
    if (error || !data) return {};
    return JSON.parse((await data.text()) || '{}');
  } catch {
    return {};
  }
}

export async function savePlatformSettings(patch: PlatformSettings) {
  const db = createAdminClient();
  try { await db.storage.createBucket(BUCKET, { public: false }); } catch {}
  const merged = { ...(await getPlatformSettings()), ...patch };
  const body = new Blob([JSON.stringify(merged)], { type: 'application/json' });
  const { error } = await db.storage.from(BUCKET).upload('settings.json', body, { upsert: true, contentType: 'application/json' });
  if (error) throw new Error('Could not save settings: ' + error.message);
}
