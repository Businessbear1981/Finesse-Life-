import {memberRoute, must} from '@/lib/room-api';

// Upcoming proposals/holds/confirmations plus the member's closet looks to dress the evening.
export const GET = memberRoute(async (_req, {db}) => {
  const proposals = must(await db.from('ballroom_proposals').select('*').neq('stage', 'cancelled').gte('starts_at', new Date(Date.now() - 864e5).toISOString()).order('starts_at'));
  const looks = must(await db.from('closet_items').select('id, name, category').limit(50));
  return {proposals, looks};
});
