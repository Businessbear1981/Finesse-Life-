import {z} from 'zod';
import {body, memberRoute, must} from '@/lib/room-api';

// Record a missing piece for the week; kept separate from owned items and handed to the Stylist / Bag.
export const POST = memberRoute(async (req, {db, user}) => {
  const b = await body(req, z.object({week_start: z.iso.date(), category: z.string().min(1).max(40), note: z.string().max(300).optional()}));
  const cur = must(await db.from('closet_rotations').select('id, missing').eq('week_start', b.week_start).maybeSingle()) as {id: string; missing: unknown[]} | null;
  const missing = [...(cur?.missing ?? []), {category: b.category, note: b.note ?? null, requested: true}];
  if (cur) return must(await db.from('closet_rotations').update({missing, updated_at: new Date().toISOString()}).eq('id', cur.id).select('*').single());
  return must(await db.from('closet_rotations').insert({user_id: user.id, week_start: b.week_start, missing}).select('*').single());
});
