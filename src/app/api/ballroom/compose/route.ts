import {z} from 'zod';
import {body, memberRoute, must} from '@/lib/room-api';

const Part = z.record(z.string(), z.unknown()).default({});
export const POST = memberRoute(async (req, {db, user}) => {
  const b = await body(req, z.object({starts_at: z.iso.datetime({offset: true}), venue: Part, look: Part, gift: Part, route: Part, partner_disclosure: z.string().max(300).optional()}));
  const p = must(await db.from('ballroom_proposals').insert({...b, user_id: user.id, stage: 'proposal'}).select('*').single()) as {id: string; starts_at: string};
  await db.from('diary_items').insert({user_id: user.id, day: p.starts_at.slice(0, 10), title: 'Evening proposal ready', room: 'ballroom', status: 'needs_you', detail: {proposal_id: p.id}});
  return p;
});
