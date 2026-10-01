import {dbFailure, json, requireMember} from '@/lib/api/room';

// POST /api/diary/items/:id/hold — member decision on an entry that needs them.
// This records the member's choice only; partner-side confirmation stays with the source room.
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const {data, error} = await ctx.supabase
    .from('diary_items')
    .update({state: 'held', updated_at: new Date().toISOString()})
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .in('state', ['needs_member_action', 'held', 'moved'])
    .select('id, title, starts_at, state, source_room, source_id')
    .maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'diary');
  if (!data) return json({error: 'not_actionable', message: 'This entry no longer needs a decision.'}, ctx.traceId, 409);
  return json({item: data}, ctx.traceId);
}
