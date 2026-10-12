import {reply, sessionMember, unauthorized} from '../../../../billing/_member';
import {guardAiCall} from '@/lib/ai-rate-limit';
import {confirmAndDispatch} from '@/lib/nova-requests';

export const runtime = 'nodejs';
export const maxDuration = 60;
const UUID = /^[0-9a-f-]{36}$/i;

// POST /api/nova/requests/:id/confirm → 200 {request} (ready, with result) | 404 | 409 | 429 | 502/503
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const {id} = await params;
  if (!UUID.test(id)) return reply({error: 'not_found'}, 404);
  const limited = await guardAiCall(member.userId, 'nova');
  if (limited) return limited;
  const out = await confirmAndDispatch(id, member.userId);
  return reply(out.body, out.status);
}
