import {reply, sessionMember, unauthorized} from '@/app/api/billing/_member';
import {hasServiceRole} from '@/lib/keylock-server';
import {createServiceClient} from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// GET /api/moderation/blocks → {blocks: [{member_id, name, blocked_at}]} — the member's own block list.
// Blocked profiles are hidden from the member by RLS, so names for THIS list are read with the service
// role, limited to the ids the member blocked (they already knew who these were).
export async function GET() {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const {data, error} = await m.supabase.from('member_blocks').select('blocked_id, created_at')
    .eq('blocker_id', m.userId).order('created_at', {ascending: false}).limit(500);
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return reply({blocks: []});
    return reply({error: 'unavailable', message: 'Your block list couldn’t load just now.'}, 500);
  }
  const rows = (data ?? []) as Array<{blocked_id: string; created_at: string}>;
  const names = new Map<string, string>();
  if (rows.length && hasServiceRole()) {
    const {data: profiles} = await createServiceClient().from('profiles').select('id, display_name, username')
      .in('id', rows.map((r) => r.blocked_id));
    for (const p of (profiles ?? []) as Array<{id: string; display_name: string | null; username: string | null}>) {
      names.set(p.id, p.display_name?.trim() || (p.username ? `@${p.username}` : 'A member'));
    }
  }
  return reply({blocks: rows.map((r) => ({member_id: r.blocked_id, name: names.get(r.blocked_id) ?? 'A member', blocked_at: r.created_at}))});
}
