import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {budget, isoDay, occasion, PLAN_COLS} from './_shared';

const create = z.object({date: isoDay, budget_cents: budget, occasion: occasion.default('Night out')});

// GET /api/per-diem?date=YYYY-MM-DD → {date, plan|null}; without a date → {plans} (the 14 most recent nights).
export async function GET(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const date = req.nextUrl.searchParams.get('date');
  if (date !== null) {
    if (!isoDay.safeParse(date).success) return json({error: 'bad_request', message: 'Use a date like 2026-10-17.'}, ctx.traceId, 400);
    const {data, error} = await ctx.supabase.from('per_diem_plans').select(PLAN_COLS).eq('member_id', ctx.userId).eq('plan_date', date).maybeSingle();
    if (error) return dbFailure(error, ctx.traceId, 'perdiem');
    return json({date, plan: data ?? null}, ctx.traceId);
  }
  const {data, error} = await ctx.supabase.from('per_diem_plans').select(PLAN_COLS).eq('member_id', ctx.userId).order('plan_date', {ascending: false}).limit(14);
  if (error) return dbFailure(error, ctx.traceId, 'perdiem');
  return json({plans: data ?? []}, ctx.traceId);
}

// POST /api/per-diem {date, budget_cents, occasion} — start (or re-budget) the night for that date.
// One night per date: an existing plan keeps its stops and gets the new budget/occasion.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, create);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase.from('per_diem_plans')
    .upsert({member_id: ctx.userId, plan_date: b.date, budget_cents: b.budget_cents, occasion: b.occasion}, {onConflict: 'member_id,plan_date'})
    .select(PLAN_COLS).single();
  if (error) return dbFailure(error, ctx.traceId, 'perdiem');
  return json({plan: data}, ctx.traceId, 201);
}
