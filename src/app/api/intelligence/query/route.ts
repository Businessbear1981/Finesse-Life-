// POST /api/intelligence/query
// Main engine query endpoint. Accepts any IntelligenceIntent.
// Auth required. Audit-logged for every call.

import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/intelligence';
import type { IntelligenceQuery, IntelligenceIntent } from '@/lib/intelligence';
import { requireAiConsent } from '@/lib/ai-consent-gate';

// Intents that ask the model on the member's behalf — these need the member's AI consent first.
const MODEL_INTENTS = new Set<IntelligenceIntent>(['next_best_action', 'personalized_recs', 'price_intelligence', 'compliance_check']);

const VALID_INTENTS = new Set<IntelligenceIntent>([
  'next_best_action',
  'personalized_recs',
  'price_intelligence',
  'demand_forecast',
  'logistics_optimize',
  'compliance_check',
  'market_analysis',
  'behavioral_profile',
]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { intent, context, max_latency_ms } = body as {
    intent: string;
    context?: Record<string, unknown>;
    max_latency_ms?: number;
  };

  if (!VALID_INTENTS.has(intent as IntelligenceIntent)) {
    return Response.json(
      { error: `Unknown intent: ${intent}. Valid: ${Array.from(VALID_INTENTS).join(', ')}` },
      { status: 400 },
    );
  }

  if (MODEL_INTENTS.has(intent as IntelligenceIntent)) {
    const noConsent = await requireAiConsent(supabase, user.id);
    if (noConsent) return noConsent;
  }

  const intelligenceQuery: IntelligenceQuery = {
    user_id: user.id,
    intent: intent as IntelligenceIntent,
    context: context ?? {},
    max_latency_ms,
  };

  const response = await query(intelligenceQuery);
  return Response.json(response);
}
