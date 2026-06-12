// ─── Intelligence Engine — Main Orchestrator ──────────────────────────────────
// Routes queries to the appropriate sub-engine, times them, logs audit trail.
// This is the single entry point for all intelligence features.

import { complete } from '@/lib/ai';
import { buildBehavioralProfile, predictNextAction, generatePersonalizedRecs } from './behavioral';
import { getMarketSignals, recommendListingPrice, detectMarketAnomalies } from './market';
import { quoteLogistics } from './logistics';
import { logIntelligenceCall } from './audit';
import type {
  IntelligenceQuery,
  IntelligenceResponse,
  ComplianceCheckResult,
} from './types';

// Fast model: Haiku for <1.5s p99 latency
// Default model: Sonnet for nuanced reasoning
const MODEL_FAST = 'anthropic/claude-haiku-4-5-20251001';
const MODEL_DEFAULT = 'anthropic/claude-sonnet-4-6';

export async function query(req: IntelligenceQuery): Promise<IntelligenceResponse> {
  const start = Date.now();
  const useFastModel = (req.max_latency_ms ?? 5000) <= 1500;
  const modelUsed = useFastModel ? MODEL_FAST : MODEL_DEFAULT;

  let result: unknown;
  let confidence = 0.8;
  let summary = '';

  try {
    switch (req.intent) {

      // ── Behavioral Profile ───────────────────────────────────────────────
      case 'behavioral_profile': {
        result = await buildBehavioralProfile(req.user_id);
        confidence = 0.88;
        summary = `Profile built. Velocity: ${(result as { buying_velocity?: string }).buying_velocity ?? 'unknown'}`;
        break;
      }

      // ── Next Best Action ─────────────────────────────────────────────────
      case 'next_best_action': {
        result = await predictNextAction(req.user_id, {
          page: (req.context.page as string) ?? 'unknown',
          item: req.context.item as Record<string, unknown> | undefined,
        });
        confidence = (result as { confidence?: number }).confidence ?? 0.5;
        summary = `Next action: ${(result as { action?: string }).action ?? 'unknown'}`;
        break;
      }

      // ── Personalized Recommendations ─────────────────────────────────────
      case 'personalized_recs': {
        const count = (req.context.count as number) ?? 5;
        result = await generatePersonalizedRecs(req.user_id, count);
        confidence = 0.75;
        summary = `Generated ${(result as unknown[]).length ?? 0} personalized recommendations`;
        break;
      }

      // ── Price Intelligence ────────────────────────────────────────────────
      case 'price_intelligence': {
        if (req.context.mode === 'recommend' && req.context.item) {
          result = await recommendListingPrice(
            req.context.item as {
              title: string;
              brand?: string;
              category: string;
              condition: string;
            },
          );
          confidence = (result as { confidence?: number }).confidence ?? 0.7;
          summary = `Price recommended: $${Math.round(((result as { recommended_cents?: number }).recommended_cents ?? 0) / 100)}`;
        } else if (req.context.mode === 'anomalies') {
          result = await detectMarketAnomalies();
          confidence = 0.82;
          summary = `Detected ${(result as unknown[]).length} market anomalies`;
        } else {
          result = await getMarketSignals(req.context.category as string | undefined);
          confidence = 0.85;
          summary = `Market signals for ${req.context.category ?? 'all categories'}`;
        }
        break;
      }

      // ── Market Analysis ────────────────────────────────────────────────────
      case 'market_analysis': {
        const [signals, anomalies] = await Promise.all([
          getMarketSignals(req.context.category as string | undefined),
          detectMarketAnomalies(),
        ]);
        result = { signals, anomalies };
        confidence = 0.88;
        summary = `Market analysis: ${signals.length} categories, ${anomalies.length} anomalies`;
        break;
      }

      // ── Demand Forecast ────────────────────────────────────────────────────
      case 'demand_forecast': {
        const category = req.context.category as string | undefined;
        const signals = await getMarketSignals(category);
        const topSignal = signals.find((s) => !category || s.category === category) ?? signals[0];

        let recommendation = 'Insufficient data for forecast.';
        if (topSignal) {
          if (topSignal.demand_score >= 75) {
            recommendation = `High demand (${topSignal.demand_score}/100) — list ${topSignal.category} items now for fastest sale.`;
          } else if (topSignal.demand_score >= 45) {
            recommendation = `Moderate demand (${topSignal.demand_score}/100) — standard pricing applies.`;
          } else {
            recommendation = `Soft demand (${topSignal.demand_score}/100) — price competitively or wait for demand recovery.`;
          }
        }

        result = {
          category: category ?? 'all',
          demand_score: topSignal?.demand_score ?? 0,
          supply_score: topSignal?.supply_score ?? 0,
          price_trend: topSignal?.price_trend ?? 'stable',
          avg_days_to_sell: topSignal?.avg_days_to_sell ?? 30,
          recommendation,
        };
        confidence = topSignal ? 0.78 : 0.2;
        summary = `Demand forecast: ${topSignal?.demand_score ?? 0}/100`;
        break;
      }

      // ── Logistics Optimization ─────────────────────────────────────────────
      case 'logistics_optimize': {
        const logResult = quoteLogistics({
          weight_oz: (req.context.weight_oz as number) ?? 16,
          value_cents: (req.context.value_cents as number) ?? 5000,
          category: (req.context.category as string) ?? 'Fashion',
          from_zip: req.context.from_zip as string | undefined,
          to_zip: req.context.to_zip as string | undefined,
        });
        result = logResult;
        confidence = 0.92;
        summary = `Logistics: ${logResult.quotes.length} quotes, recommended ${logResult.recommended.carrier} ${logResult.recommended.service}`;
        break;
      }

      // ── Compliance Check ───────────────────────────────────────────────────
      case 'compliance_check': {
        const prompt = `You are the Finesse compliance intelligence engine. Analyze this transaction for regulatory and platform concerns.

Transaction context:
${JSON.stringify(req.context, null, 2)}

Check for:
1. Counterfeit / authentication risk (luxury goods, limited editions)
2. Restricted or regulated items (certain electronics, cosmetics, supplements)
3. Trade sanctions exposure (if international shipping indicated)
4. Platform policy violations (prohibited categories)
5. EU AI Act relevance (if AI is making a consequential recommendation)

Respond with JSON only:
{"clear":boolean,"concerns":["string"],"risk":"low"|"medium"|"high","recommendation":"string","regulation_flags":["string"]}`;

        const text = await complete(prompt, { model: MODEL_DEFAULT });
        const match = text.match(/\{[\s\S]*?\}/);
        const parsed = match ? (JSON.parse(match[0]) as ComplianceCheckResult) : null;

        result = parsed ?? {
          clear: true,
          concerns: [],
          risk: 'low',
          recommendation: 'No immediate compliance concerns detected.',
          regulation_flags: [],
        };
        confidence = parsed ? 0.72 : 0.5;
        summary = `Compliance: ${(result as ComplianceCheckResult).risk} risk`;
        break;
      }

      default:
        result = { error: `Unknown intent: ${req.intent as string}` };
        confidence = 0;
        summary = 'Unknown intent';
    }
  } catch (err) {
    result = { error: err instanceof Error ? err.message : 'Engine error' };
    confidence = 0;
    summary = 'Engine error';
    console.error(`[intelligence/engine] Error on intent ${req.intent}:`, err);
  }

  const latency_ms = Date.now() - start;

  const audit_id = await logIntelligenceCall({
    query: req,
    output_summary: summary,
    model_used: modelUsed,
    confidence,
  });

  return {
    intent: req.intent,
    result,
    confidence,
    model_used: modelUsed,
    latency_ms,
    audit_id,
  };
}
