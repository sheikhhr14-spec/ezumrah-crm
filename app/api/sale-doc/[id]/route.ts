import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Streams a sale document securely: only the owning tenant can view/download.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const db = createAdminClient();
  const { data: doc } = await db.from('sale_documents').select('*').eq('id', params.id).single();
  if (!doc) return new Response('Not found', { status: 404 });
  const { data: profile } = await db.from('profiles').select('agency_id').eq('id', user.id).single();
  if (!profile || profile.agency_id !== doc.agency_id) return new Response('Forbidden', { status: 403 });
  const { data: blob, error } = await db.storage.from('sale-documents').download(doc.storage_path);
  if (error || !blob) return new Response('Not found', { status: 404 });
  const download = new URL(req.url).searchParams.get('download');
  return new Response(blob, {
    headers: {
      'Content-Type': doc.mime || 'application/octet-stream',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${(doc.file_name || 'document').replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
