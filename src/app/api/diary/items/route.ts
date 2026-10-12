import {z} from 'zod';
import {body, memberRoute, must} from '@/lib/room-api';

const Item = z.object({day: z.iso.date(), title: z.string().min(1).max(200), room: z.string().max(40).optional(), status: z.enum(['done', 'needs_you']).default('needs_you'), detail: z.record(z.string(), z.unknown()).default({})});
export const POST = memberRoute(async (req, {db, user}) => {
  const b = await body(req, Item);
  return must(await db.from('diary_items').insert({...b, user_id: user.id}).select('*').single());
});
