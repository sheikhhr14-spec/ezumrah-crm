import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://ezumrah-crm.vercel.app';
  const routes: MetadataRoute.Sitemap = ['', '/packages', '/login', '/signup'].map((r) => ({
    url: `${base}${r}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: r === '' ? 1 : r === '/packages' ? 0.9 : 0.3,
  }));
  try {
    const db = createAdminClient();
    const { data } = await db.from('packages').select('id, updated_at').eq('is_public', true).eq('is_active', true).limit(500);
    for (const p of (data || [])) routes.push({ url: `${base}/packages/${p.id}`, lastModified: new Date((p as any).updated_at || new Date()), changeFrequency: 'weekly' as const, priority: 0.8 });
  } catch { /* static routes only */ }
  return routes;
}
