import {NextRequest} from 'next/server';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {gymWeekOf, sessionInput, weekDays} from '@/lib/gym-week';

const COLS = 'id, day, at_time, kind, title, venue, notes, done';

// GET /api/gym/sessions?week=YYYY-MM-DD — the member's planned week (gym_sessions) plus the days they actually
// logged sets on (gym_sets). Planned sessions are the member's own notes; nothing is booked with a studio.
export async function GET(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const weekStart = gymWeekOf(req.nextUrl.searchParams.get('week'));
  const days = weekDays(weekStart);
  const end = new Date(new Date(`${days[6]}T00:00:00Z`).getTime() + 86_400_000).toISOString();
  const [plan, sets] = await Promise.all([
    ctx.supabase.from('gym_sessions').select(COLS).eq('user_id', ctx.userId).gte('day', days[0]).lte('day', days[6]).order('day').order('at_time'),
    ctx.supabase.from('gym_sets').select('performed_at').eq('user_id', ctx.userId).gte('performed_at', `${days[0]}T00:00:00Z`).lt('performed_at', end),
  ]);
  if (plan.error) return dbFailure(plan.error, ctx.traceId, 'gym');
  if (sets.error) return dbFailure(sets.error, ctx.traceId, 'gym');
  const trained = [...new Set((sets.data ?? []).map((s: {performed_at: string}) => s.performed_at.slice(0, 10)))].sort();
  return json({weekStart, days, sessions: plan.data ?? [], trainedDays: trained}, ctx.traceId);
}

// POST /api/gym/sessions {day, atTime?, kind, title, venue?, notes?} → 201 {session}
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, sessionInput);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase.from('gym_sessions').insert({
    user_id: ctx.userId, day: b.day, at_time: b.atTime ?? null, kind: b.kind, title: b.title, venue: b.venue || null, notes: b.notes || null,
  }).select(COLS).single();
  if (error) return dbFailure(error, ctx.traceId, 'gym');
  return json({session: data}, ctx.traceId, 201);
}
