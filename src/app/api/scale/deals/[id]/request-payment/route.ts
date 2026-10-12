import {isAdmin} from '@/lib/admin';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {createServiceClient} from '@/lib/supabase/service';

// POST /api/scale/deals/:id/request-payment — staff only.
// Once a deal's goal is met AND the partner has confirmed the group price, staff opens
// payment: every goal_met pledge on the deal moves to payment_requested, which is the only
// state members can pay from (POST /api/scale/pledges/:id/pay → Stripe Checkout).
// A pledge is never charged automatically; members pay through Checkout themselves.
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  if (!(await isAdmin(ctx.supabase, {id: ctx.userId, email: undefined}))) {
    return json({error: 'forbidden'}, ctx.traceId, 403);
  }
  const {id} = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({error: 'not_found'}, ctx.traceId, 404);

  const service = createServiceClient();
  const {data: deal, error: dealError} = await service
    .from('scale_deals')
    .select('id, status, group_price_cents')
    .eq('id', id)
    .maybeSingle();
  if (dealError) return dbFailure(dealError, ctx.traceId, 'scale');
  if (!deal) return json({error: 'not_found'}, ctx.traceId, 404);
  if (deal.status !== 'met') {
    return json({error: 'goal_not_met', status: deal.status}, ctx.traceId, 409);
  }

  // Service-role update: the 20261009 guard allows goal_met → payment_requested and records it.
  const {data: moved, error} = await service
    .from('scale_joins')
    .update({state: 'payment_requested'})
    .eq('deal_id', id)
    .eq('state', 'goal_met')
    .select('id');
  if (error) return dbFailure(error, ctx.traceId, 'scale');

  return json({requested: moved?.length ?? 0, groupPriceCents: deal.group_price_cents}, ctx.traceId);
}
