import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';

const body = z.object({
  exercise: z.string().trim().min(1).max(80),
  reps: z.number().int().min(0).max(500).nullable().optional(),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
  durationS: z.number().int().min(0).max(86400).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  restS: z.number().int().min(0).max(3600).nullable().optional(),
}).refine((b) => b.reps != null || b.durationS != null, 'Log reps or a duration');

// POST /api/gym/sets — log the set.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase.from('gym_sets').insert({
    user_id: ctx.userId, exercise: b.exercise, reps: b.reps ?? null, weight_kg: b.weightKg ?? null,
    duration_s: b.durationS ?? null, rpe: b.rpe ?? null, rest_s: b.restS ?? null,
  }).select('id, exercise, reps, weight_kg, duration_s, rpe, rest_s, performed_at').single();
  if (error) return dbFailure(error, ctx.traceId, 'gym');
  return json({set: data}, ctx.traceId, 201);
}

// DELETE /api/gym/sets?id=… — health data is the member's to remove.
export async function DELETE(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!z.string().uuid().safeParse(id).success) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {error} = await ctx.supabase.from('gym_sets').delete().eq('id', id).eq('user_id', ctx.userId);
  if (error) return dbFailure(error, ctx.traceId, 'gym');
  return json({deleted: id}, ctx.traceId);
}
