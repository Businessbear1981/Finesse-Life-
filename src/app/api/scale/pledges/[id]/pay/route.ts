import {billingConfig, startScaleCheckout} from '@/lib/billing';
import {createServiceClient} from '@/lib/supabase/service';
import {notConfigured, reply, sessionMember, unauthorized, upstreamFailure} from '@/app/api/billing/_member';

export const runtime = 'nodejs';

// POST /api/scale/pledges/:id/pay → 200 {url} (Stripe-hosted checkout for the group price) · 401 ·
// 404 (not the caller's pledge) · 409 {error:'not_payable', state} (only payment_requested is
// payable) · 503 {error:'billing_not_configured'}. The webhook moves the pledge to paid.
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const cfg = billingConfig();
  if (!cfg.stripeReady || !cfg.hasServiceRole) return notConfigured();
  const {id} = await params;

  try {
    const res = await startScaleCheckout(member.supabase, createServiceClient(), {userId: member.userId, email: member.email}, id, cfg);
    if ('url' in res) return reply({url: res.url});
    if (res.error === 'not_found') return reply({error: 'not_found'}, 404);
    return reply({error: 'not_payable', state: res.state}, 409);
  } catch (e) {
    return upstreamFailure('scale checkout', e);
  }
}
