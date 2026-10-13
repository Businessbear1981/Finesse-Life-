import {z} from 'zod';
import {dbFailure, json, requireMember} from '@/lib/api/room';

// POST /api/salon/bookings/:id/cancel — withdraw the member's own *pending* request (RLS allows nothing else).
// → 200 {booking} | 404 not_found | 409 not_cancellable (already confirmed by the salon, done or cancelled).
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!z.string().uuid().safeParse(id).success) return json({error: 'not_found'}, ctx.traceId, 404);
  const {data, error} = await ctx.supabase.from('salon_bookings').update({status: 'cancelled'})
    .eq('id', id).eq('user_id', ctx.userId).eq('status', 'pending').select('id, status').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'salon');
  if (data) return json({booking: data}, ctx.traceId);
  const {data: row} = await ctx.supabase.from('salon_bookings').select('status').eq('id', id).eq('user_id', ctx.userId).maybeSingle();
  if (!row) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({error: 'not_cancellable', status: row.status, message: row.status === 'confirmed' ? 'The salon has confirmed this one — ask the salon to change it.' : 'This request is already closed.'}, ctx.traceId, 409);
}
