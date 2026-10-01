import {NextRequest} from 'next/server';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {dailyTotals, weekOf, type Meal} from '@/lib/kitchen';

// GET /api/kitchen/plan?week=YYYY-MM-DD — the week's meals, kcal ledger and the order's real state.
export async function GET(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const week = weekOf(req.nextUrl.searchParams.get('week'));
  const [{data: plan, error: pErr}, {data: order, error: oErr}] = await Promise.all([
    ctx.supabase.from('kitchen_plans').select('daily_kcal, meals, grocery_list, updated_at').eq('user_id', ctx.userId).eq('week_start', week).maybeSingle(),
    ctx.supabase.from('kitchen_orders').select('id, state, items, partner, created_at').eq('user_id', ctx.userId).eq('week_start', week).neq('state', 'cancelled').order('created_at', {ascending: false}).limit(1).maybeSingle(),
  ]);
  if (pErr) return dbFailure(pErr, ctx.traceId, 'kitchen');
  if (oErr) return dbFailure(oErr, ctx.traceId, 'kitchen');
  const meals = (plan?.meals ?? []) as Meal[];
  return json({
    weekStart: week,
    dailyKcalTarget: plan?.daily_kcal ?? null,
    meals,
    dailyTotals: dailyTotals(meals),
    groceryList: plan?.grocery_list ?? [],
    order: order ?? null,
    stage: order?.state ?? (plan ? 'plan' : 'empty'),
  }, ctx.traceId);
}
