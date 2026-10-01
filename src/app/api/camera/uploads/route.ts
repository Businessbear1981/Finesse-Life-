import {randomUUID} from 'crypto';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {uploadObject} from '@/lib/r2';
import {CAMERA_SELECT, withViewUrl, type CameraRow} from '@/lib/camera';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

// POST /api/camera/uploads (multipart: file, consent="true") — store a photo privately.
// Requires explicit consent; nothing is analysed until /api/camera/identify is called.
export async function POST(req: Request) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (form?.get('consent') !== 'true') return json({error: 'consent_required', message: 'Confirm you consent to storing and analysing this photo.'}, ctx.traceId, 400);
  if (!(file instanceof File)) return json({error: 'no_file'}, ctx.traceId, 400);
  if (!ALLOWED.includes(file.type)) return json({error: 'unsupported_type'}, ctx.traceId, 415);
  if (file.size > MAX_BYTES) return json({error: 'too_large'}, ctx.traceId, 413);

  const key = `camera/${ctx.userId}/${randomUUID()}.${file.type.split('/')[1].replace('jpeg', 'jpg')}`;
  try {
    await uploadObject(key, Buffer.from(await file.arrayBuffer()), file.type);
  } catch (e) {
    console.error('[camera] upload failed', e, ctx.traceId);
    return json({error: 'storage_unavailable', message: 'The darkroom is closed. Nothing was stored.'}, ctx.traceId, 503);
  }
  const {data, error} = await ctx.supabase
    .from('camera_items')
    .insert({user_id: ctx.userId, image_key: key, consent_at: new Date().toISOString(), state: 'uploaded'})
    .select(CAMERA_SELECT)
    .single();
  if (error) return dbFailure(error, ctx.traceId, 'camera');
  return json({item: await withViewUrl(data as CameraRow)}, ctx.traceId, 201);
}
