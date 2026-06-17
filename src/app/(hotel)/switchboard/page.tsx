'use client';

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Cable {
  key: string;
  label: string;
  icon: string;
  color: string;
  connected: boolean;
}

const CABLE_DEFS: Omit<Cable, 'connected'>[] = [
  { key: "instagram", label: "Instagram", icon: "◎", color: "#E1306C" },
  { key: "twitter", label: "X / Twitter", icon: "✕", color: "#F4E8D0" },
  { key: "tiktok", label: "TikTok", icon: "♪", color: "#69C9D0" },
  { key: "snapchat", label: "Snapchat", icon: "👻", color: "#FFFC00" },
  { key: "pinterest", label: "Pinterest", icon: "📌", color: "#E60023" },
  { key: "youtube", label: "YouTube", icon: "▷", color: "#FF0000" },
];

interface MessageEntry {
  id: string;
  platform: string;
  text: string;
  timestamp: string;
  status: "sent" | "draft" | "failed";
}

export default function Switchboard() {
  const [cables, setCables] = useState<Cable[]>(
    CABLE_DEFS.map((d) => ({ ...d, connected: false }))
  );
  const [compose, setCompose] = useState("");
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const connectedPlatforms = cables.filter((c) => c.connected);
  const hasConnected = connectedPlatforms.length > 0;

  // Load connected accounts from DB on mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        const [accountsRes, broadcastsRes] = await Promise.all([
          fetch('/api/switchboard/accounts'),
          fetch('/api/switchboard/broadcast'),
        ]);
        if (accountsRes.ok) {
          const { accounts } = await accountsRes.json();
          if (Array.isArray(accounts) && accounts.length > 0) {
            const connectedKeys = new Set(
              accounts.filter((a: { connected: boolean }) => a.connected).map((a: { platform: string }) => a.platform)
            );
            setCables(CABLE_DEFS.map((d) => ({ ...d, connected: connectedKeys.has(d.key) })));
          }
        }
        if (broadcastsRes.ok) {
          const { broadcasts } = await broadcastsRes.json();
          if (Array.isArray(broadcasts)) {
            setMessages(broadcasts.map((b: {
              id: string;
              platforms: string[];
              content: string;
              created_at: string;
              status: string;
            }) => ({
              id: b.id,
              platform: (b.platforms ?? []).join(', '),
              text: b.content,
              timestamp: new Date(b.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              status: (b.status as MessageEntry['status']) ?? 'sent',
            })));
          }
        }
      } catch {
        // silently use defaults
      } finally {
        setLoadingAccounts(false);
      }
    }
    loadAccounts();
  }, []);

  const toggleCable = useCallback(async (key: string) => {
    const cable = cables.find((c) => c.key === key);
    if (!cable) return;
    const newConnected = !cable.connected;
    // Optimistic update
    setCables((prev) => prev.map((c) => (c.key === key ? { ...c, connected: newConnected } : c)));
    try {
      await fetch('/api/switchboard/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: key, connected: newConnected }),
      });
    } catch {
      // Revert on failure
      setCables((prev) => prev.map((c) => (c.key === key ? { ...c, connected: !newConnected } : c)));
    }
  }, [cables]);

  const broadcast = async () => {
    if (!compose.trim() || !hasConnected || sending) return;
    setSending(true);

    const platforms = connectedPlatforms.map((c) => c.key);
    const text = compose;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Optimistic entry
    const tempId = crypto.randomUUID();
    const optimistic: MessageEntry = {
      id: tempId,
      platform: platforms.join(', '),
      text,
      timestamp,
      status: 'sent',
    };
    setMessages((prev) => [optimistic, ...prev]);
    setCompose('');

    try {
      const res = await fetch('/api/switchboard/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, platforms }),
      });
      if (res.ok) {
        const { id, status } = await res.json();
        // Replace temp entry with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id, status } : m))
        );
      } else {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
    } finally {
      setSending(false);
    }
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
                animate={{ opacity: loadingAccounts ? 0.4 : 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                onClick={() => toggleCable(cable.key)}
                disabled={loadingAccounts}
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
                {messages.length === 0 ? (
                  <p className="font-body text-sm text-cream/20 italic text-center py-6">no broadcasts yet</p>
                ) : messages.map((msg) => (
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
