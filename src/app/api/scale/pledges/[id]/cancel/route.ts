import {dbFailure, json, requireMember} from '@/lib/api/room';

// POST /api/scale/pledges/:id/cancel — leave a group before any payment is requested.
// RLS + the transition trigger refuse anything later than goal_met.
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const {data, error} = await ctx.supabase
    .from('scale_joins')
    .update({state: 'cancelled'})
    .eq('id', id).eq('user_id', ctx.userId).in('state', ['pledged', 'waitlisted', 'goal_met'])
    .select('id, state').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'scale');
  if (!data) return json({error: 'not_cancellable', message: 'This pledge can no longer be withdrawn here — ask Nova.'}, ctx.traceId, 409);
  return json({pledge: data}, ctx.traceId);
}
