import {dbFailure, json, requireMember} from '@/lib/api/room';

// GET /api/scale/pledges — my pledges and their honest states.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {data, error} = await ctx.supabase
    .from('scale_joins')
    .select('id, deal_id, state, joined_at, state_changed_at, deal:scale_deals(title, brand, group_price_cents, goal_count, current_count, deadline, status)')
    .eq('user_id', ctx.userId)
    .order('joined_at', {ascending: false});
  if (error) return dbFailure(error, ctx.traceId, 'scale');
  return json({pledges: data ?? []}, ctx.traceId);
}
