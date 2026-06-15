'use client';

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── What the health API returns per integration ───────────────────────────────
interface HealthIntegration {
  name: string;
  category: string;
  status: "healthy" | "degraded" | "down" | "unconfigured";
  latency_ms: number | null;
  error_rate: number;
  last_checked: string;
  configured: boolean;
}

interface HealthApiResponse {
  integrations: {
    total: number;
    configured: number;
    unconfigured: number;
    list: HealthIntegration[];
  };
}

// ── What the test API returns ─────────────────────────────────────────────────
interface TestResult {
  vendor: string;
  status: "ok" | "fail" | "no_quota" | "disabled";
  latency_ms: number;
  message: string;
}

// ── Internal display model ────────────────────────────────────────────────────
interface ConnectorInfo {
  key: string;
  name: string;
  category: string;
  icon_url: string;
  // Display status mapped from health status + test result
  status: "active" | "connecting" | "inactive" | "error";
  configured: boolean;
  description: string;
  // Live health fields
  latency_ms: number | null;
  error_rate: number;
  last_checked: string | null;
}

// ── Map orchestration categories → display categories ────────────────────────
const CATEGORY_REMAP: Record<string, string> = {
  financial: "payments",
  carrier: "transport",
  ecommerce: "deals",
  market_data: "market_data",
  compliance: "dev",
  social: "social",
  crm: "comms",
  analytics: "dev",
  media: "media",
};

const ICON_MAP: Record<string, string> = {
  claude: "◈",
  chatgpt: "◆",
  grok: "✦",
  higgsfield: "▶",
  meshy: "△",
  elevenlabs: "🔊",
  cloudinary: "☁",
  instagram: "◎",
  twitter: "✕",
  tiktok: "♪",
  youtube: "▷",
  pinterest: "📌",
  snapchat: "👻",
  mapbox: "🗺",
  google_maps: "📍",
  twilio: "📱",
  sendgrid: "✉",
  spotify: "♫",
  stripe: "💳",
  claude_code: "⌘",
  alpaca: "▲",
  plaid: "◇",
  yahoo_finance: "¥",
  sec_edgar: "§",
  attom: "⌂",
  tiktok_business: "♪",
  supercom: "★",
  amadeus: "✈",
  skyscanner: "◈",
  expedia: "◆",
  yelp: "✦",
  anthropic: "◈",
  shipengine: "📦",
  easypost: "📬",
  fedex: "📦",
  ups: "📦",
  usps: "📮",
  dhl: "📦",
  stockx: "👟",
  ebay: "◆",
  google_shopping: "🛍",
  shopify: "🛒",
  goat: "🐐",
  ofac_sanctions: "⚖",
  trade_compliance: "⚖",
  telegram: "✈",
  klaviyo: "✉",
  algolia: "🔍",
  middleware_io: "⚙",
  suno: "♫",
  cloudflare_r2: "☁",
};

const DISPLAY_NAMES: Record<string, string> = {
  anthropic: "Claude / Anthropic",
  shipengine: "ShipEngine",
  easypost: "EasyPost",
  fedex: "FedEx",
  ups: "UPS",
  usps: "USPS",
  dhl: "DHL",
  stockx: "StockX",
  ebay: "eBay",
  google_shopping: "Google Shopping",
  yahoo_finance: "Yahoo Finance",
  alpaca: "Alpaca",
  shopify: "Shopify",
  goat: "GOAT",
  stripe: "Stripe",
  plaid: "Plaid",
  ofac_sanctions: "OFAC Sanctions",
  trade_compliance: "Trade Compliance",
  telegram: "Telegram",
  instagram: "Instagram",
  spotify: "Spotify",
  sendgrid: "SendGrid",
  twilio: "Twilio",
  klaviyo: "Klaviyo",
  algolia: "Algolia",
  middleware_io: "Middleware.io",
  elevenlabs: "ElevenLabs",
  higgsfield: "Higgsfield",
  meshy: "Meshy",
  suno: "Suno",
  cloudflare_r2: "Cloudflare R2",
};

const DESCRIPTIONS: Record<string, string> = {
  anthropic: "Anthropic Claude — concierge brain",
  elevenlabs: "AI voice synthesis",
  higgsfield: "AI video generation",
  meshy: "3D model generation",
  suno: "AI music generation",
  stripe: "Payment processing",
  plaid: "Banking data & ACH",
  alpaca: "Stock trading API",
  instagram: "Instagram distribution",
  telegram: "Telegram notifications",
  spotify: "Music integration",
  sendgrid: "Transactional email",
  twilio: "SMS & voice",
  klaviyo: "Email marketing",
  algolia: "Search & discovery",
  middleware_io: "Observability platform",
  cloudflare_r2: "Media storage (R2)",
  shipengine: "Multi-carrier shipping rates",
  easypost: "Shipping & tracking",
  fedex: "FedEx shipping",
  ups: "UPS shipping",
  usps: "USPS shipping",
  dhl: "DHL international shipping",
  stockx: "StockX market data",
  ebay: "eBay marketplace",
  google_shopping: "Google Shopping feed",
  yahoo_finance: "Market data & quotes",
  shopify: "eCommerce storefront",
  goat: "GOAT sneaker marketplace",
  ofac_sanctions: "OFAC sanctions screening",
  trade_compliance: "Trade compliance API",
};

// ── Map health status → display status ───────────────────────────────────────
function toDisplayStatus(s: HealthIntegration["status"]): ConnectorInfo["status"] {
  switch (s) {
    case "healthy": return "active";
    case "degraded": return "connecting";
    case "down": return "error";
    case "unconfigured": return "inactive";
  }
}

// ── Build ConnectorInfo from a live HealthIntegration row ─────────────────────
function toConnector(h: HealthIntegration): ConnectorInfo {
  return {
    key: h.name,
    name: DISPLAY_NAMES[h.name] ?? h.name,
    category: CATEGORY_REMAP[h.category] ?? h.category,
    icon_url: "",
    status: toDisplayStatus(h.status),
    configured: h.configured,
    description: DESCRIPTIONS[h.name] ?? `${h.name} integration`,
    latency_ms: h.latency_ms,
    error_rate: h.error_rate,
    last_checked: h.last_checked,
  };
}

// ── Fallback connector list (shown only if the API call fails entirely) ───────
const FALLBACK_CONNECTORS: ConnectorInfo[] = [
  { key: "anthropic", name: "Claude / Anthropic", category: "dev", icon_url: "", status: "inactive", configured: false, description: "Anthropic Claude — concierge brain", latency_ms: null, error_rate: 0, last_checked: null },
  { key: "elevenlabs", name: "ElevenLabs", category: "media", icon_url: "", status: "inactive", configured: false, description: "AI voice synthesis", latency_ms: null, error_rate: 0, last_checked: null },
  { key: "higgsfield", name: "Higgsfield", category: "media", icon_url: "", status: "inactive", configured: false, description: "AI video generation", latency_ms: null, error_rate: 0, last_checked: null },
  { key: "meshy", name: "Meshy", category: "media", icon_url: "", status: "inactive", configured: false, description: "3D model generation", latency_ms: null, error_rate: 0, last_checked: null },
  { key: "stripe", name: "Stripe", category: "payments", icon_url: "", status: "inactive", configured: false, description: "Payment processing", latency_ms: null, error_rate: 0, last_checked: null },
  { key: "sendgrid", name: "SendGrid", category: "comms", icon_url: "", status: "inactive", configured: false, description: "Transactional email", latency_ms: null, error_rate: 0, last_checked: null },
  { key: "twilio", name: "Twilio", category: "comms", icon_url: "", status: "inactive", configured: false, description: "SMS & voice", latency_ms: null, error_rate: 0, last_checked: null },
];

const CATEGORY_ORDER = ["ai", "media", "social", "maps", "comms", "music", "payments", "dev", "trading", "banking", "market_data", "real_estate", "advertising", "deals", "flights", "hotels", "dining", "transport"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI BRAIN",
  media: "MEDIA GENERATION",
  social: "SOCIAL DISTRIBUTION",
  maps: "MAPS & LOCATION",
  comms: "COMMUNICATIONS",
  music: "MUSIC",
  payments: "PAYMENTS",
  dev: "DEV TOOLS",
  trading: "TRADING & BROKERAGE",
  banking: "BANKING",
  market_data: "MARKET INTELLIGENCE",
  real_estate: "REAL ESTATE",
  advertising: "AD PLATFORMS",
  deals: "DEALS & SAVINGS",
  flights: "FLIGHTS",
  hotels: "HOTELS & STAYS",
  dining: "DINING & NIGHTLIFE",
  transport: "TRANSPORT",
};

function CategorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-brass/20" />
        <h2 className="font-label text-[10px] tracking-[0.4em] text-brass/60 uppercase">{title}</h2>
        <div className="h-px flex-1 bg-brass/20" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {children}
      </div>
    </div>
  );
}

function ConnectorCard({ connector, onToggle, testing }: { connector: ConnectorInfo; onToggle: () => void; testing: boolean }) {
  const icon = ICON_MAP[connector.key] || "•";

  const statusClass = {
    active: "border-green-500/40",
    connecting: "border-brass/40",
    error: "border-red-500/30",
    inactive: "border-cream/8",
  }[connector.status];

  const statusDotColor = {
    active: "bg-green-500",
    connecting: "bg-brass",
    error: "bg-red-500",
    inactive: "bg-cream/20",
  }[connector.status];

  const glowClass = {
    active: "shadow-[0_0_8px_rgba(34,197,94,0.2)]",
    connecting: "shadow-[0_0_8px_rgba(201,168,76,0.2)]",
    error: "",
    inactive: "",
  }[connector.status];

  const latencyDisplay = connector.latency_ms != null
    ? `${connector.latency_ms}ms`
    : null;

  const errorPct = connector.error_rate > 0
    ? `${(connector.error_rate * 100).toFixed(0)}% err`
    : null;

  return (
    <motion.button
      onClick={onToggle}
      disabled={testing}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex flex-col items-center justify-center gap-2 w-full aspect-[6/7] rounded-sm border bg-ink/80 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:bg-oxblood/20 ${statusClass} ${glowClass} ${testing ? "opacity-60 cursor-wait" : ""}`}
      title={connector.description}
    >
      <span className="text-3xl leading-none select-none">{icon}</span>
      <span className="font-label text-[9px] tracking-[0.2em] text-cream/80 uppercase text-center px-1 leading-tight">
        {connector.name}
      </span>

      {/* Live metrics row */}
      {(latencyDisplay || errorPct) && (
        <span className="flex items-center gap-1.5 font-mono text-[8px] text-cream/30">
          {latencyDisplay && <span>{latencyDisplay}</span>}
          {errorPct && <span className="text-red-400/60">{errorPct}</span>}
        </span>
      )}

      {/* Status dot */}
      <span
        className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${statusDotColor} ${
          connector.status === "active" || connector.status === "connecting" ? "animate-pulse" : ""
        }`}
      />

      {/* Testing spinner */}
      {testing && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-4 h-4 rounded-full border border-brass/40 border-t-brass animate-spin" />
        </span>
      )}
    </motion.button>
  );
}

export default function Backstage() {
  const [connectors, setConnectors] = useState<ConnectorInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [testMessages, setTestMessages] = useState<Record<string, string>>({});

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence/health");
      if (!res.ok) throw new Error(`health API returned ${res.status}`);
      const data = (await res.json()) as HealthApiResponse;
      const list = data.integrations?.list;
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error("empty integration list");
      }
      setConnectors(list.map(toConnector));
    } catch {
      // Fall back to static list only on first load; preserve live data on refresh errors
      setConnectors((prev) => prev ?? FALLBACK_CONNECTORS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
    const interval = setInterval(fetchConnectors, 10_000);
    return () => clearInterval(interval);
  }, [fetchConnectors]);

  const handleToggle = async (key: string) => {
    if (toggling) return;
    setToggling(key);
    setTestMessages((prev) => ({ ...prev, [key]: "" }));
    try {
      const res = await fetch(`/api/integrations/${key}/test`, { method: "POST" });
      const result = (await res.json()) as TestResult;

      const newStatus: ConnectorInfo["status"] =
        result.status === "ok"
          ? "active"
          : result.status === "no_quota"
          ? "connecting"
          : result.status === "disabled"
          ? "inactive"
          : "error";

      setConnectors((prev) =>
        prev
          ? prev.map((c) => (c.key === key ? { ...c, status: newStatus, latency_ms: result.latency_ms ?? c.latency_ms } : c))
          : prev
      );
      setTestMessages((prev) => ({ ...prev, [key]: result.message ?? "" }));
    } catch {
      setConnectors((prev) =>
        prev ? prev.map((c) => (c.key === key ? { ...c, status: "error" } : c)) : prev
      );
      setTestMessages((prev) => ({ ...prev, [key]: "Connection failed" }));
    } finally {
      setToggling(null);
    }
  };

  const connectorList = connectors ?? [];
  const activeCount = connectorList.filter((c) => c.status === "active").length;
  const totalCount = connectorList.length;
  const hasAnyActive = activeCount > 0;

  const grouped: Record<string, ConnectorInfo[]> = {};
  for (const c of connectorList) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }

  return (
    <div className="min-h-screen bg-ink relative">
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,169,107,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <header className="text-center mb-16 relative">
          <div className="absolute top-0 right-0 flex items-center gap-2 border border-brass/20 rounded-sm px-3 py-1.5 bg-ink/60 backdrop-blur-sm">
            <span className="font-label text-[9px] tracking-[0.3em] text-brass/50 uppercase">System Status</span>
            <span className="font-mono text-xs text-brass">{loading ? "--" : `${activeCount} / ${totalCount}`}</span>
            <span className="font-label text-[8px] tracking-[0.2em] text-brass/40 uppercase">Online</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-3">
            <span className={`inline-block w-2 h-2 rounded-full ${hasAnyActive ? "bg-green-500 animate-pulse" : "bg-cream/20"}`} />
            <h1 className="font-display text-4xl sm:text-5xl text-brass tracking-wider">THE LAIR</h1>
            <span className={`inline-block w-2 h-2 rounded-full ${hasAnyActive ? "bg-green-500 animate-pulse" : "bg-cream/20"}`} />
          </div>

          <p className="font-label text-[10px] tracking-[0.5em] text-brass/40 uppercase">
            Central Nervous System
          </p>
        </header>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="w-16 h-16 rounded-full border border-brass/30 animate-pulse" />
              <p className="mt-6 font-label text-[10px] tracking-[0.4em] text-brass/40 uppercase">
                Connecting to the Lair...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            {CATEGORY_ORDER.map((cat) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              return (
                <CategorySection key={cat} title={CATEGORY_LABELS[cat] || cat.toUpperCase()}>
                  {items.map((c) => (
                    <ConnectorCard
                      key={c.key}
                      connector={c}
                      onToggle={() => handleToggle(c.key)}
                      testing={toggling === c.key}
                    />
                  ))}
                </CategorySection>
              );
            })}

            {/* Uncategorized integrations that don't match CATEGORY_ORDER */}
            {(() => {
              const knownCats = new Set(CATEGORY_ORDER as readonly string[]);
              const uncategorized = connectorList.filter((c) => !knownCats.has(c.category));
              if (uncategorized.length === 0) return null;
              return (
                <CategorySection title="OTHER">
                  {uncategorized.map((c) => (
                    <ConnectorCard
                      key={c.key}
                      connector={c}
                      onToggle={() => handleToggle(c.key)}
                      testing={toggling === c.key}
                    />
                  ))}
                </CategorySection>
              );
            })()}

            {/* Test result messages */}
            {Object.entries(testMessages).some(([, msg]) => msg) && (
              <div className="mt-8 space-y-2">
                {Object.entries(testMessages).map(([key, msg]) =>
                  msg ? (
                    <div key={key} className="flex items-center gap-3 font-mono text-[10px] text-cream/40">
                      <span className="text-brass/40 uppercase tracking-wider">{key}</span>
                      <span className="h-px flex-1 bg-brass/10" />
                      <span>{msg}</span>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </motion.div>
        )}

        <div className="mt-16 text-center">
          <Link href="/lobby" className="font-label text-[10px] tracking-[0.3em] text-brass/30 uppercase hover:text-brass/60 transition-colors">
            &larr; Return to Lobby
          </Link>
        </div>
      </div>
    </div>
  );
}
