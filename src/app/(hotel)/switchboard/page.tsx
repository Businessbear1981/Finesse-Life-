'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Cable {
  key: string;
  label: string;
  icon: string;
  color: string;
  connected: boolean;
}

const CABLES: Cable[] = [
  { key: "instagram", label: "Instagram", icon: "◎", color: "#E1306C", connected: false },
  { key: "twitter", label: "X / Twitter", icon: "✕", color: "#F4E8D0", connected: false },
  { key: "tiktok", label: "TikTok", icon: "♪", color: "#69C9D0", connected: false },
  { key: "snapchat", label: "Snapchat", icon: "👻", color: "#FFFC00", connected: false },
  { key: "pinterest", label: "Pinterest", icon: "📌", color: "#E60023", connected: false },
  { key: "youtube", label: "YouTube", icon: "▷", color: "#FF0000", connected: false },
];

interface MessageEntry {
  id: string;
  platform: string;
  text: string;
  timestamp: string;
  status: "sent" | "draft" | "failed";
}

const DEMO_MESSAGES: MessageEntry[] = [
  { id: "1", platform: "instagram", text: "New season starts tonight.", timestamp: "11:42 PM", status: "sent" },
  { id: "2", platform: "twitter", text: "The long night awaits.", timestamp: "11:38 PM", status: "sent" },
  { id: "3", platform: "tiktok", text: "Behind the scenes at the lounge.", timestamp: "10:15 PM", status: "draft" },
];

export default function Switchboard() {
  const [cables, setCables] = useState(CABLES);
  const [compose, setCompose] = useState("");
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const connectedPlatforms = cables.filter((c) => c.connected);
  const hasConnected = connectedPlatforms.length > 0;

  const toggleCable = (key: string) => {
    setCables((prev) => prev.map((c) => (c.key === key ? { ...c, connected: !c.connected } : c)));
  };

  const broadcast = async () => {
    if (!compose.trim() || !hasConnected || sending) return;
    setSending(true);

    const newMsg: MessageEntry = {
      id: crypto.randomUUID(),
      platform: connectedPlatforms.map((c) => c.key).join(", "),
      text: compose,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      status: "sent",
    };

    setMessages((prev) => [newMsg, ...prev]);
    setCompose("");
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,169,107,0.12) 0%, transparent 70%)" }}
      />

      <header className="text-center pt-12 pb-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="text-4xl mb-4 inline-block">&#x1F4DE;</span>
          <h1 className="font-display text-4xl text-lamp tracking-[0.2em]">the switchboard</h1>
          <p className="font-label text-[10px] tracking-[0.5em] text-cream/20 uppercase mt-2">
            communications
          </p>
        </motion.div>
      </header>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-lamp/20" />
            <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/50 uppercase">patch bay</h2>
            <div className="h-px flex-1 bg-lamp/20" />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {cables.map((cable, i) => (
              <motion.button
                key={cable.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                onClick={() => toggleCable(cable.key)}
                className={`flex flex-col items-center gap-2 p-4 border transition-all duration-500 ${
                  cable.connected ? "border-lamp/50 bg-lamp/5" : "border-cream/8 bg-ink/40 hover:border-cream/20"
                }`}
              >
                <span className="text-2xl leading-none" style={{ color: cable.connected ? cable.color : "rgba(244,232,208,0.2)" }}>
                  {cable.icon}
                </span>
                <span className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/50">{cable.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${cable.connected ? "bg-green-500 animate-pulse" : "bg-cream/15"}`} />
              </motion.button>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px flex-1 bg-lamp/20" />
            <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/50 uppercase">broadcast</h2>
            <div className="h-px flex-1 bg-lamp/20" />
          </div>

          <div className="brass-border bg-ink/60 backdrop-blur-sm p-5">
            {hasConnected && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {connectedPlatforms.map((c) => (
                  <span key={c.key} className="px-2 py-0.5 text-[9px] font-label tracking-[0.15em] uppercase border"
                    style={{ color: c.color, borderColor: `${c.color}40` }}
                  >{c.label}</span>
                ))}
              </div>
            )}

            <textarea
              value={compose}
              onChange={(e) => setCompose(e.target.value)}
              placeholder={hasConnected ? "write your message..." : "connect a cable above to begin..."}
              disabled={!hasConnected}
              rows={3}
              className="w-full bg-transparent text-cream font-body text-sm placeholder:text-cream/15 focus:outline-none resize-none disabled:opacity-30"
            />

            <div className="flex items-center justify-between mt-3">
              <span className="font-mono text-[10px] text-cream/20">{compose.length} / 280</span>
              <button
                onClick={broadcast}
                disabled={!hasConnected || !compose.trim() || sending}
                className="px-6 py-2 font-label text-[10px] tracking-[0.3em] uppercase text-ink bg-lamp hover:bg-lamp/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                {sending ? "patching..." : "broadcast"}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="mb-12">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-4 w-full mb-4">
            <div className="h-px flex-1 bg-lamp/20" />
            <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/50 uppercase">
              {showHistory ? "hide log" : "show log"} ({messages.length})
            </h2>
            <div className="h-px flex-1 bg-lamp/20" />
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                className="overflow-hidden space-y-3"
              >
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-4 px-4 py-3 border border-cream/5 bg-ink/40">
                    <span className="font-mono text-[10px] text-cream/20 whitespace-nowrap mt-0.5">{msg.timestamp}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-label text-[9px] tracking-[0.2em] text-lamp/50 uppercase mb-1">{msg.platform}</p>
                      <p className="font-body text-sm text-cream/60 italic truncate">{msg.text}</p>
                    </div>
                    <span className={`font-label text-[8px] tracking-[0.2em] uppercase ${
                      msg.status === "sent" ? "text-green-500/60" : msg.status === "draft" ? "text-brass/40" : "text-red-500/60"
                    }`}>{msg.status}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">
          return to the lobby
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
