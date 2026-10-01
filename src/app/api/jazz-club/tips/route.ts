import {json, requireMember} from '@/lib/api/room';

// POST /api/jazz-club/tips — tipping needs a live processor + performer payout terms.
// Refuses honestly rather than recording a tip that no one will receive.
export async function POST() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  return json({error: 'payments_not_live', message: 'Tips open once performer payouts are set up. Nothing was charged.'}, ctx.traceId, 409);
}
