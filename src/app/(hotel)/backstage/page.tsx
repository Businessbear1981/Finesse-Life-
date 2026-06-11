'use client';

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface ConnectorInfo {
  key: string;
  name: string;
  category: string;
  icon_url: string;
  status: "active" | "connecting" | "inactive" | "error";
  configured: boolean;
  description: string;
}

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
};

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

const FALLBACK_CONNECTORS: Record<string, ConnectorInfo> = {
  claude: { key: "claude", name: "Claude", category: "ai", icon_url: "", status: "inactive", configured: false, description: "Anthropic Claude — concierge brain" },
  chatgpt: { key: "chatgpt", name: "ChatGPT", category: "ai", icon_url: "", status: "inactive", configured: false, description: "OpenAI GPT — second opinion engine" },
  grok: { key: "grok", name: "Grok", category: "ai", icon_url: "", status: "inactive", configured: false, description: "xAI Grok — real-time intelligence" },
  higgsfield: { key: "higgsfield", name: "Higgsfield", category: "media", icon_url: "", status: "inactive", configured: false, description: "AI video generation" },
  meshy: { key: "meshy", name: "Meshy", category: "media", icon_url: "", status: "inactive", configured: false, description: "3D model generation" },
  elevenlabs: { key: "elevenlabs", name: "ElevenLabs", category: "media", icon_url: "", status: "inactive", configured: false, description: "AI voice synthesis" },
  cloudinary: { key: "cloudinary", name: "Cloudinary", category: "media", icon_url: "", status: "inactive", configured: false, description: "Media asset management" },
  instagram: { key: "instagram", name: "Instagram", category: "social", icon_url: "", status: "inactive", configured: false, description: "Instagram distribution" },
  twitter: { key: "twitter", name: "Twitter / X", category: "social", icon_url: "", status: "inactive", configured: false, description: "Twitter/X distribution" },
  tiktok: { key: "tiktok", name: "TikTok", category: "social", icon_url: "", status: "inactive", configured: false, description: "TikTok distribution" },
  youtube: { key: "youtube", name: "YouTube", category: "social", icon_url: "", status: "inactive", configured: false, description: "YouTube distribution" },
  pinterest: { key: "pinterest", name: "Pinterest", category: "social", icon_url: "", status: "inactive", configured: false, description: "Pinterest distribution" },
  snapchat: { key: "snapchat", name: "Snapchat", category: "social", icon_url: "", status: "inactive", configured: false, description: "Snapchat distribution" },
  mapbox: { key: "mapbox", name: "Mapbox", category: "maps", icon_url: "", status: "inactive", configured: false, description: "Map rendering engine" },
  google_maps: { key: "google_maps", name: "Google Maps", category: "maps", icon_url: "", status: "inactive", configured: false, description: "Places & geocoding" },
  twilio: { key: "twilio", name: "Twilio", category: "comms", icon_url: "", status: "inactive", configured: false, description: "SMS & voice" },
  sendgrid: { key: "sendgrid", name: "SendGrid", category: "comms", icon_url: "", status: "inactive", configured: false, description: "Transactional email" },
  spotify: { key: "spotify", name: "Spotify", category: "music", icon_url: "", status: "inactive", configured: false, description: "Music integration" },
  stripe: { key: "stripe", name: "Stripe", category: "payments", icon_url: "", status: "inactive", configured: false, description: "Payment processing" },
  claude_code: { key: "claude_code", name: "Claude Code", category: "dev", icon_url: "", status: "inactive", configured: false, description: "AI development assistant" },
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

function ConnectorCard({ connector, onToggle }: { connector: ConnectorInfo; onToggle: () => void }) {
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

  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex flex-col items-center justify-center gap-2 w-full aspect-[6/7] rounded-sm border bg-ink/80 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:bg-oxblood/20 ${statusClass}`}
      title={connector.description}
    >
      <span className="text-3xl leading-none select-none">{icon}</span>
      <span className="font-label text-[9px] tracking-[0.2em] text-cream/80 uppercase text-center px-1 leading-tight">
        {connector.name}
      </span>
      <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${statusDotColor} ${connector.status === "active" || connector.status === "connecting" ? "animate-pulse" : ""}`} />
    </motion.button>
  );
}

export default function Backstage() {
  const [connectors, setConnectors] = useState<Record<string, ConnectorInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    try {
      throw new Error("no backend");
    } catch {
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
    try {
      throw new Error("no backend");
    } catch {
      setConnectors((prev) => {
        if (!prev) return prev;
        const c = prev[key];
        if (!c) return prev;
        return { ...prev, [key]: { ...c, status: c.status === "active" ? "inactive" : "active" } };
      });
    } finally {
      setToggling(null);
    }
  };

  const connectorList = connectors ? Object.values(connectors) : [];
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
                    <ConnectorCard key={c.key} connector={c} onToggle={() => handleToggle(c.key)} />
                  ))}
                </CategorySection>
              );
            })}
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
