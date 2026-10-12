import {z} from 'zod';
import {body, memberRoute, must} from '@/lib/room-api';

export const POST = memberRoute(async (req, {db}) => {
  const {week_start} = await body(req, z.object({week_start: z.iso.date()}));
  return must(await db.from('closet_rotations').update({status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString()}).eq('week_start', week_start).select('*').single(), true);
});
