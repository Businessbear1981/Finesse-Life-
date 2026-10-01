import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {recordEngagement} from '@/lib/revenue/events';

const body = z.object({
  description: z.string().trim().min(2).max(300),
  routeTo: z.enum(['stylist', 'bag', 'exchange']).optional(),
});

// POST /api/closet/missing-piece — note a gap. Routing to Stylist/Bag/Exchange is the
// member's explicit choice and is an intent event, never revenue.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const {data, error} = await ctx.supabase
    .from('closet_missing_pieces')
    .insert({user_id: ctx.userId, description: parsed.data.description, route_to: parsed.data.routeTo ?? null})
    .select('id, description, route_to, created_at')
    .single();
  if (error) return dbFailure(error, ctx.traceId, 'closet');
  if (parsed.data.routeTo) {
    await recordEngagement(`closet.missing_piece_routed.${parsed.data.routeTo}`, {traceId: ctx.traceId, roomId: 'closet', memberId: ctx.userId});
  }
  return json({missingPiece: data}, ctx.traceId, 201);
}
