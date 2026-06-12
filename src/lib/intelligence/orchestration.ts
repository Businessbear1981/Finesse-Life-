// ─── API Orchestration Bus ────────────────────────────────────────────────────
// Unified gateway for 30+ external integrations.
// Handles circuit breaking, retries, rate limits, and health monitoring.
// Add new integrations by extending INTEGRATION_REGISTRY below.

import type {
  IntegrationConfig,
  IntegrationCallResult,
  IntegrationHealth,
  IntegrationStatus,
} from './types';

// ── Circuit Breaker State ─────────────────────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  consecutiveSuccesses: number;
}

const circuitStates = new Map<string, CircuitState>();
const CIRCUIT_RESET_MS = 30_000; // 30 seconds before attempting half-open
const HALF_OPEN_SUCCESS_THRESHOLD = 2;

function getCircuit(name: string): CircuitState {
  if (!circuitStates.has(name)) {
    circuitStates.set(name, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      consecutiveSuccesses: 0,
    });
  }
  return circuitStates.get(name)!;
}

function recordSuccess(name: string): void {
  const c = getCircuit(name);
  c.failures = 0;
  c.consecutiveSuccesses++;
  if (c.state === 'half-open' && c.consecutiveSuccesses >= HALF_OPEN_SUCCESS_THRESHOLD) {
    c.state = 'closed';
  }
}

function recordFailure(name: string, threshold: number): void {
  const c = getCircuit(name);
  c.failures++;
  c.lastFailure = Date.now();
  c.consecutiveSuccesses = 0;
  if (c.failures >= threshold) {
    c.state = 'open';
  }
}

function isCircuitOpen(name: string): boolean {
  const c = getCircuit(name);
  if (c.state === 'closed') return false;
  if (c.state === 'open') {
    if (Date.now() - c.lastFailure >= CIRCUIT_RESET_MS) {
      c.state = 'half-open';
      return false;
    }
    return true;
  }
  return false; // half-open: allow one attempt
}

// ── Integration Registry ───────────────────────────────────────────────────────
// Add integrations here. `envKey` must match the name of the env variable
// that holds the API key/token. If the env var is not set, the integration
// is marked 'unconfigured' and calls return a graceful null result.

export const INTEGRATION_REGISTRY: IntegrationConfig[] = [
  // ── Carriers ──────────────────────────────────────────────────────────────
  { name: 'shipengine',       category: 'carrier',     baseUrl: 'https://api.shipengine.com/v1',                  envKey: 'SHIPENGINE_API_KEY',      timeout_ms: 5000,  maxRetries: 2, circuitBreakerThreshold: 3 },
  { name: 'easypost',         category: 'carrier',     baseUrl: 'https://api.easypost.com/v2',                    envKey: 'EASYPOST_API_KEY',        timeout_ms: 5000,  maxRetries: 2, circuitBreakerThreshold: 3 },
  { name: 'fedex',            category: 'carrier',     baseUrl: 'https://apis.fedex.com',                         envKey: 'FEDEX_API_KEY',           timeout_ms: 8000,  maxRetries: 2, circuitBreakerThreshold: 3 },
  { name: 'ups',              category: 'carrier',     baseUrl: 'https://onlinetools.ups.com',                    envKey: 'UPS_API_KEY',             timeout_ms: 8000,  maxRetries: 2, circuitBreakerThreshold: 3 },
  { name: 'usps',             category: 'carrier',     baseUrl: 'https://api.usps.com/v3',                        envKey: 'USPS_API_KEY',            timeout_ms: 6000,  maxRetries: 2, circuitBreakerThreshold: 3 },
  { name: 'dhl',              category: 'carrier',     baseUrl: 'https://api-eu.dhl.com',                         envKey: 'DHL_API_KEY',             timeout_ms: 8000,  maxRetries: 2, circuitBreakerThreshold: 3 },

  // ── Market Data ────────────────────────────────────────────────────────────
  { name: 'stockx',           category: 'market_data', baseUrl: 'https://api.stockx.com/v2',                      envKey: 'STOCKX_API_KEY',          timeout_ms: 6000,  maxRetries: 2, circuitBreakerThreshold: 4 },
  { name: 'ebay',             category: 'market_data', baseUrl: 'https://api.ebay.com/buy/browse/v1',             envKey: 'EBAY_API_KEY',            timeout_ms: 6000,  maxRetries: 2, circuitBreakerThreshold: 4 },
  { name: 'google_shopping',  category: 'market_data', baseUrl: 'https://shopping.googleapis.com/shopping/search/v1', envKey: 'GOOGLE_SHOPPING_KEY', timeout_ms: 5000,  maxRetries: 2, circuitBreakerThreshold: 4 },
  { name: 'yahoo_finance',    category: 'market_data', baseUrl: 'https://yfapi.net/v8/finance',                   envKey: 'YAHOO_FINANCE_KEY',       timeout_ms: 5000,  maxRetries: 2, circuitBreakerThreshold: 4 },
  { name: 'alpaca',           category: 'financial',   baseUrl: 'https://data.alpaca.markets/v2',                 envKey: 'ALPACA_API_KEY',          timeout_ms: 5000,  maxRetries: 2, circuitBreakerThreshold: 5 },

  // ── eCommerce / Sourcing ───────────────────────────────────────────────────
  { name: 'shopify',          category: 'ecommerce',   baseUrl: 'https://shopify.dev/api',                        envKey: 'SHOPIFY_ACCESS_TOKEN',    timeout_ms: 8000,  maxRetries: 2, circuitBreakerThreshold: 3 },
  { name: 'goat',             category: 'ecommerce',   baseUrl: 'https://2fwotdvm0o.execute-api.us-west-2.amazonaws.com/goat', envKey: 'GOAT_API_KEY', timeout_ms: 6000, maxRetries: 2, circuitBreakerThreshold: 4 },

  // ── Financial ─────────────────────────────────────────────────────────────
  { name: 'stripe',           category: 'financial',   baseUrl: 'https://api.stripe.com/v1',                      envKey: 'STRIPE_SECRET_KEY',       timeout_ms: 8000,  maxRetries: 3, circuitBreakerThreshold: 5 },
  { name: 'plaid',            category: 'financial',   baseUrl: 'https://production.plaid.com',                   envKey: 'PLAID_SECRET',            timeout_ms: 10000, maxRetries: 2, circuitBreakerThreshold: 3 },

  // ── Compliance / Trade ─────────────────────────────────────────────────────
  { name: 'ofac_sanctions',   category: 'compliance',  baseUrl: 'https://sanctionslistservice.ofac.treas.gov',    envKey: 'OFAC_API_KEY',            timeout_ms: 8000,  maxRetries: 3, circuitBreakerThreshold: 2 },
  { name: 'trade_compliance', category: 'compliance',  baseUrl: 'https://api.customs.gov',                        envKey: 'TRADE_COMPLIANCE_KEY',    timeout_ms: 8000,  maxRetries: 2, circuitBreakerThreshold: 2 },

  // ── Social / Identity ──────────────────────────────────────────────────────
  { name: 'telegram',         category: 'social',      baseUrl: 'https://api.telegram.org',                       envKey: 'TELEGRAM_BOT_TOKEN',      timeout_ms: 5000,  maxRetries: 2, circuitBreakerThreshold: 5 },
  { name: 'instagram',        category: 'social',      baseUrl: 'https://graph.instagram.com',                    envKey: 'INSTAGRAM_ACCESS_TOKEN',  timeout_ms: 8000,  maxRetries: 2, circuitBreakerThreshold: 3 },
  { name: 'spotify',          category: 'social',      baseUrl: 'https://api.spotify.com/v1',                     envKey: 'SPOTIFY_CLIENT_SECRET',   timeout_ms: 5000,  maxRetries: 2, circuitBreakerThreshold: 4 },

  // ── CRM / Comms ────────────────────────────────────────────────────────────
  { name: 'sendgrid',         category: 'crm',         baseUrl: 'https://api.sendgrid.com/v3',                    envKey: 'SENDGRID_API_KEY',        timeout_ms: 5000,  maxRetries: 3, circuitBreakerThreshold: 4 },
  { name: 'twilio',           category: 'crm',         baseUrl: 'https://api.twilio.com/2010-04-01',              envKey: 'TWILIO_AUTH_TOKEN',       timeout_ms: 5000,  maxRetries: 3, circuitBreakerThreshold: 4 },
  { name: 'klaviyo',          category: 'crm',         baseUrl: 'https://a.klaviyo.com/api',                      envKey: 'KLAVIYO_PRIVATE_KEY',     timeout_ms: 6000,  maxRetries: 2, circuitBreakerThreshold: 4 },

  // ── Analytics ─────────────────────────────────────────────────────────────
  { name: 'algolia',          category: 'analytics',   baseUrl: 'https://algolia.net',                            envKey: 'ALGOLIA_API_KEY',         timeout_ms: 3000,  maxRetries: 2, circuitBreakerThreshold: 5 },
  { name: 'middleware_io',    category: 'analytics',   baseUrl: 'https://middleware.io',                          envKey: 'MIDDLEWARE_IO_KEY',       timeout_ms: 5000,  maxRetries: 2, circuitBreakerThreshold: 5 },

  // ── AI / Media ─────────────────────────────────────────────────────────────
  { name: 'anthropic',        category: 'analytics',   baseUrl: 'https://api.anthropic.com/v1',                   envKey: 'ANTHROPIC_API_KEY',       timeout_ms: 30000, maxRetries: 2, circuitBreakerThreshold: 5 },
  { name: 'elevenlabs',       category: 'media',       baseUrl: 'https://api.elevenlabs.io/v1',                   envKey: 'ELEVENLABS_API_KEY',      timeout_ms: 15000, maxRetries: 1, circuitBreakerThreshold: 3 },
  { name: 'higgsfield',       category: 'media',       baseUrl: 'https://api.higgsfield.ai/v1',                   envKey: 'HIGGSFIELD_API_KEY',      timeout_ms: 60000, maxRetries: 1, circuitBreakerThreshold: 2 },
  { name: 'meshy',            category: 'media',       baseUrl: 'https://api.meshy.ai/v2',                        envKey: 'MESHY_API_KEY',           timeout_ms: 30000, maxRetries: 1, circuitBreakerThreshold: 2 },
  { name: 'suno',             category: 'media',       baseUrl: 'https://studio-api.suno.ai/api',                 envKey: 'SUNO_COOKIE',             timeout_ms: 30000, maxRetries: 1, circuitBreakerThreshold: 2 },

  // ── Storage ────────────────────────────────────────────────────────────────
  { name: 'cloudflare_r2',    category: 'analytics',   baseUrl: 'https://api.cloudflare.com/client/v4',           envKey: 'CLOUDFLARE_R2_ACCESS_KEY', timeout_ms: 10000, maxRetries: 3, circuitBreakerThreshold: 4 },
];

// ── Core Call Function ────────────────────────────────────────────────────────

export async function callIntegration<T = unknown>(
  name: string,
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
    authHeader?: string; // override the default Authorization header value
  } = {},
): Promise<IntegrationCallResult<T>> {
  const start = Date.now();
  const config = INTEGRATION_REGISTRY.find((r) => r.name === name);

  if (!config) {
    return { ok: false, error: `Unknown integration: ${name}`, latency_ms: 0, integration: name };
  }

  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    return {
      ok: false,
      error: `Integration '${name}' not configured (missing env: ${config.envKey})`,
      latency_ms: 0,
      integration: name,
    };
  }

  if (isCircuitOpen(name)) {
    return {
      ok: false,
      error: `Integration '${name}' circuit is open — temporarily unavailable`,
      latency_ms: 0,
      integration: name,
    };
  }

  const url = `${config.baseUrl}${path}`;
  const method = options.method ?? 'GET';
  const authHeader = options.authHeader ?? `Bearer ${apiKey}`;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout_ms);

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latency_ms = Date.now() - start;

      if (res.ok) {
        const data = (await res.json()) as T;
        recordSuccess(name);
        return { ok: true, data, latency_ms, integration: name };
      }

      // 4xx errors are not retryable
      if (res.status >= 400 && res.status < 500) {
        recordFailure(name, config.circuitBreakerThreshold);
        const errText = await res.text().catch(() => String(res.status));
        return {
          ok: false,
          error: `${name} returned ${res.status}: ${errText.slice(0, 200)}`,
          latency_ms,
          integration: name,
        };
      }

      // 5xx: retry
      if (attempt < config.maxRetries) {
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt))); // exp backoff
        continue;
      }

      recordFailure(name, config.circuitBreakerThreshold);
      return {
        ok: false,
        error: `${name} returned ${res.status} after ${config.maxRetries} retries`,
        latency_ms,
        integration: name,
      };
    } catch (err) {
      if (attempt < config.maxRetries) {
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
        continue;
      }
      recordFailure(name, config.circuitBreakerThreshold);
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        latency_ms: Date.now() - start,
        integration: name,
      };
    }
  }

  return { ok: false, error: 'Max retries exceeded', latency_ms: Date.now() - start, integration: name };
}

// ── Health Snapshot ────────────────────────────────────────────────────────────

export function getIntegrationHealth(): IntegrationHealth[] {
  return INTEGRATION_REGISTRY.map((config) => {
    const circuit = getCircuit(config.name);
    const apiKey = process.env[config.envKey];
    const configured = !!apiKey;

    let status: IntegrationStatus = 'unconfigured';
    if (configured) {
      if (circuit.state === 'open') status = 'down';
      else if (circuit.failures > 0) status = 'degraded';
      else status = 'healthy';
    }

    return {
      name: config.name,
      category: config.category,
      status,
      latency_ms: null,
      error_rate: circuit.failures / Math.max(circuit.failures + circuit.consecutiveSuccesses, 1),
      last_checked: new Date().toISOString(),
      configured,
    };
  });
}

// Count configured integrations
export function getConfiguredCount(): number {
  return INTEGRATION_REGISTRY.filter((c) => !!process.env[c.envKey]).length;
}
