'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface SportEvent {
  id: string;
  league: string;
  matchup: string;
  time: string;
  status: "live" | "upcoming" | "final";
  score?: string;
}

interface FantasyPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  points: number;
  projection: number;
}

interface KalshiMarket {
  id: string;
  question: string;
  category: string;
  yes_price: number;
  volume: string;
  closes: string;
}

interface TeeTime {
  id: string;
  course: string;
  time: string;
  spots: number;
  price_cents: number;
}

const DEMO_EVENTS: SportEvent[] = [
  { id: "1", league: "NBA", matchup: "Lakers vs Celtics", time: "9:30 PM", status: "live", score: "98 - 102" },
  { id: "2", league: "NFL", matchup: "Cowboys vs Eagles", time: "8:15 PM", status: "live", score: "17 - 21" },
  { id: "3", league: "MLB", matchup: "Yankees vs Dodgers", time: "Tomorrow 7PM", status: "upcoming" },
  { id: "4", league: "UFC", matchup: "Main Card", time: "Saturday 10PM", status: "upcoming" },
  { id: "5", league: "NBA", matchup: "Warriors vs Heat", time: "Yesterday", status: "final", score: "112 - 108" },
];

const DEMO_FANTASY: FantasyPlayer[] = [
  { id: "f1", name: "Jalen Hurts", position: "QB", team: "PHI", points: 24.8, projection: 22.5 },
  { id: "f2", name: "Saquon Barkley", position: "RB", team: "PHI", points: 18.2, projection: 16.0 },
  { id: "f3", name: "Ja'Marr Chase", position: "WR", team: "CIN", points: 22.4, projection: 18.8 },
  { id: "f4", name: "Travis Kelce", position: "TE", team: "KC", points: 14.6, projection: 12.0 },
  { id: "f5", name: "Amon-Ra St. Brown", position: "WR", team: "DET", points: 16.8, projection: 15.2 },
];

const DEMO_KALSHI: KalshiMarket[] = [
  { id: "k1", question: "Will Bitcoin close above $120K this week?", category: "crypto", yes_price: 62, volume: "$1.2M", closes: "May 4" },
  { id: "k2", question: "Lakers win NBA Finals?", category: "sports", yes_price: 18, volume: "$840K", closes: "Jun 20" },
  { id: "k3", question: "Fed cuts rates in June?", category: "economics", yes_price: 45, volume: "$3.1M", closes: "Jun 15" },
  { id: "k4", question: "Kendrick drops an album in May?", category: "culture", yes_price: 8, volume: "$220K", closes: "May 31" },
  { id: "k5", question: "Tesla stock above $300 by Friday?", category: "stocks", yes_price: 34, volume: "$680K", closes: "May 3" },
];

const DEMO_TEE_TIMES: TeeTime[] = [
  { id: "t1", course: "Austin Country Club", time: "7:30 AM Saturday", spots: 3, price_cents: 18500 },
  { id: "t2", course: "Barton Creek Lakeside", time: "9:00 AM Sunday", spots: 2, price_cents: 22000 },
  { id: "t3", course: "Avery Ranch Golf Club", time: "6:45 AM Saturday", spots: 4, price_cents: 8500 },
];

const STATUS_COLORS = {
  live: { label: "LIVE", color: "#FF4D7D", pulse: true },
  upcoming: { label: "UPCOMING", color: "#C9A961", pulse: false },
  final: { label: "FINAL", color: "rgba(244,232,208,0.2)", pulse: false },
};

const TABS = ["scores", "fantasy", "markets", "golf"] as const;

export default function Clubhouse() {
  const [tab, setTab] = useState<typeof TABS[number]>("scores");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{ background: "radial-gradient(ellipse at center, rgba(0,255,136,0.04) 0%, transparent 65%)" }}
        />
      </div>

      <header className="text-center pt-12 pb-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="text-4xl mb-4 inline-block">&#x1F3C6;</span>
          <h1 className="font-display text-4xl text-brass tracking-[0.2em]">the clubhouse</h1>
          <p className="font-label text-[10px] tracking-[0.5em] text-cream/20 uppercase mt-2">
            sports &middot; fantasy &middot; markets &middot; golf
          </p>
        </motion.div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mb-8 relative z-10">
        <div className="flex justify-center gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-[10px] font-label tracking-[0.2em] uppercase transition-all duration-300 ${
                tab === t ? "text-ink bg-brass" : "text-cream/25 border border-cream/8 hover:border-brass/30"
              }`}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10 pb-12">
        <AnimatePresence mode="wait">
          {tab === "scores" && (
            <motion.div key="scores" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="space-y-3">
                {DEMO_EVENTS.map((ev, i) => {
                  const sc = STATUS_COLORS[ev.status];
                  return (
                    <motion.div key={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="p-4 border border-cream/6 bg-ink/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-label text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 border"
                          style={{ color: sc.color, borderColor: `${sc.color}30` }}
                        >{ev.league}</span>
                        <div>
                          <p className="font-display text-base text-cream/80 tracking-wide">{ev.matchup}</p>
                          <p className="font-mono text-[10px] text-cream/25 mt-0.5">{ev.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {ev.score && <span className="font-mono text-lg text-brass">{ev.score}</span>}
                        <span className={`w-2 h-2 rounded-full ${sc.pulse ? "animate-pulse" : ""}`}
                          style={{ background: sc.color, boxShadow: sc.pulse ? `0 0 6px ${sc.color}60` : "none" }}
                        />
                        <span className="font-label text-[7px] tracking-[0.15em] uppercase" style={{ color: sc.color }}>{sc.label}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === "fantasy" && (
            <motion.div key="fantasy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-brass/20" />
                <span className="font-label text-[9px] tracking-[0.4em] text-brass/40 uppercase">my roster</span>
                <div className="h-px flex-1 bg-brass/20" />
              </div>
              <div className="space-y-2">
                {DEMO_FANTASY.map((player, i) => {
                  const beating = player.points > player.projection;
                  return (
                    <motion.div key={player.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="p-4 border border-cream/6 bg-ink/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-[10px] text-brass/40 w-6">{player.position}</span>
                        <div>
                          <p className="font-display text-base text-cream/80 tracking-wide">{player.name}</p>
                          <p className="font-label text-[8px] tracking-[0.15em] text-cream/20 uppercase">{player.team}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-mono text-lg ${beating ? "text-green-500" : "text-neon-pink/60"}`}>{player.points}</p>
                          <p className="font-mono text-[9px] text-cream/20">proj: {player.projection}</p>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${beating ? "bg-green-500" : "bg-neon-pink/40"}`}
                          style={{ boxShadow: beating ? "0 0 6px #00FF8860" : "none" }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-4 text-center">
                <p className="font-mono text-sm text-brass">Total: {DEMO_FANTASY.reduce((s, p) => s + p.points, 0).toFixed(1)} pts</p>
              </div>
            </motion.div>
          )}

          {tab === "markets" && (
            <motion.div key="markets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-brass/20" />
                <span className="font-label text-[9px] tracking-[0.4em] text-brass/40 uppercase">prediction markets</span>
                <div className="h-px flex-1 bg-brass/20" />
              </div>
              <div className="space-y-3">
                {DEMO_KALSHI.map((market, i) => (
                  <motion.div key={market.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-5 border border-cream/6 bg-ink/40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="font-label text-[7px] tracking-[0.15em] uppercase text-brass/40 px-1.5 py-0.5 border border-brass/10 mr-2">
                          {market.category}
                        </span>
                        <p className="font-display text-base text-cream/80 tracking-wide mt-2">{market.question}</p>
                        <p className="font-mono text-[9px] text-cream/20 mt-1">Vol: {market.volume} &middot; Closes {market.closes}</p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="font-mono text-2xl text-brass">{market.yes_price}¢</p>
                        <p className="font-label text-[7px] tracking-[0.15em] text-cream/20 uppercase">yes</p>
                        <div className="flex gap-2 mt-2">
                          <button className="px-3 py-1 text-[8px] font-label tracking-[0.1em] uppercase text-green-500/60 border border-green-500/20 hover:border-green-500/40 transition-colors">
                            buy yes
                          </button>
                          <button className="px-3 py-1 text-[8px] font-label tracking-[0.1em] uppercase text-neon-pink/60 border border-neon-pink/20 hover:border-neon-pink/40 transition-colors">
                            buy no
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === "golf" && (
            <motion.div key="golf" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-brass/20" />
                <span className="font-label text-[9px] tracking-[0.4em] text-brass/40 uppercase">tee times</span>
                <div className="h-px flex-1 bg-brass/20" />
              </div>
              <div className="space-y-3">
                {DEMO_TEE_TIMES.map((tee, i) => (
                  <motion.div key={tee.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-5 border border-cream/6 bg-ink/40 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-display text-lg text-cream/80 tracking-wide">{tee.course}</p>
                      <p className="font-mono text-[10px] text-cream/25 mt-1">{tee.time} &middot; {tee.spots} spots open</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg text-brass">${(tee.price_cents / 100).toFixed(0)}</p>
                      <button className="mt-1 px-4 py-1.5 text-[8px] font-label tracking-[0.2em] uppercase text-ink bg-brass hover:bg-brass-highlight transition-colors">
                        book
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">return to the lobby</Link>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
