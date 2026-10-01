import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {recordEngagement} from '@/lib/revenue/events';

const body = z.object({eveningId: z.string().uuid()});

// POST /api/ballroom/hold — the member ASKS for holds. State becomes
// "hold_requested"; only a partner adapter / staff with partner evidence can mark "held".
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;

  const {data, error} = await ctx.supabase
    .from('ballroom_evenings')
    .update({state: 'hold_requested', updated_at: new Date().toISOString()})
    .eq('id', parsed.data.eveningId)
    .eq('user_id', ctx.userId)
    .eq('state', 'proposal')
    .select('id, title, starts_at, state')
    .maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'ballroom');
  if (!data) return json({error: 'not_a_proposal', message: 'Only a proposal can ask for holds.'}, ctx.traceId, 409);

  await ctx.supabase.from('diary_items').update({state: 'held', title: `${data.title} — holds requested`, updated_at: new Date().toISOString()})
    .eq('user_id', ctx.userId).eq('source_room', 'ballroom').eq('source_id', data.id);
  await recordEngagement('ballroom.hold_requested', {traceId: ctx.traceId, roomId: 'ballroom', memberId: ctx.userId});
  return json({evening: data, message: 'The desk has your request. No partner has confirmed a hold yet.'}, ctx.traceId);
}
