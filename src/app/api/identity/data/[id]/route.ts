import {NextRequest} from 'next/server';
import {z} from 'zod';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {DELETABLE, type DeletableKind} from '@/lib/identity';

const q = z.object({kind: z.enum(Object.keys(DELETABLE) as [DeletableKind, ...DeletableKind[]])});

// DELETE /api/identity/data/:id?kind=camera_item|diary_item|ballroom_evening|missing_piece|wardrobe_look
export async function DELETE(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const parsed = q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return json({error: 'bad_request'}, ctx.traceId, 400);
  const table = DELETABLE[parsed.data.kind];
  const {data, error} = await ctx.supabase.from(table).delete().eq('id', id).eq('user_id', ctx.userId).select('id');
  if (error) return dbFailure(error, ctx.traceId, 'this-is-you');
  if (!data?.length) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({deleted: {kind: parsed.data.kind, id}}, ctx.traceId);
}
