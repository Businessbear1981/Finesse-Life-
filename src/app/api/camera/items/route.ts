import {dbFailure, json, requireMember} from '@/lib/api/room';
import {CAMERA_SELECT, withViewUrl, type CameraRow} from '@/lib/camera';

// GET /api/camera/items — the member's intake, newest first.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {data, error} = await ctx.supabase.from('camera_items').select(CAMERA_SELECT).eq('user_id', ctx.userId).order('created_at', {ascending: false}).limit(24);
  if (error) return dbFailure(error, ctx.traceId, 'camera');
  return json({items: await Promise.all(((data ?? []) as CameraRow[]).map(withViewUrl))}, ctx.traceId);
}
