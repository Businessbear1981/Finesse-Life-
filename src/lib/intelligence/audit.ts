// ─── Intelligence Audit Logger (EU AI Act / Post-Market Monitoring) ───────────
// Every AI decision gets logged here with a hashed input (no raw PII),
// output summary, confidence, and risk classification.
// Human review queue for high-risk / low-confidence calls.

import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import type { AuditRecord, IntelligenceQuery } from './types';

function hashInput(input: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 16); // abbreviated — enough for correlation, not enough to reverse
}

function classifyRisk(intent: string, confidence: number): AuditRecord['risk_level'] {
  // High-risk: compliance and financial decisions at low confidence
  if (intent === 'compliance_check') return confidence < 0.8 ? 'high' : 'limited';
  if (intent === 'price_intelligence') return 'limited';
  if (intent === 'demand_forecast') return 'limited';
  if (intent === 'behavioral_profile') return 'limited';
  return 'minimal';
}

export async function logIntelligenceCall(opts: {
  query: IntelligenceQuery;
  output_summary: string;
  model_used: string;
  confidence: number;
}): Promise<string> {
  const risk = classifyRisk(opts.query.intent, opts.confidence);
  const requiresReview = risk === 'high' && opts.confidence < 0.7;

  const record: Omit<AuditRecord, 'id' | 'created_at'> = {
    user_id: opts.query.user_id,
    intent: opts.query.intent,
    model_used: opts.model_used,
    input_hash: hashInput(opts.query.context),
    output_summary: opts.output_summary.slice(0, 500),
    confidence: opts.confidence,
    risk_level: risk,
    requires_human_review: requiresReview,
  };

  try {
    const db = createServiceClient();
    const { data } = await db
      .from('intelligence_audit')
      .insert(record)
      .select('id')
      .single();
    return (data as { id: string } | null)?.id ?? 'no-id';
  } catch {
    // Audit failures are non-fatal but should be visible
    console.error('[intelligence/audit] Failed to write audit record');
    return 'audit-failed';
  }
}

export async function getAuditTrail(userId: string, limit = 50): Promise<AuditRecord[]> {
  const db = createServiceClient();
  const { data } = await db
    .from('intelligence_audit')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditRecord[];
}

export async function getPendingReviews(limit = 20): Promise<AuditRecord[]> {
  const db = createServiceClient();
  const { data } = await db
    .from('intelligence_audit')
    .select('*')
    .eq('requires_human_review', true)
    .is('reviewed_by', null)
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as AuditRecord[];
}

export async function markReviewed(auditId: string, reviewerId: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from('intelligence_audit')
    .update({ reviewed_by: reviewerId, requires_human_review: false })
    .eq('id', auditId);
}
