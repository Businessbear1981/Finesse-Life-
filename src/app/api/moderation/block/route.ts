import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {reply, sessionMember, unauthorized} from '@/app/api/billing/_member';
import {REPORT_KINDS} from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const uuid = z.string().uuid();
// Block by member id, or by an item they own (a Game Room table never reveals its host's id).
const block = z.union([
  z.object({member_id: uuid}),
  z.object({target_kind: z.enum(REPORT_KINDS).exclude(['nova_reply']), target_id: uuid}),
]);

const BLOCKED_MESSAGE = 'Blocked. You won’t see each other’s posts, listings, tables or profile. You can unblock from Account.';
const notOpen = () => reply({error: 'room_not_open', message: 'Blocking opens once the house finishes switching on member safety. Nothing was changed.'}, 503);

// POST /api/moderation/block {member_id} | {target_kind, target_id} → {blocked: true, message}
export async function POST(req: Request) {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const parsed = await parseBody(req, block);
  if (parsed.error) return parsed.error;
  const b = parsed.data;

  if ('member_id' in b) {
    if (b.member_id === m.userId) return reply({error: 'self', message: 'You can’t block yourself.'}, 400);
    const {error} = await m.supabase.from('member_blocks').insert({blocker_id: m.userId, blocked_id: b.member_id});
    if (error && error.code !== '23505') {
      if (error.code === '23503') return reply({error: 'not_found', message: 'That member is no longer here.'}, 404);
      if (error.code === '42P01' || error.code === 'PGRST205') return notOpen();
      console.error('[moderation/block] insert failed', error.code);
      return reply({error: 'unavailable', message: 'Something went wrong on the house side. Nothing was changed.'}, 500);
    }
    return reply({blocked: true, message: BLOCKED_MESSAGE});
  }

  const {data, error} = await m.supabase.rpc('block_content_owner', {kind: b.target_kind, target: b.target_id});
  if (error) {
    if (error.code === '42883' || error.code === 'PGRST202') return notOpen();
    console.error('[moderation/block] rpc failed', error.code);
    return reply({error: 'unavailable', message: 'Something went wrong on the house side. Nothing was changed.'}, 500);
  }
  if (data !== true) return reply({error: 'not_found', message: 'There’s no member to block there.'}, 404);
  return reply({blocked: true, message: BLOCKED_MESSAGE});
}

// DELETE /api/moderation/block?member_id=… (or JSON {member_id}) → {unblocked: true}
export async function DELETE(req: Request) {
  const m = await sessionMember();
  if (!m) return unauthorized();
  let id = new URL(req.url).searchParams.get('member_id');
  if (!id) {
    const body = (await req.json().catch(() => null)) as {member_id?: unknown} | null;
    id = typeof body?.member_id === 'string' ? body.member_id : null;
  }
  if (!id || !uuid.safeParse(id).success) return reply({error: 'bad_request', message: 'Which member?'}, 400);
  const {error} = await m.supabase.from('member_blocks').delete().eq('blocker_id', m.userId).eq('blocked_id', id);
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return notOpen();
    return reply({error: 'unavailable', message: 'Something went wrong on the house side. Nothing was changed.'}, 500);
  }
  return reply({unblocked: true});
}
