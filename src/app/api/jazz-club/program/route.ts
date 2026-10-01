import {dbFailure, json, requireMember} from '@/lib/api/room';

// GET /api/jazz-club/program — tonight and the next two weeks, as the house has scheduled it.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const from = new Date(Date.now() - 4 * 3_600_000).toISOString();
  const to = new Date(Date.now() + 14 * 86_400_000).toISOString();
  const {data, error} = await ctx.supabase
    .from('jazz_sessions')
    .select('id, title, performers, starts_at, ends_at, state, replay_until, licensing_note')
    .gte('starts_at', from).lte('starts_at', to).neq('state', 'cancelled')
    .order('starts_at');
  if (error) return dbFailure(error, ctx.traceId, 'jazz-club');
  const sessions = data ?? [];
  return json({sessions, live: sessions.find((s) => s.state === 'live') ?? null, audioProvider: process.env.LIVEKIT_URL ? 'configured' : 'not_connected'}, ctx.traceId);
}
