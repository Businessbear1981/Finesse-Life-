import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';

const createItem = z.object({
  title: z.string().trim().min(1).max(200),
  startsAt: z.string().datetime(),
  sourceRoom: z.string().trim().min(1).max(40).default('diary'),
  sourceId: z.string().uuid().optional(),
  state: z.enum(['needs_member_action', 'done']).default('needs_member_action'),
  notes: z.string().max(2000).optional(),
});

// POST /api/diary/items — add a page entry.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, createItem);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase
    .from('diary_items')
    .insert({user_id: ctx.userId, title: b.title, starts_at: b.startsAt, source_room: b.sourceRoom, source_id: b.sourceId ?? null, state: b.state, notes: b.notes ?? null})
    .select('id, title, starts_at, source_room, state')
    .single();
  if (error) return dbFailure(error, ctx.traceId, 'diary');
  return json({item: data}, ctx.traceId, 201);
}
