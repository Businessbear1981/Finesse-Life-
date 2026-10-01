import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {recordEngagement} from '@/lib/revenue/events';

const body = z.object({eveningId: z.string().uuid()});

// POST /api/ballroom/confirm — member approves an evening the PARTNER has already held.
// Refuses anything that is not "held" with partner evidence. Revenue is booked later,
// only from the partner's confirmation callback.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;

  const {data: ev, error} = await ctx.supabase
    .from('ballroom_evenings')
    .select('id, state, partner_ref, title')
    .eq('id', parsed.data.eveningId)
    .eq('user_id', ctx.userId)
    .maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'ballroom');
  if (!ev) return json({error: 'not_found'}, ctx.traceId, 404);
  if (ev.state !== 'held' || !ev.partner_ref) {
    return json({
      error: 'partner_confirmation_required',
      state: ev.state,
      message: 'Nothing can be confirmed until a partner has held it. You will see it in the Diary when they do.',
    }, ctx.traceId, 409);
  }

  // Member UPDATE policy cannot set "confirmed" — use the service role for this one transition.
  const {createServiceClient} = await import('@/lib/supabase/service');
  const {data: done, error: upErr} = await createServiceClient()
    .from('ballroom_evenings')
    .update({state: 'confirmed', updated_at: new Date().toISOString()})
    .eq('id', ev.id).eq('user_id', ctx.userId).eq('state', 'held')
    .select('id, title, starts_at, state')
    .maybeSingle();
  if (upErr) return dbFailure(upErr, ctx.traceId, 'ballroom');
  await ctx.supabase.from('diary_items').update({state: 'approved', updated_at: new Date().toISOString()})
    .eq('user_id', ctx.userId).eq('source_room', 'ballroom').eq('source_id', ev.id);
  await recordEngagement('ballroom.member_confirmed', {traceId: ctx.traceId, roomId: 'ballroom', memberId: ctx.userId});
  return json({evening: done}, ctx.traceId);
}
