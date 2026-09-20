import { requireModule } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import ChatRoom from '@/components/chat-room';

export default async function TeamChatPage() {
  const ctx = await requireModule('chat');
  const db = createAdminClient();
  const aid = ctx.profile.agency_id!;
  const [{ data: msgs }, { data: team }] = await Promise.all([
    db.from('chat_messages').select('id, profile_id, body, created_at').eq('agency_id', aid).order('created_at', { ascending: true }).limit(300),
    db.from('profiles').select('id, full_name, role').eq('agency_id', aid).order('full_name'),
  ]);
  return (
    <ChatRoom
      me={ctx.profile.id}
      meName={ctx.profile.full_name || 'Team member'}
      messages={(msgs || []) as any[]}
      team={(team || []) as any[]}
    />
  );
}
