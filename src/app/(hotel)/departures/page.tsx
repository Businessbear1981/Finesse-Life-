'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {useRoomData} from '@/lib/rooms';

type RecentSearchesItem = { route: string; date: string; price: string; type: DepartureConnector['category'] };


interface DepartureConnector {
  key: string;
  label: string;
  icon: string;
  color: string;
  connected: boolean;
  category: "deals" | "flights" | "hotels" | "dining";
  description: string;
  badge?: string;
}




export default function Departures() {
  // Editorial content from room_catalog, the member's own items from room_member_items (no hardcoded data).
  const {CONNECTORS, CATEGORIES, RECENT_SEARCHES} = useRoomData('departures', {CONNECTORS: [] as DepartureConnector[], CATEGORIES: [] as { key: DepartureConnector["category"]; label: string; icon: string; color: string; desc: string }[], RECENT_SEARCHES: [] as RecentSearchesItem[]}, ['RECENT_SEARCHES']);
  const [connectors, setConnectors] = useState(CONNECTORS);
  const [activeCategory, setActiveCategory] = useState<DepartureConnector["category"] | "all">("all");
  const [itinerary, setItinerary] = useState("");
  const [planning, setPlanning] = useState(false);

  const toggle = (key: string) => {
    try {
      throw new Error("offline");
    } catch {
      setConnectors((prev) => prev.map((c) => c.key === key ? { ...c, connected: !c.connected } : c));
    }
  };

  const filtered = activeCategory === "all" ? connectors : connectors.filter((c) => c.category === activeCategory);
  const connectedCount = connectors.filter((c) => c.connected).length;

  const planTrip = () => {
    if (!itinerary.trim() || planning) return;
    setPlanning(true);
    setTimeout(() => { setPlanning(false); setItinerary(""); }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{ background: "radial-gradient(ellipse at center, rgba(66,133,244,0.06) 0%, transparent 65%)" }}
        />
      </div>

      <header className="text-center pt-12 pb-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="text-4xl mb-4 inline-block">&#x1F6AB;</span>
          <h1 className="font-display text-4xl text-brass tracking-[0.2em]">departures</h1>
          <p className="font-label text-[10px] tracking-[0.5em] text-cream/20 uppercase mt-2">travel &middot; dining &middot; experiences</p>
        </motion.div>
      </header>

      <div className="max-w-3xl mx-auto px-4 mb-8 relative z-10">
        <div className="border border-brass/15 bg-ink/60 backdrop-blur-sm p-5">
          <p className="font-label text-[8px] tracking-[0.3em] text-brass/30 uppercase mb-2">plan a trip</p>
          <div className="flex gap-2">
            <input type="text" value={itinerary} onChange={(e) => setItinerary(e.target.value)} onKeyDown={(e) => e.key === "Enter" && planTrip()}
              placeholder="Miami for 4 days, June 14–18. Great food and beaches."
              className="flex-1 px-4 py-3 bg-ink border border-cream/8 text-cream font-body text-sm placeholder:text-cream/12 focus:border-brass focus:outline-none"
            />
            <button onClick={planTrip} disabled={!itinerary.trim() || planning}
              className="px-5 py-3 font-label text-[9px] tracking-[0.2em] uppercase text-ink bg-brass hover:bg-brass-highlight transition-colors disabled:opacity-20 shrink-0"
            >{planning ? "planning..." : "plan it"}</button>
          </div>
        </div>
      </div>

      {RECENT_SEARCHES.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 mb-8 relative z-10">
          <p className="font-label text-[8px] tracking-[0.3em] text-cream/15 uppercase mb-3">recent searches</p>
          <div className="flex gap-3 flex-wrap">
            {RECENT_SEARCHES.map((s, i) => {
              const cat = CATEGORIES.find((c) => c.key === s.type);
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 border border-cream/6 bg-ink/30 hover:border-cream/15 cursor-pointer transition-all">
                  <span className="text-base">{cat?.icon}</span>
                  <div>
                    <p className="font-display text-sm text-cream/70 tracking-wide">{s.route}</p>
                    <p className="font-mono text-[9px] text-cream/25">{s.date} &middot; {s.price}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 mb-6 relative z-10">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {CATEGORIES.map((cat) => (
            <motion.button key={cat.key} whileHover={{ scale: 1.02 }}
              onClick={() => setActiveCategory(activeCategory === cat.key ? "all" : cat.key)}
              className={`p-4 border text-center transition-all duration-300 ${
                activeCategory === cat.key ? "border-brass/40 bg-ink/60" : "border-cream/6 bg-ink/30 hover:border-cream/15"
              }`}
            >
              <div className="text-2xl mb-2" style={{ color: activeCategory === cat.key ? cat.color : "rgba(244,232,208,0.25)" }}>{cat.icon}</div>
              <p className="font-label text-[8px] tracking-[0.15em] uppercase text-cream/50">{cat.label}</p>
              <p className="font-label text-[6px] tracking-[0.05em] text-cream/15 mt-0.5">{cat.desc}</p>
            </motion.button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="font-label text-[8px] tracking-[0.3em] text-cream/20 uppercase">{connectedCount} connected</span>
          {activeCategory !== "all" && (
            <button onClick={() => setActiveCategory("all")} className="font-label text-[8px] tracking-[0.15em] text-brass/40 hover:text-brass/60 uppercase">show all</button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 relative z-10 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((conn, i) => {
              const catInfo = CATEGORIES.find((c) => c.key === conn.category);
              return (
                <motion.div key={conn.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}
                  onClick={() => toggle(conn.key)}
                  className={`border cursor-pointer transition-all duration-500 ${
                    conn.connected ? "border-brass/30 bg-ink/50" : "border-cream/6 bg-ink/30 hover:border-cream/15"
                  }`}
                  style={{ boxShadow: conn.connected ? `0 0 20px ${conn.color}15` : "none" }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl leading-none transition-all duration-300"
                        style={{ color: conn.connected ? conn.color : "rgba(244,232,208,0.2)", filter: conn.connected ? `drop-shadow(0 0 5px ${conn.color}60)` : "none" }}
                      >{conn.icon}</span>
                      <span className={`w-2 h-2 rounded-full mt-1 ${conn.connected ? "bg-green-500 animate-pulse" : "bg-cream/8"}`} />
                    </div>

                    <p className="font-label text-[8px] tracking-[0.15em] uppercase text-cream/60">{conn.label}</p>
                    <p className="font-body text-[10px] text-cream/30 italic mt-1 leading-tight">{conn.description}</p>

                    <div className="flex items-center justify-between mt-3">
                      {conn.badge ? (
                        <span className="font-label text-[6px] tracking-[0.1em] uppercase px-1.5 py-0.5 border text-green-400/60 border-green-500/15">{conn.badge}</span>
                      ) : (
                        <span className="font-label text-[6px] tracking-[0.1em] uppercase text-cream/10" style={{ color: catInfo ? `${catInfo.color}60` : undefined }}>
                          {catInfo?.label}
                        </span>
                      )}
                      <span className={`font-label text-[7px] uppercase ${conn.connected ? "text-green-500/50" : "text-cream/15"}`}>
                        {conn.connected ? "active" : "connect"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">return to the lobby</Link>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
