import {dbFailure, json, requireMember} from '@/lib/api/room';

// GET /api/jazz-club/replays/:id — replay link while the licensing window is open.
export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const {data: s, error} = await ctx.supabase.from('jazz_sessions').select('id, title, replay_url, replay_until, licensing_note').eq('id', id).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'jazz-club');
  if (!s?.replay_url) return json({error: 'no_replay'}, ctx.traceId, 404);
  if (s.replay_until && new Date(s.replay_until) < new Date()) return json({error: 'replay_expired', message: 'This replay has left the house.'}, ctx.traceId, 410);
  return json({replay: s}, ctx.traceId);
}
