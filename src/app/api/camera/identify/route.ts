import {NextResponse} from 'next/server';
import {memberRoute, must, HttpError} from '@/lib/room-api';
import {rateLimit} from '@/lib/api-guard';
import {identifyImage} from '@/lib/vision';

// POST multipart {scan_id, file} → model output with confidence and evidence. Never guesses silently:
// confidence < 0.6 is returned as "unsure" and must be confirmed by the member before cataloguing.
export const POST = memberRoute(async (req, {db, user}) => {
  const limited = rateLimit(`camera:${user.id}`, 20, 60_000);
  if (limited) return limited;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file'); const scanId = form?.get('scan_id');
  if (!(file instanceof File) || typeof scanId !== 'string') throw new HttpError(400, 'scan_id and file required');
  must(await db.from('camera_scans').select('id').eq('id', scanId).single(), true);
  try {
    const r = await identifyImage(file);
    const status = 'identified';
    await db.from('camera_scans').update({result: r, confidence: r.confidence, status, updated_at: new Date().toISOString()}).eq('id', scanId);
    return {scan_id: scanId, status, unsure: r.confidence < 0.6, result: r};
  } catch (e) {
    await db.from('camera_scans').update({status: 'failed', updated_at: new Date().toISOString()}).eq('id', scanId);
    return NextResponse.json({error: e instanceof Error ? e.message : 'identification unavailable'}, {status: 502});
  }
});
