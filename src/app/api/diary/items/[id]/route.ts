import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';

const patch = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  startsAt: z.string().datetime().optional(),
  notes: z.string().max(2000).nullable().optional(),
  state: z.enum(['done', 'cancelled']).optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to change');

// PATCH /api/diary/items/:id — move (new time ⇒ state "moved"), retitle, mark done or cancel.
export async function PATCH(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const parsed = await parseBody(req, patch);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const update: Record<string, unknown> = {updated_at: new Date().toISOString()};
  if (b.title) update.title = b.title;
  if (b.notes !== undefined) update.notes = b.notes;
  if (b.startsAt) { update.starts_at = b.startsAt; update.state = 'moved'; }
  if (b.state) update.state = b.state;
  const {data, error} = await ctx.supabase.from('diary_items').update(update).eq('id', id).eq('user_id', ctx.userId).select('id, title, starts_at, state').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'diary');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({item: data}, ctx.traceId);
}
