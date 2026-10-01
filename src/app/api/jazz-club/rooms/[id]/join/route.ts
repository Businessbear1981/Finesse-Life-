import {dbFailure, json, requireMember} from '@/lib/api/room';
import {recordEngagement} from '@/lib/revenue/events';

// POST /api/jazz-club/rooms/:id/join — only a genuinely live room with a connected audio
// provider can be joined. Until LiveKit (or similar) is wired, this says so plainly.
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const {data: s, error} = await ctx.supabase.from('jazz_sessions').select('id, title, state, stream_room').eq('id', id).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'jazz-club');
  if (!s) return json({error: 'not_found'}, ctx.traceId, 404);
  if (s.state !== 'live') return json({error: 'not_live', state: s.state, message: 'The lamp is not lit yet.'}, ctx.traceId, 409);
  if (!s.stream_room || !process.env.LIVEKIT_URL) {
    return json({error: 'audio_provider_not_connected', message: 'The set is on, but the house sound system is not connected to the app yet.'}, ctx.traceId, 503);
  }
  await recordEngagement('jazz_club.joined', {traceId: ctx.traceId, roomId: 'jazz-club', memberId: ctx.userId, key: `jazz_club.joined:${ctx.userId}:${s.id}`});
  // Token minting belongs in a LiveKit adapter (server-side) — intentionally not faked here.
  return json({error: 'adapter_pending', message: 'Audio adapter pending.'}, ctx.traceId, 501);
}
