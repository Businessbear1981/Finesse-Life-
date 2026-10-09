'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'crew' | 'find' | 'invite';
type Edition = 'finesse' | 'carpe_diem';

interface EntourageMember {
  id: string;
  display_name: string;
  username: string;
  vibe: string;
  city: string;
  avatar_url: string | null;
  backstage_unlocked: boolean;
}

interface SearchResult {
  found: boolean;
  display_name?: string;
  gender?: string;
  vibe?: string;
  city?: string;
}

const VIBE_CHIPS = ['electric', 'luxe', 'mysterious', 'playful', 'intimate', 'untamed'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const VIBE_COLORS: Record<string, string> = {
  electric: '#FFD700',
  luxe: '#C9A961',
  mysterious: '#9B59B6',
  playful: '#FF4D7D',
  intimate: '#FF8FA3',
  untamed: '#69C9D0',
};

function vibeColor(vibe: string, edition: Edition): string {
  if (VIBE_COLORS[vibe]) return VIBE_COLORS[vibe];
  return edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';
}

// ── Avatar ───────────────────────────────────────────────────────────────────

function MemberAvatar({ member }: { member: EntourageMember }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, #1A0A0D, #2A1020)',
        border: '1px solid rgba(201,169,97,0.3)',
      }}
    >
      {member.avatar_url ? (
        <img
          src={member.avatar_url}
          alt={member.display_name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span className="font-display text-lg" style={{ color: '#C9A961' }}>
          {member.display_name[0]}
        </span>
      )}
    </div>
  );
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({ member, edition }: { member: EntourageMember; edition: Edition }) {
  const accent = edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-4 border border-cream/8 bg-ink/50 hover:border-brass/30 transition-colors duration-300"
    >
      <MemberAvatar member={member} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-base text-cream/90 truncate">{member.display_name}</span>
          {member.backstage_unlocked && (
            <span
              className="font-label text-[8px] tracking-[0.2em] uppercase px-1.5 py-0.5 border flex items-center gap-1"
              style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}
            >
              ✦ Backstage
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {member.username && (
            <span className="font-label text-[9px] tracking-[0.15em] text-cream/30">@{member.username}</span>
          )}
          {member.username && member.city && <span className="text-cream/15 text-[8px]">·</span>}
          {member.city && (
            <span className="font-label text-[9px] tracking-[0.1em] text-cream/25">{member.city}</span>
          )}
        </div>
        {member.vibe && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="font-label text-[7px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full border"
              style={{
                color: vibeColor(member.vibe, edition),
                borderColor: `${vibeColor(member.vibe, edition)}35`,
                background: `${vibeColor(member.vibe, edition)}10`,
              }}
            >
              {member.vibe}
            </span>
          </div>
        )}
      </div>

      <Link
        href={member.username ? `/profile?u=${encodeURIComponent(member.username)}` : '/profile'}
        className="font-label text-[8px] tracking-[0.25em] uppercase text-cream/30 hover:text-brass transition-colors whitespace-nowrap px-3 py-2 border border-cream/8 hover:border-brass/30"
      >
        View
      </Link>
    </motion.div>
  );
}

// ── Tab: Members ─────────────────────────────────────────────────────────────
// There is no connections table yet, so this lists other members of the house —
// it is not a personal crew and must not be labelled as one.

function CrewTab({ edition, goToFind }: { edition: Edition; goToFind: () => void }) {
  const [crew, setCrew] = useState<EntourageMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function fetchCrew() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        let q = supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, city, vibe')
          .limit(20);
        if (user?.id) q = q.neq('id', user.id);
        const { data, error } = await q;
        if (error) throw error;
        const mapped: EntourageMember[] = (data ?? []).map((p: {
          id: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
          city: string | null;
          vibe: string | null;
        }) => ({
          id: p.id,
          display_name: p.display_name || p.username || 'Member',
          username: p.username ?? '',
          vibe: p.vibe ?? '',
          city: p.city ?? '',
          avatar_url: p.avatar_url,
          backstage_unlocked: false,
        }));
        setCrew(mapped);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCrew();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 border border-cream/8 bg-ink/50"
            style={{ opacity: 0.4 - i * 0.1 }}
          >
            <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: 'rgba(201,169,97,0.08)', animation: 'pulse 1.6s infinite' }} />
            <div className="flex-1">
              <div className="h-3 w-28 rounded mb-2" style={{ background: 'rgba(244,232,208,0.1)', animation: 'pulse 1.6s infinite' }} />
              <div className="h-2 w-16 rounded" style={{ background: 'rgba(244,232,208,0.06)', animation: 'pulse 1.6s infinite' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {crew.length > 0 && (
        <p className="font-label text-[9px] tracking-[0.35em] text-brass/50 uppercase mb-4">
          Members of the house · personal crews coming soon
        </p>
      )}

      {crew.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-display text-lg text-cream/30 italic mb-3">
            {loadError ? "We couldn't load members just now." : 'No other members to show yet.'}
          </p>
          <p className="font-body text-sm text-cream/20 mb-6">
            {loadError ? 'Try again in a moment, or search by username.' : 'Search by username, or invite someone in.'}
          </p>
          <button
            onClick={goToFind}
            className="font-label text-[9px] tracking-[0.3em] uppercase text-brass border border-brass/30 px-6 py-3 hover:bg-brass/10 transition-colors"
          >
            Find Members
          </button>
        </div>
      ) : (
        crew.map((member) => (
          <MemberCard key={member.id} member={member} edition={edition} />
        ))
      )}
    </div>
  );
}

// ── Tab: Find ────────────────────────────────────────────────────────────────

function FindTab({ edition }: { edition: Edition }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/member?username=${encodeURIComponent(q)}`);
      const data: SearchResult = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  return (
    <div className="space-y-5">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="search by name or vibe..."
          className="w-full px-4 py-3 bg-ink border border-cream/12 text-cream font-body text-sm placeholder:text-cream/20 focus:border-brass focus:outline-none transition-colors"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label text-[8px] tracking-[0.2em] text-brass/50 uppercase">
            searching
          </span>
        )}
      </div>

      {/* Vibe filter chips */}
      <div className="flex flex-wrap gap-2">
        {VIBE_CHIPS.map((vibe) => {
          const active = activeVibe === vibe;
          const color = vibeColor(vibe, edition);
          return (
            <button
              key={vibe}
              onClick={() => {
                setActiveVibe(active ? null : vibe);
                setQuery(active ? '' : vibe);
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => search(active ? '' : vibe), 400);
              }}
              className="font-label text-[8px] tracking-[0.2em] uppercase px-3 py-1.5 border transition-all duration-200"
              style={{
                color: active ? '#0A0406' : color,
                borderColor: active ? color : `${color}40`,
                background: active ? color : `${color}10`,
              }}
            >
              {vibe}
            </button>
          );
        })}
      </div>

      {/* Search result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.found ? 'found' : 'notfound'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {result.found && result.display_name ? (
              <div className="p-4 border border-cream/10 bg-ink/50 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #1A0A0D, #2A1020)',
                    border: '1px solid rgba(201,169,97,0.3)',
                  }}
                >
                  <span className="font-display text-lg" style={{ color: '#C9A961' }}>
                    {result.display_name[0]}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="font-display text-base text-cream/90">{result.display_name}</span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {result.vibe && (
                      <span
                        className="font-label text-[7px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full border"
                        style={{
                          color: vibeColor(result.vibe, edition),
                          borderColor: `${vibeColor(result.vibe, edition)}35`,
                          background: `${vibeColor(result.vibe, edition)}10`,
                        }}
                      >
                        {result.vibe}
                      </span>
                    )}
                    {result.city && (
                      <span className="font-label text-[9px] tracking-[0.1em] text-cream/25">{result.city}</span>
                    )}
                  </div>
                </div>

                {/* No connection requests exist yet — never claim one was sent. */}
                <span
                  className="font-label text-[8px] tracking-[0.25em] uppercase px-4 py-2 border whitespace-nowrap"
                  style={{ color: 'rgba(244,232,208,0.35)', borderColor: 'rgba(244,232,208,0.12)' }}
                >
                  Connect · soon
                </span>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="font-display text-base text-cream/30 italic mb-2">No member found.</p>
                <p className="font-label text-[9px] tracking-[0.25em] uppercase text-cream/20">
                  Send them an invite.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Invite ───────────────────────────────────────────────────────────────

function InviteTab({ edition }: { edition: Edition }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [tgHandle, setTgHandle] = useState('');

  const accent = edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';
  // No referral tracking exists yet, so the link is the plain sign-up page.
  const inviteLink = 'finesselife.vip/signup';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  const shareText = `Join me on Finesse — the members-only lifestyle app. ${inviteLink}`;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="font-display text-2xl text-cream/80 italic tracking-wide mb-1">Bring your people in.</p>
        <p className="font-body text-sm text-cream/30">Your crew elevates the room.</p>
      </div>

      {/* Invite link */}
      <div>
        <p className="font-label text-[8px] tracking-[0.3em] uppercase text-brass/40 mb-2">Your invite link</p>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 px-4 py-3 border border-cream/10 bg-ink/50 font-mono text-xs text-cream/50 truncate"
          >
            {inviteLink}
          </div>
          <button
            onClick={handleCopy}
            className="px-5 py-3 font-label text-[8px] tracking-[0.25em] uppercase border transition-all duration-300 whitespace-nowrap"
            style={
              copied
                ? { color: '#00FF88', borderColor: '#00FF8840', background: '#00FF8812' }
                : { color: accent, borderColor: `${accent}40`, background: `${accent}12` }
            }
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        {copyFailed && (
          <p className="font-body text-xs text-cream/30 mt-2">Couldn&apos;t copy — select the link and copy it by hand.</p>
        )}
      </div>

      {/* Telegram field */}
      <div>
        <p className="font-label text-[8px] tracking-[0.3em] uppercase text-brass/40 mb-1">Telegram invite</p>
        <p className="font-body text-xs text-cream/25 mb-3">Telegram invites are coming soon — for now, share your link directly.</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tgHandle}
            onChange={(e) => setTgHandle(e.target.value)}
            placeholder="@theirhandle"
            className="flex-1 px-4 py-3 bg-ink border border-cream/12 text-cream font-body text-sm placeholder:text-cream/20 focus:border-brass focus:outline-none transition-colors"
          />
          <button
            disabled
            className="px-5 py-3 font-label text-[8px] tracking-[0.25em] uppercase border transition-all duration-300 disabled:opacity-30 whitespace-nowrap"
            style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}
          >
            Soon
          </button>
        </div>
      </div>

      {/* Social share text */}
      <div>
        <p className="font-label text-[8px] tracking-[0.3em] uppercase text-brass/40 mb-2">Share text</p>
        <div
          className="p-4 border border-cream/8 bg-ink/30 font-body text-sm text-cream/40 italic leading-relaxed"
        >
          {shareText}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EntouragePage() {
  const [tab, setTab] = useState<Tab>('crew');
  const [edition, setEdition] = useState<Edition>('finesse');

  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  const accent = edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'crew', label: 'Members' },
    { key: 'find', label: 'Find' },
    { key: 'invite', label: 'Invite' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen relative"
      style={{ background: '#0A0406' }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
          style={{ background: `radial-gradient(ellipse at center, ${accent}08 0%, transparent 65%)` }}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-6 relative z-10 px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1
            className="font-display text-4xl tracking-[0.15em] italic mb-2"
            style={{ color: '#C9A961' }}
          >
            Entourage
          </h1>
          <p className="font-label text-[9px] tracking-[0.45em] uppercase" style={{ color: 'rgba(244,232,208,0.2)' }}>
            your inner circle
          </p>
        </motion.div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 relative z-10">
        <div className="flex border-b border-cream/8 mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 relative"
              style={{ color: tab === t.key ? accent : 'rgba(244,232,208,0.3)' }}
            >
              {t.label}
              {tab === t.key && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{ background: accent }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="pb-20"
          >
            {tab === 'crew' && (
              <CrewTab edition={edition} goToFind={() => setTab('find')} />
            )}
            {tab === 'find' && <FindTab edition={edition} />}
            {tab === 'invite' && <InviteTab edition={edition} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="text-center pb-8 relative z-10">
        <Link
          href="/lobby"
          className="font-body text-sm transition-colors"
          style={{ color: 'rgba(244,232,208,0.2)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#C9A961')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(244,232,208,0.2)')}
        >
          return to the lobby
        </Link>
      </div>

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(74,25,34,0.12), transparent)' }}
      />
    </motion.div>
  );
}
