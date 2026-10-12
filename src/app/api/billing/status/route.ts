import {billingConfig, billingStatus} from '@/lib/billing';
import {reply, sessionMember, unauthorized} from '../_member';

export const runtime = 'nodejs';

// GET /api/billing/status → {configured, priceDisplay, vip:{active, source, expiresAt}, subscription|null}
// Read with the member's own session (owner-read RLS). Works before billing is configured.
export async function GET() {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const status = await billingStatus(member.supabase, member.userId, billingConfig());
  return reply(status);
}
