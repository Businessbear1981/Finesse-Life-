import {z} from 'zod';
import {body, memberRoute, must} from '@/lib/room-api';

const Level = z.enum(['public', 'members', 'private']);
export const PATCH = memberRoute(async (req, {db, user}) => {
  const visibility = await body(req, z.object({profile: Level, standing: Level, closet: Level}));
  return must(await db.from('identity_projections').upsert({user_id: user.id, visibility, updated_at: new Date().toISOString()}, {onConflict: 'user_id'}).select('*').single());
});
