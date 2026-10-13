import {reply, sessionMember, unauthorized} from '../../../../billing/_member';
import {closeRequest} from '@/lib/nova-requests';

export const runtime = 'nodejs';
const UUID = /^[0-9a-f-]{36}$/i;

// POST /api/nova/requests/:id/cancel → 200 {request} | 404 | 409
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const {id} = await params;
  if (!UUID.test(id)) return reply({error: 'not_found'}, 404);
  const out = await closeRequest(id, member.userId, 'cancelled');
  return reply(out.body, out.status);
}
