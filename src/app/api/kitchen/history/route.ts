import {NextRequest} from 'next/server';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {groceryPartners, weekOf, type Meal} from '@/lib/kitchen';
import {dishBook, previousPlan} from '@/lib/kitchen-book';

// GET /api/kitchen/history?week=YYYY-MM-DD — everything the Kitchen shows beyond this week's plan, derived from
// the member's own rows: recent order intents/orders (kitchen_orders), the recipe book (plates they've planned
// across kitchen_plans) and last week's plan to start from. Plus which grocery partners are connected.
export async function GET(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const week = weekOf(req.nextUrl.searchParams.get('week'));
  const [plans, orders] = await Promise.all([
    ctx.supabase.from('kitchen_plans').select('week_start, meals, grocery_list, daily_kcal').eq('user_id', ctx.userId).order('week_start', {ascending: false}).limit(12),
    ctx.supabase.from('kitchen_orders').select('id, week_start, state, items, partner, created_at, updated_at').eq('user_id', ctx.userId).order('created_at', {ascending: false}).limit(12),
  ]);
  if (plans.error) return dbFailure(plans.error, ctx.traceId, 'kitchen');
  if (orders.error) return dbFailure(orders.error, ctx.traceId, 'kitchen');
  const rows = (plans.data ?? []) as {week_start: string; meals: Meal[] | null; grocery_list: unknown[] | null; daily_kcal: number | null}[];
  const last = previousPlan(rows, week);
  const partners = groceryPartners();
  return json({
    weekStart: week,
    orders: ((orders.data ?? []) as {items: unknown}[]).map((o) => ({...o, itemCount: Array.isArray(o.items) ? o.items.length : 0})),
    book: dishBook(rows),
    lastPlan: last ? {weekStart: last.week_start, meals: last.meals ?? [], groceryList: last.grocery_list ?? [], dailyKcal: last.daily_kcal} : null,
    partners,
    disclosure: partners.length ? 'Finesse may earn a referral commission from these partners.' : 'No grocery partner is connected yet.',
  }, ctx.traceId);
}
