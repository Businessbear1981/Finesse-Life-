import {NextResponse} from 'next/server';
import {roomById} from '@/lib/rooms/registry';
import {newTraceId} from '@/lib/keylock-server';

// GET /api/rooms/:id — registry truth for a plate. Plates render from this, so a
// room can never claim "live" unless the registry (reviewed in PRs) says so.
export async function GET(_req: Request, ctx: {params: Promise<{id: string}>}) {
  const {id} = await ctx.params;
  const room = roomById(id);
  const traceId = newTraceId();
  if (!room) return NextResponse.json({error: 'Unknown room', traceId}, {status: 404});
  return NextResponse.json(
    {
      roomId: room.id,
      number: room.number,
      truthState: room.truthState,
      access: room.access,
      api: room.api,
      revenue: room.revenue,
      traceId,
    },
    {headers: {'Cache-Control': 'public, max-age=60'}},
  );
}
