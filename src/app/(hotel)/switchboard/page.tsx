'use client';

// The Switchboard — honest patch bay. A network is "connected" only when a real OAuth token is stored (sealed with
// INTEGRATIONS_ENCRYPTION_KEY); no OAuth app is configured yet, so each network shows "Connect with OAuth — coming
// soon" and broadcast stays off until a network that supports posting is genuinely linked.
// GET /api/switchboard/accounts · DELETE …?platform= (disconnect) · GET/POST /api/switchboard/broadcast.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { roomCall } from "@/lib/room-client";

type Account = { platform: string; label: string; connected: boolean; canBroadcast: boolean; username: string | null; connectedAt: string | null; oauth: 'coming_soon' };
type Broadcast = { id: string; platforms: string[]; content: string; status: string; created_at: string };
type Mode = 'loading' | 'live' | 'signed_out' | 'closed' | 'error';

const LOOK: Record<string, { icon: string; color: string }> = {
  instagram: { icon: "◎", color: "#E1306C" },
  twitter: { icon: "✕", color: "#F4E8D0" },
  tiktok: { icon: "♪", color: "#69C9D0" },
  snapchat: { icon: "👻", color: "#FFFC00" },
  pinterest: { icon: "📌", color: "#E60023" },
  youtube: { icon: "▷", color: "#FF0000" },
};
const SIGNED_OUT: Account[] = Object.keys(LOOK).map((platform) => ({
  platform, label: { instagram: 'Instagram', twitter: 'X / Twitter', tiktok: 'TikTok', snapchat: 'Snapchat', pinterest: 'Pinterest', youtube: 'YouTube' }[platform] ?? platform,
  connected: false, canBroadcast: false, username: null, connectedAt: null, oauth: 'coming_soon',
}));

export default function Switchboard() {
  const [mode, setMode] = useState<Mode>('loading');
  const [accounts, setAccounts] = useState<Account[]>(SIGNED_OUT);
  const [log, setLog] = useState<Broadcast[]>([]);
  const [compose, setCompose] = useState("");
  const [pick, setPick] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      roomCall<{ accounts?: Account[] }>('/api/switchboard/accounts'),
      roomCall<{ broadcasts?: Broadcast[] }>('/api/switchboard/broadcast'),
    ]);
    if (a.ok) {
      setAccounts(a.body.accounts ?? []);
      setLog(b.ok ? b.body.broadcasts ?? [] : []);
      setMode('live');
    } else setMode(a.status === 401 ? 'signed_out' : a.status === 503 ? 'closed' : 'error');
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the awaited fetch
  useEffect(() => { void load(); }, [load]);

  const postable = accounts.filter((a) => a.canBroadcast);
  const canBroadcast = mode === 'live' && postable.length > 0;
  const targets = pick.filter((p) => postable.some((a) => a.platform === p));

  const disconnect = async (a: Account) => {
    setMsg(null);
    const r = await roomCall(`/api/switchboard/accounts?platform=${a.platform}`, { method: 'DELETE' });
    setMsg(r.ok ? `${a.label} disconnected. Its token was removed.` : 'Nothing was changed.');
    void load();
  };

  const broadcast = async () => {
    if (!compose.trim() || !targets.length || sending) return;
    setSending(true); setMsg(null);
    const r = await roomCall<{ status?: string; message?: string; results?: Record<string, { status: string; message?: string }> }>('/api/switchboard/broadcast', {
      method: 'POST', json: { content: compose.trim(), platforms: targets },
    });
    setSending(false);
    if (r.ok) {
      setMsg(r.body.status === 'sent' ? 'Sent.' : r.body.status === 'partial' ? 'Sent to some networks — see the log.' : 'Nothing was posted — see the log.');
      if (r.body.status !== 'failed') setCompose('');
      void load();
    } else setMsg(r.body.message ?? 'Nothing was sent.');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] max-w-full h-[400px]" style={{ background: "radial-gradient(ellipse at center, rgba(255,169,107,0.12) 0%, transparent 70%)" }} />

      <header className="text-center pt-12 pb-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="text-4xl mb-4 inline-block" aria-hidden="true">&#x1F4DE;</span>
          <h1 className="font-display text-4xl text-lamp tracking-[0.2em]">the switchboard</h1>
          <p className="font-label text-[10px] tracking-[0.5em] text-cream/40 uppercase mt-2">communications</p>
        </motion.div>
      </header>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        {mode === 'error' && (
          <div role="alert" className="mb-6 border border-neon-pink/40 p-4 text-center">
            <p className="font-body text-sm text-cream/80">The switchboard did not answer. Nothing was changed.</p>
            <button type="button" onClick={() => { setMode('loading'); void load(); }} className="mt-2 min-h-11 font-label text-[10px] uppercase tracking-[0.3em] text-lamp">Try again</button>
          </div>
        )}
        {mode === 'closed' && <p className="mb-6 border border-brass/15 p-4 text-center font-body text-sm italic text-cream/70">The switchboard opens once this room is fitted out.</p>}

        <div className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-lamp/20" />
            <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/60 uppercase">patch bay</h2>
            <div className="h-px flex-1 bg-lamp/20" />
          </div>
          <p className="mb-4 text-center font-label text-[9px] uppercase tracking-[0.35em] text-cream/50">
            {mode === 'signed_out' ? 'Sign in to manage your networks' : 'A network is connected only through its own OAuth sign-in · coming soon'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {accounts.map((a, i) => {
              const look = LOOK[a.platform] ?? { icon: '•', color: '#F4E8D0' };
              return (
                <motion.div key={a.platform} initial={{ opacity: 0, y: 10 }} animate={{ opacity: mode === 'loading' ? 0.4 : 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className={`flex flex-col items-center gap-2 p-4 border ${a.connected ? "border-lamp/50 bg-lamp/5" : "border-cream/10 bg-ink/40"}`}>
                  <span className="text-2xl leading-none" aria-hidden="true" style={{ color: a.connected ? look.color : "rgba(244,232,208,0.3)" }}>{look.icon}</span>
                  <span className="font-label text-[9px] tracking-[0.2em] uppercase text-cream/70">{a.label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${a.connected ? "bg-lamp" : "bg-cream/15"}`} aria-hidden="true" />
                  {a.connected ? (
                    <>
                      <span className="font-label text-[8px] tracking-[0.15em] uppercase text-lamp/80">connected{a.username ? ` · @${a.username}` : ''}</span>
                      <button type="button" onClick={() => disconnect(a)} className="min-h-9 px-2 font-label text-[8px] tracking-[0.2em] uppercase text-cream/50 hover:text-neon-pink">Disconnect</button>
                    </>
                  ) : (
                    <button type="button" disabled aria-disabled="true" className="min-h-9 px-2 text-center font-label text-[8px] tracking-[0.15em] uppercase text-cream/45 cursor-not-allowed">
                      Connect with OAuth — coming soon
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px flex-1 bg-lamp/20" />
            <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/60 uppercase">broadcast</h2>
            <div className="h-px flex-1 bg-lamp/20" />
          </div>

          <div className="brass-border bg-ink/60 backdrop-blur-sm p-5">
            {canBroadcast && (
              <div className="flex gap-2 mb-3 flex-wrap" role="group" aria-label="Send to">
                {postable.map((a) => {
                  const on = pick.includes(a.platform);
                  return (
                    <button key={a.platform} type="button" aria-pressed={on} onClick={() => setPick((p) => (on ? p.filter((x) => x !== a.platform) : [...p, a.platform]))}
                      className="min-h-9 px-2 py-0.5 text-[9px] font-label tracking-[0.15em] uppercase border" style={{ color: LOOK[a.platform]?.color, borderColor: on ? LOOK[a.platform]?.color : 'rgba(244,232,208,0.15)' }}>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            )}
            <label htmlFor="sb-compose" className="sr-only">Message</label>
            <textarea id="sb-compose" value={compose} onChange={(e) => setCompose(e.target.value.slice(0, 280))} disabled={!canBroadcast} rows={3}
              placeholder={canBroadcast ? "write your message..." : "Broadcast opens once a network is connected through its OAuth sign-in."}
              className="w-full bg-transparent text-cream font-body text-sm placeholder:text-cream/40 focus:outline-none resize-none disabled:opacity-60" />
            <div className="flex items-center justify-between mt-3">
              <span className="font-mono text-[10px] text-cream/40">{compose.length} / 280</span>
              <button onClick={broadcast} disabled={!canBroadcast || !compose.trim() || !targets.length || sending}
                className="min-h-11 px-6 py-2 font-label text-[10px] tracking-[0.3em] uppercase text-ink bg-lamp hover:bg-lamp/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                {sending ? "patching..." : "broadcast"}
              </button>
            </div>
          </div>
          {msg && <p role="status" className="mt-3 text-center font-body text-sm italic text-cream/70">{msg}</p>}
          {mode === 'signed_out' && (
            <p className="mt-3 text-center"><Link href="/login" className="inline-block min-h-11 py-3 font-label text-[10px] uppercase tracking-[0.3em] text-lamp">Sign in</Link></p>
          )}
        </motion.div>

        {mode === 'live' && (
          <div className="mb-12">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-4 w-full mb-4 min-h-11" aria-expanded={showHistory}>
              <div className="h-px flex-1 bg-lamp/20" />
              <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/60 uppercase">{showHistory ? "hide log" : "show log"} ({log.length})</h2>
              <div className="h-px flex-1 bg-lamp/20" />
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden space-y-3">
                  {log.length === 0 ? (
                    <p className="font-body text-sm text-cream/50 italic text-center py-6">no broadcasts yet</p>
                  ) : log.map((b) => (
                    <div key={b.id} className="flex items-start gap-4 px-4 py-3 border border-cream/5 bg-ink/40">
                      <span className="font-mono text-[10px] text-cream/40 whitespace-nowrap mt-0.5">{new Date(b.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-label text-[9px] tracking-[0.2em] text-lamp/60 uppercase mb-1">{(b.platforms ?? []).join(', ')}</p>
                        <p className="font-body text-sm text-cream/70 italic truncate">{b.content}</p>
                      </div>
                      <span className={`font-label text-[8px] tracking-[0.2em] uppercase ${b.status === "sent" ? "text-green-500/70" : b.status === "failed" ? "text-red-500/70" : "text-brass/60"}`}>{b.status}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/40 hover:text-brass transition-colors">return to the lobby</Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
