import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {groceryItem, mealSchema, weekOf} from '@/lib/kitchen';

const body = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyKcal: z.number().int().min(800).max(6000).nullable().optional(),
  meals: z.array(mealSchema).max(28),
  groceryList: z.array(groceryItem).max(80).default([]),
});

// POST /api/kitchen/compose — save the week's plan. A plan is not a cart and not an order.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase.from('kitchen_plans').upsert({
    user_id: ctx.userId, week_start: weekOf(b.weekStart), daily_kcal: b.dailyKcal ?? null,
    meals: b.meals, grocery_list: b.groceryList, updated_at: new Date().toISOString(),
  }).select('week_start, daily_kcal, meals, grocery_list').single();
  if (error) return dbFailure(error, ctx.traceId, 'kitchen');
  return json({plan: data}, ctx.traceId);
}
