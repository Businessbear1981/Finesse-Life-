// ─── Finesse Intelligence Engine — Core Types ────────────────────────────────
// Self-learning backbone for consumer behavior, market, logistics, compliance.

// ── Signal Bus ───────────────────────────────────────────────────────────────

export type SignalKind =
  | 'view_listing'
  | 'view_item'
  | 'make_offer'
  | 'accept_offer'
  | 'decline_offer'
  | 'list_item'
  | 'purchase_intent'
  | 'add_to_registry'
  | 'remove_from_registry'
  | 'style_scan'
  | 'search_query'
  | 'category_browse'
  | 'price_check'
  | 'agent_query'
  | 'checkout_start'
  | 'checkout_complete'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'scale_join'
  | 'vault_fund'
  | 'vault_cashback'
  | 'nightvision_complete';

export interface Signal {
  id?: string;
  user_id: string;
  kind: SignalKind;
  payload: Record<string, unknown>;
  context?: {
    page?: string;
    session_id?: string;
    style_dna?: string;
    style_tags?: string[];
  };
  created_at?: string;
}

// ── Intelligence Query / Response ─────────────────────────────────────────────

export type IntelligenceIntent =
  | 'next_best_action'
  | 'personalized_recs'
  | 'price_intelligence'
  | 'demand_forecast'
  | 'logistics_optimize'
  | 'compliance_check'
  | 'market_analysis'
  | 'behavioral_profile';

export interface IntelligenceQuery {
  user_id: string;
  intent: IntelligenceIntent;
  context: Record<string, unknown>;
  max_latency_ms?: number; // default 5000; set ≤1500 to force fast model
}

export interface IntelligenceResponse {
  intent: IntelligenceIntent;
  result: unknown;
  confidence: number; // 0–1
  model_used: string;
  latency_ms: number;
  audit_id: string;
}

// ── Behavioral Profile ────────────────────────────────────────────────────────

export interface BehavioralProfile {
  user_id: string;
  category_affinities: Record<string, number>; // 0–1 normalized
  brand_affinities: Record<string, number>;
  price_range_preference: { min_cents: number; max_cents: number };
  buying_velocity: 'low' | 'medium' | 'high';
  style_signals: string[];
  last_updated: string;
}

// ── Market Intelligence ───────────────────────────────────────────────────────

export interface MarketSignal {
  category: string;
  demand_score: number; // 0–100
  supply_score: number; // 0–100
  price_trend: 'rising' | 'stable' | 'falling';
  avg_days_to_sell: number;
  avg_price_cents: number;
  listing_count: number;
}

export interface PriceRecommendation {
  recommended_cents: number;
  low_cents: number;
  high_cents: number;
  reasoning: string;
  confidence: number;
}

// ── Logistics ─────────────────────────────────────────────────────────────────

export interface ShipmentSpec {
  weight_oz: number;
  value_cents: number;
  category: string;
  from_zip?: string;
  to_zip?: string;
  length_in?: number;
  width_in?: number;
  height_in?: number;
}

export interface LogisticsQuote {
  carrier: string;
  service: string;
  estimated_days: number;
  rate_cents: number;
  risk_score: number; // 0–1 (higher = more risk)
  tracking_quality: 'excellent' | 'good' | 'basic';
  insurance_included: boolean;
}

export interface LogisticsResult {
  quotes: LogisticsQuote[];
  recommended: LogisticsQuote;
  notes: string;
}

// ── API Orchestration ─────────────────────────────────────────────────────────

export type IntegrationStatus = 'healthy' | 'degraded' | 'down' | 'unconfigured';

export interface IntegrationConfig {
  name: string;
  category: 'carrier' | 'ecommerce' | 'financial' | 'media' | 'market_data' | 'compliance' | 'social' | 'crm' | 'analytics';
  baseUrl: string;
  envKey: string; // env var name holding the API key
  timeout_ms: number;
  maxRetries: number;
  circuitBreakerThreshold: number; // failure count before opening circuit
}

export interface IntegrationCallResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  latency_ms: number;
  integration: string;
}

export interface IntegrationHealth {
  name: string;
  category: string;
  status: IntegrationStatus;
  latency_ms: number | null;
  error_rate: number;
  last_checked: string;
  configured: boolean;
}

// ── Audit (EU AI Act) ─────────────────────────────────────────────────────────

export interface AuditRecord {
  id?: string;
  user_id: string;
  intent: string;
  model_used: string;
  input_hash: string;
  output_summary: string;
  confidence: number;
  risk_level: 'minimal' | 'limited' | 'high';
  requires_human_review: boolean;
  reviewed_by?: string;
  created_at?: string;
}

// ── Compliance ────────────────────────────────────────────────────────────────

export interface ComplianceCheckResult {
  clear: boolean;
  concerns: string[];
  risk: 'low' | 'medium' | 'high';
  recommendation: string;
  regulation_flags: string[];
}
