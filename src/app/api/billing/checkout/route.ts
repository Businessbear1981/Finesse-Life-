import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {VIP_PLAN, billingConfig, startMembershipCheckout} from '@/lib/billing';
import {createServiceClient} from '@/lib/supabase/service';
import {notConfigured, reply, sessionMember, unauthorized, upstreamFailure} from '../_member';

export const runtime = 'nodejs';

const checkoutRequest = z.object({plan: z.literal(VIP_PLAN)});

// POST /api/billing/checkout {plan:'vip_monthly'} → 200 {url} (Stripe-hosted) · 401 ·
// 409 {error:'already_subscribed'} · 503 {error:'billing_not_configured'}
export async function POST(req: Request) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const parsed = await parseBody(req, checkoutRequest);
  if (parsed.error) return parsed.error;

  const cfg = billingConfig();
  if (!cfg.configured || !cfg.hasServiceRole) return notConfigured();

  try {
    const res = await startMembershipCheckout(createServiceClient(), {userId: member.userId, email: member.email}, cfg);
    if ('error' in res) return reply({error: res.error}, 409);
    return reply({url: res.url});
  } catch (e) {
    return upstreamFailure('checkout', e);
  }
}
