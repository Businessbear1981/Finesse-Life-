import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {groceryPartners, weekOf} from '@/lib/kitchen';
import {recordEngagement} from '@/lib/revenue/events';

const body = z.object({weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), cancel: z.boolean().optional()});

// POST /api/kitchen/order-intent — turn the grocery list into ONE order intent.
// Intent ≠ authorized order: nothing is placed or charged until a grocery partner
// returns an authorization (service role sets partner_ref → authorized).
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const week = weekOf(parsed.data.weekStart);

  if (parsed.data.cancel) {
    const {data, error} = await ctx.supabase.from('kitchen_orders').update({state: 'cancelled', updated_at: new Date().toISOString()})
      .eq('user_id', ctx.userId).eq('week_start', week).eq('state', 'intent').select('id, state');
    if (error) return dbFailure(error, ctx.traceId, 'kitchen');
    return json({cancelled: (data ?? []).length}, ctx.traceId);
  }

  const {data: plan, error: pErr} = await ctx.supabase.from('kitchen_plans').select('grocery_list').eq('user_id', ctx.userId).eq('week_start', week).maybeSingle();
  if (pErr) return dbFailure(pErr, ctx.traceId, 'kitchen');
  const items = (plan?.grocery_list ?? []) as unknown[];
  if (items.length === 0) return json({error: 'empty_list', message: 'Add groceries to the plan first.'}, ctx.traceId, 422);

  const {data: existing} = await ctx.supabase.from('kitchen_orders').select('id, state').eq('user_id', ctx.userId).eq('week_start', week).neq('state', 'cancelled').maybeSingle();
  if (existing) return json({error: 'already_open', order: existing, message: 'This week already has an order in progress.'}, ctx.traceId, 409);

  const {data, error} = await ctx.supabase.from('kitchen_orders').insert({user_id: ctx.userId, week_start: week, items, state: 'intent'}).select('id, state, items, created_at').single();
  if (error) return dbFailure(error, ctx.traceId, 'kitchen');
  await recordEngagement('kitchen.order_intent', {traceId: ctx.traceId, roomId: 'kitchen', memberId: ctx.userId, key: `kitchen.order_intent:${data.id}`});
  const partners = groceryPartners();
  return json({
    order: data,
    message: partners.length
      ? 'Order intent recorded. Your grocery partner will ask you to authorise before anything is charged.'
      : 'Order intent recorded. No grocery partner is connected yet, so nothing has been ordered or charged.',
  }, ctx.traceId, 201);
}
