import {memberRoute, must} from '@/lib/room-api';

export const GET = memberRoute(async (_req, {db, user}) => {
  const cur = must(await db.from('identity_projections').select('*').maybeSingle());
  return cur ?? must(await db.from('identity_projections').insert({user_id: user.id}).select('*').single());
});
