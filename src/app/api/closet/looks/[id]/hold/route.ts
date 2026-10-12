import {z} from 'zod';
import {body, memberRoute, must, HttpError} from '@/lib/room-api';

// Hold one day's look (id = rotation id; body.day 0–6) so it is not rotated out.
export const POST = memberRoute(async (req, {db}, {id}) => {
  const {day} = await body(req, z.object({day: z.number().int().min(0).max(6)}));
  const r = must(await db.from('closet_rotations').select('looks').eq('id', id!).maybeSingle()) as {looks: {day: number; held?: boolean}[]} | null;
  if (!r) throw new HttpError(404, 'not found');
  const looks = r.looks.map((l) => (l.day === day ? {...l, held: true} : l));
  return must(await db.from('closet_rotations').update({looks, updated_at: new Date().toISOString()}).eq('id', id!).select('*').single());
});
