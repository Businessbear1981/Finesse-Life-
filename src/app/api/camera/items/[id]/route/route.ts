import {z} from 'zod';
import {body, memberRoute, must, HttpError} from '@/lib/room-api';

// Route a catalogued item onward (sell on Exchange, find via Bag/Scale/Embassy). Only after the member confirms.
export const POST = memberRoute(async (req, {db}, {id}) => {
  const {to} = await body(req, z.object({to: z.enum(['bag', 'scale', 'embassy', 'exchange', 'closet'])}));
  const s = must(await db.from('camera_scans').select('status').eq('id', id!).maybeSingle()) as {status: string} | null;
  if (!s) throw new HttpError(404, 'not found');
  if (s.status !== 'catalogued') throw new HttpError(409, 'catalogue the item first');
  return must(await db.from('camera_scans').update({status: 'routed', routed_to: to, updated_at: new Date().toISOString()}).eq('id', id!).select('id, status, routed_to').single());
});
