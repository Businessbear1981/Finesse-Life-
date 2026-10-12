import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {ownNovaPlan} from '@/lib/own-nova-plan';
import {isUuid, TRIP_COLS} from '../../_shared';

const when = z.string().datetime({offset: true}).nullable().optional();
const patch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  origin: z.string().trim().max(120).nullable().optional(),
  destination: z.string().trim().min(1).max(120).optional(),
  depart_at: when,
  return_at: when,
  party_size: z.number().int().min(1).max(40).optional(),
  brief: z.string().trim().max(600).nullable().optional(),
  // 'planned' is reached only by attaching Nova's plan; members can move back to draft or cancel.
  status: z.enum(['draft', 'cancelled']).optional(),
  nova_request_id: z.string().uuid().optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to change');

type Ctx = {params: Promise<{id: string}>};

// PATCH /api/departures/trips/:id — edit, cancel, or attach Nova's plan ({nova_request_id}: the server reads
// the member's own finished plan request and stores its text on the trip; status → planned).
export async function PATCH(req: NextRequest, {params}: Ctx) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const parsed = await parseBody(req, patch);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const update: Record<string, unknown> = {};
  for (const k of ['title', 'destination', 'party_size', 'status'] as const) if (b[k] !== undefined) update[k] = b[k];
  for (const k of ['origin', 'brief', 'depart_at', 'return_at'] as const) if (b[k] !== undefined) update[k] = b[k] || null;
  if (b.nova_request_id) {
    const plan = await ownNovaPlan(ctx, b.nova_request_id);
    if (!plan.ok) return json({error: plan.error}, ctx.traceId, plan.status);
    Object.assign(update, {plan: plan.plan, nova_request_id: b.nova_request_id, status: 'planned'});
  }
  const {data, error} = await ctx.supabase.from('trips').update(update).eq('id', id).eq('member_id', ctx.userId).select(TRIP_COLS).maybeSingle();
  if (error) {
    if (error.code === '23514') return json({error: 'bad_request', message: 'Those dates don’t work — the return must be after departure. Nothing was changed.'}, ctx.traceId, 400);
    return dbFailure(error, ctx.traceId, 'departures');
  }
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({trip: data}, ctx.traceId);
}

// DELETE /api/departures/trips/:id
export async function DELETE(_req: NextRequest, {params}: Ctx) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {data, error} = await ctx.supabase.from('trips').delete().eq('id', id).eq('member_id', ctx.userId).select('id').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'departures');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({deleted: id}, ctx.traceId);
}
