import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {CAMERA_ROUTES, CAMERA_SELECT, withViewUrl, type CameraRow} from '@/lib/camera';
import {recordEngagement} from '@/lib/revenue/events';

const body = z.object({to: z.enum(CAMERA_ROUTES)});

const DESTINATION_HREF: Record<(typeof CAMERA_ROUTES)[number], string> = {
  closet: '/closet', bag: '/bag', exchange: '/exchange', scale: '/scale', embassy: '/embassy',
};

// POST /api/camera/items/:id/route — send a CATALOGUED item somewhere, by the member's choice.
// "closet" hangs it privately on the rail; the others hand off with an intent event (never revenue).
export async function POST(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;

  const {data: row, error} = await ctx.supabase.from('camera_items').select(CAMERA_SELECT).eq('id', id).eq('user_id', ctx.userId).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'camera');
  if (!row) return json({error: 'not_found'}, ctx.traceId, 404);
  const item = row as CameraRow;
  if (item.state !== 'catalogued' && item.state !== 'routed') {
    return json({error: 'review_first', message: 'Review and catalogue the item before it goes anywhere.'}, ctx.traceId, 409);
  }

  // "closet" keeps the photo PRIVATE: the Closet reads routed camera items directly.
  // (Copying into wardrobe_looks would publish it — that table is feed-readable.)
  const {data: updated, error: upErr} = await ctx.supabase
    .from('camera_items')
    .update({state: 'routed', routed_to: parsed.data.to, updated_at: new Date().toISOString()})
    .eq('id', id).eq('user_id', ctx.userId)
    .select(CAMERA_SELECT).single();
  if (upErr) return dbFailure(upErr, ctx.traceId, 'camera');
  await recordEngagement(`camera.routed.${parsed.data.to}`, {traceId: ctx.traceId, roomId: 'camera', memberId: ctx.userId});
  return json({item: await withViewUrl(updated as CameraRow), href: DESTINATION_HREF[parsed.data.to]}, ctx.traceId);
}
