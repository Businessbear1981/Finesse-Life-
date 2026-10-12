import {z} from 'zod';
import {body, memberRoute, must} from '@/lib/room-api';

const Card = z.object({display_name: z.string().max(80).optional(), headline: z.string().max(160).optional(), city: z.string().max(80).optional(), interests: z.array(z.string().max(40)).max(20).optional()}).strict();
export const PATCH = memberRoute(async (req, {db, user}) => {
  const b = await body(req, z.object({public_card: Card.optional(), private_card: Card.optional()}));
  return must(await db.from('identity_projections').upsert({user_id: user.id, ...b, updated_at: new Date().toISOString()}, {onConflict: 'user_id'}).select('*').single());
});
