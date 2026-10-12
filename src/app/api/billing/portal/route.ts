import {billingConfig, startPortal} from '@/lib/billing';
import {createServiceClient} from '@/lib/supabase/service';
import {notConfigured, reply, sessionMember, unauthorized, upstreamFailure} from '../_member';

export const runtime = 'nodejs';

// POST /api/billing/portal → 200 {url} (Stripe Customer Portal) · 401 · 404 {error:'no_billing_account'} · 503
export async function POST() {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const cfg = billingConfig();
  if (!cfg.configured || !cfg.hasServiceRole) return notConfigured();

  try {
    const res = await startPortal(createServiceClient(), member.userId, cfg);
    if ('error' in res) return reply({error: res.error}, 404);
    return reply({url: res.url});
  } catch (e) {
    return upstreamFailure('portal', e);
  }
}
