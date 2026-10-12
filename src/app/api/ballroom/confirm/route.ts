import {z} from 'zod';
import {body, memberRoute, must, HttpError} from '@/lib/room-api';

export const POST = memberRoute(async (req, {db}) => {
  const {id} = await body(req, z.object({id: z.uuid()}));
  const p = must(await db.from('ballroom_proposals').select('stage').eq('id', id).maybeSingle()) as {stage: string} | null;
  if (!p) throw new HttpError(404, 'not found');
  if (!['proposal', 'hold', 'confirmed'].includes(p.stage)) throw new HttpError(409, `proposal is ${p.stage}`);
  return must(await db.from('ballroom_proposals').update({stage: 'confirmed', updated_at: new Date().toISOString()}).eq('id', id).select('*').single());
});
