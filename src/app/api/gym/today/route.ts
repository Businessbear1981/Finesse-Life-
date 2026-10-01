import {dbFailure, json, requireMember} from '@/lib/api/room';
import {recoveryRead, setVolume, type GymSet} from '@/lib/gym';

// GET /api/gym/today — today's sets, volume and recovery read from the last 7 days.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const {data, error} = await ctx.supabase
    .from('gym_sets')
    .select('id, exercise, reps, weight_kg, duration_s, rpe, rest_s, performed_at, source')
    .eq('user_id', ctx.userId).gte('performed_at', since).order('performed_at', {ascending: false}).limit(200);
  if (error) return dbFailure(error, ctx.traceId, 'gym');
  const sets = (data ?? []) as (GymSet & {id: string})[];
  const today = new Date().toISOString().slice(0, 10);
  const todays = sets.filter((s) => s.performed_at.slice(0, 10) === today);
  return json({
    today: todays,
    volumeKg: Math.round(todays.reduce((t, s) => t + setVolume(s), 0)),
    weekSessions: new Set(sets.map((s) => s.performed_at.slice(0, 10))).size,
    recovery: recoveryRead(sets),
    healthSync: 'not_connected',
  }, ctx.traceId);
}
