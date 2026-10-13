import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {ownNovaPlan} from '@/lib/own-nova-plan';
import {MAX_ITEMS, parsePlanItems, type PerDiemItem} from '@/lib/per-diem';
import {budget, isUuid, item, occasion, PLAN_COLS} from '../_shared';

const patch = z.object({
  budget_cents: budget.optional(),
  occasion: occasion.optional(),
  items: z.array(item).max(MAX_ITEMS).optional(),
  // Tick one stop done / undone without resending the whole list.
  toggle: z.object({index: z.number().int().min(0).max(MAX_ITEMS - 1), done: z.boolean()}).optional(),
  status: z.enum(['draft', 'done', 'cancelled']).optional(),
  nova_request_id: z.string().uuid().optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to change');

// PATCH /api/per-diem/:id — re-budget, edit or tick stops, close the night, or attach Nova's evening plan
// ({nova_request_id}: the server reads the member's own finished plan, keeps the text and parses the stops).
export async function PATCH(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const parsed = await parseBody(req, patch);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const update: Record<string, unknown> = {};
  if (b.budget_cents !== undefined) update.budget_cents = b.budget_cents;
  if (b.occasion !== undefined) update.occasion = b.occasion;
  if (b.status !== undefined) update.status = b.status;
  if (b.items !== undefined) update.items = b.items;

  if (b.nova_request_id) {
    const plan = await ownNovaPlan(ctx, b.nova_request_id);
    if (!plan.ok) return json({error: plan.error}, ctx.traceId, plan.status);
    Object.assign(update, {plan_text: plan.plan, items: parsePlanItems(plan.plan), nova_request_id: b.nova_request_id, status: 'planned'});
  }

  if (b.toggle) {
    const cur = await ctx.supabase.from('per_diem_plans').select('items').eq('id', id).eq('member_id', ctx.userId).maybeSingle();
    if (cur.error) return dbFailure(cur.error, ctx.traceId, 'perdiem');
    if (!cur.data) return json({error: 'not_found'}, ctx.traceId, 404);
    const items = ((update.items as PerDiemItem[] | undefined) ?? (cur.data.items as PerDiemItem[]) ?? []).slice();
    if (!items[b.toggle.index]) return json({error: 'bad_request', message: 'That stop is no longer on the plan.'}, ctx.traceId, 400);
    items[b.toggle.index] = {...items[b.toggle.index], done: b.toggle.done};
    update.items = items;
  }

  const {data, error} = await ctx.supabase.from('per_diem_plans').update(update).eq('id', id).eq('member_id', ctx.userId).select(PLAN_COLS).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'perdiem');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({plan: data}, ctx.traceId);
}
