import {dbFailure, json, requireMember} from '@/lib/api/room';
import {deleteObject} from '@/lib/r2';
import {CAMERA_SELECT, withViewUrl, type CameraRow} from '@/lib/camera';

// GET /api/camera/items/:id
export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const {data, error} = await ctx.supabase.from('camera_items').select(CAMERA_SELECT).eq('id', id).eq('user_id', ctx.userId).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'camera');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({item: await withViewUrl(data as CameraRow)}, ctx.traceId);
}

// DELETE /api/camera/items/:id — removes the row AND the stored photo.
export async function DELETE(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const {data, error} = await ctx.supabase.from('camera_items').delete().eq('id', id).eq('user_id', ctx.userId).select('image_key').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'camera');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  try { await deleteObject(data.image_key); } catch (e) { console.warn('[camera] object delete failed', ctx.traceId, e); }
  return json({deleted: id}, ctx.traceId);
}
