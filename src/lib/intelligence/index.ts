// ─── Finesse Intelligence Engine — Public API ─────────────────────────────────
// Import from here. Do NOT import sub-modules directly in routes or components.

// Core engine
export { query } from './engine';

// Signal bus (emit behavioral events)
export { emit, emitBatch, getRecentSignals, getSignalCounts } from './bus';

// Behavioral intelligence
export { buildBehavioralProfile, predictNextAction, generatePersonalizedRecs } from './behavioral';

// Market intelligence
export { getMarketSignals, recommendListingPrice, detectMarketAnomalies } from './market';

// Logistics intelligence
export { quoteLogistics, estimateFulfillmentWindow } from './logistics';

// API orchestration bus
export { callIntegration, getIntegrationHealth, getConfiguredCount, INTEGRATION_REGISTRY } from './orchestration';

// Audit trail
export { logIntelligenceCall, getAuditTrail, getPendingReviews, markReviewed } from './audit';

// Types
export type {
  Signal,
  SignalKind,
  IntelligenceQuery,
  IntelligenceResponse,
  IntelligenceIntent,
  BehavioralProfile,
  MarketSignal,
  PriceRecommendation,
  ShipmentSpec,
  LogisticsQuote,
  LogisticsResult,
  IntegrationConfig,
  IntegrationCallResult,
  IntegrationHealth,
  AuditRecord,
  ComplianceCheckResult,
} from './types';
