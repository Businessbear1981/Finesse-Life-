// POST /api/intelligence/signal
// Ingests a behavioral signal from any app surface.
// Fire-and-forget from the client — always returns 202.

import { createClient } from '@/lib/supabase/server';
import { emit } from '@/lib/intelligence';
import type { Signal, SignalKind } from '@/lib/intelligence';

const VALID_KINDS = new Set<SignalKind>([
  'view_listing', 'view_item', 'make_offer', 'accept_offer', 'decline_offer',
  'list_item', 'purchase_intent', 'add_to_registry', 'remove_from_registry',
  'style_scan', 'search_query', 'category_browse', 'price_check', 'agent_query',
  'checkout_start', 'checkout_complete', 'wishlist_add', 'wishlist_remove',
  'scale_join', 'vault_fund', 'vault_cashback', 'nightvision_complete',
]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { kind, payload, context } = body as {
    kind: string;
    payload?: Record<string, unknown>;
    context?: Record<string, unknown>;
  };

  if (!VALID_KINDS.has(kind as SignalKind)) {
    return Response.json({ error: `Unknown signal kind: ${kind}` }, { status: 400 });
  }

  // Resolve user from auth session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const signal: Signal = {
    user_id: user.id,
    kind: kind as SignalKind,
    payload: payload ?? {},
    context: context as Signal['context'],
  };

  // Fire and forget — don't await or return result
  void emit(signal);

  return Response.json({ ok: true }, { status: 202 });
}
