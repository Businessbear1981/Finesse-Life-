import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {sessionPatch} from '@/lib/gym-week';

const id = z.string().uuid();

// PATCH /api/gym/sessions/:id {done?, day?, atTime?} — tick it off or move it.
export async function PATCH(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const sid = (await params).id;
  if (!id.safeParse(sid).success) return json({error: 'not_found'}, ctx.traceId, 404);
  const parsed = await parseBody(req, sessionPatch);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const update: Record<string, unknown> = {updated_at: new Date().toISOString()};
  if (b.done !== undefined) update.done = b.done;
  if (b.day) update.day = b.day;
  if (b.atTime !== undefined) update.at_time = b.atTime;
  const {data, error} = await ctx.supabase.from('gym_sessions').update(update).eq('id', sid).eq('user_id', ctx.userId).select('id, day, at_time, done').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'gym');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({session: data}, ctx.traceId);
}

// DELETE /api/gym/sessions/:id
export async function DELETE(_req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const sid = (await params).id;
  if (!id.safeParse(sid).success) return json({error: 'not_found'}, ctx.traceId, 404);
  const {data, error} = await ctx.supabase.from('gym_sessions').delete().eq('id', sid).eq('user_id', ctx.userId).select('id');
  if (error) return dbFailure(error, ctx.traceId, 'gym');
  if (!data?.length) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({deleted: sid}, ctx.traceId);
}
