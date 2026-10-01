import {dbFailure, json, requireMember} from '@/lib/api/room';
import {recoveryRead, type GymSet} from '@/lib/gym';

// GET /api/gym/recovery — explainable recovery read from logged sets only.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const {data, error} = await ctx.supabase.from('gym_sets').select('exercise, reps, weight_kg, duration_s, rpe, performed_at').eq('user_id', ctx.userId).gte('performed_at', since);
  if (error) return dbFailure(error, ctx.traceId, 'gym');
  return json({recovery: recoveryRead((data ?? []) as GymSet[]), sources: ['manual sets'], healthSync: 'not_connected'}, ctx.traceId);
}
