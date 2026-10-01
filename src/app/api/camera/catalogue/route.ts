import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {CAMERA_SELECT, identification, withViewUrl, type CameraRow} from '@/lib/camera';

const body = z.object({
  itemId: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
  category: identification.shape.category.unwrap(),
  brand: z.string().trim().max(80).nullable().optional(),
});

// POST /api/camera/catalogue — the MEMBER reviews (and may correct) the label, then files it.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase
    .from('camera_items')
    .update({state: 'catalogued', label: b.label, category: b.category, brand_guess: b.brand ?? null, updated_at: new Date().toISOString()})
    .eq('id', b.itemId)
    .eq('user_id', ctx.userId)
    .in('state', ['uploaded', 'identified', 'unidentified', 'catalogued'])
    .select(CAMERA_SELECT)
    .maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'camera');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({item: await withViewUrl(data as CameraRow)}, ctx.traceId);
}
