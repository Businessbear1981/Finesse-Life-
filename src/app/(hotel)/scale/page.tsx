'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Deal {
  id: string;
  brand: string;
  item: string;
  retail_cents: number;
  members_cents: number;
  category: string;
  tier: 'premium' | 'contemporary' | 'mid' | 'budget';
  goal: number;
  joined: number;
  closes_in_hours: number;
  image: null | string;
}

type FilterTab = 'all' | 'live' | 'closing' | 'premium' | 'budget';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_DEALS: Deal[] = [
  {
    id: '1',
    brand: 'Jacquemus',
    item: 'Le Chiquito Bag — Sand',
    retail_cents: 65000,
    members_cents: 42000,
    category: 'Bags',
    tier: 'premium',
    goal: 25,
    joined: 19,
    closes_in_hours: 14,
    image: null,
  },
  {
    id: '2',
    brand: 'Amina Muaddi',
    item: 'Gilda Mule — Black',
    retail_cents: 75000,
    members_cents: 51000,
    category: 'Shoes',
    tier: 'premium',
    goal: 20,
    joined: 20,
    closes_in_hours: 0,
    image: null,
  },
  {
    id: '3',
    brand: 'Fashion Nova',
    item: 'Curve Power Blazer Set',
    retail_cents: 8900,
    members_cents: 5200,
    category: 'Clothes',
    tier: 'mid',
    goal: 100,
    joined: 67,
    closes_in_hours: 36,
    image: null,
  },
  {
    id: '4',
    brand: 'Toteme',
    item: 'Scarf Coat — Camel',
    retail_cents: 89000,
    members_cents: 49000,
    category: 'Outerwear',
    tier: 'premium',
    goal: 15,
    joined: 8,
    closes_in_hours: 72,
    image: null,
  },
  {
    id: '5',
    brand: 'Shein',
    item: 'Minimalist Midi Set x3',
    retail_cents: 4500,
    members_cents: 2800,
    category: 'Clothes',
    tier: 'budget',
    goal: 500,
    joined: 412,
    closes_in_hours: 8,
    image: null,
  },
  {
    id: '6',
    brand: 'Cult Gaia',
    item: 'Ark Bag — Natural',
    retail_cents: 39800,
    members_cents: 26000,
    category: 'Bags',
    tier: 'contemporary',
    goal: 30,
    joined: 11,
    closes_in_hours: 48,
    image: null,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (cents: number) => `$${(cents / 100).toLocaleString()}`;

const savingsPct = (retail: number, members: number) =>
  Math.round(((retail - members) / retail) * 100);

const countdownDisplay = (hrs: number) =>
  hrs >= 24 ? `${Math.floor(hrs / 24)}d ${hrs % 24}h` : `${hrs}h`;

const TIER_COLORS: Record<Deal['tier'], string> = {
  premium: '#C9A961',
  contemporary: '#D4B896',
  mid: '#A08060',
  budget: '#6B7280',
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  Bags: 'linear-gradient(135deg, #2A1A0E 0%, #4A2810 100%)',
  Shoes: 'linear-gradient(135deg, #0E1A2A 0%, #1A2840 100%)',
  Clothes: 'linear-gradient(135deg, #1A0E2A 0%, #2D1840 100%)',
  Outerwear: 'linear-gradient(135deg, #1A1A0E 0%, #2A2A18 100%)',
  Jewelry: 'linear-gradient(135deg, #2A1A0E 0%, #3A2410 100%)',
};

// ─── DealCard ────────────────────────────────────────────────────────────────

function DealCard({ deal, index }: { deal: Deal; index: number }) {
  const [localJoined, setLocalJoined] = useState(deal.joined);
  const [joinState, setJoinState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  const pct = Math.min((localJoined / deal.goal) * 100, 100);
  const isUnlocked = localJoined >= deal.goal;
  const isClosingSoon = pct >= 80 && !isUnlocked;
  const save = savingsPct(deal.retail_cents, deal.members_cents);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (joinState !== 'idle') return;
    setJoinState('loading');

    try {
      const res = await fetch('/api/scale/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal.id, amount_cents: deal.members_cents }),
      });

      if (res.status === 401) {
        setToast('Sign in to join');
        setJoinState('idle');
        setTimeout(() => setToast(null), 3000);
        return;
      }

      if (res.ok) {
        setLocalJoined((prev) => prev + 1);
        setJoinState('done');
      } else {
        setJoinState('idle');
      }
    } catch {
      setJoinState('idle');
    }
  };

  return (
    <motion.div
      key={deal.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.07, duration: 0.45 }}
      style={{
        background: '#0D0508',
        border: isUnlocked
          ? '1px solid rgba(0,255,136,0.5)'
          : isClosingSoon
          ? '1px solid rgba(255,169,107,0.5)'
          : '1px solid rgba(244,232,208,0.06)',
        boxShadow: isUnlocked
          ? '0 0 24px rgba(0,255,136,0.12), 0 0 8px rgba(0,255,136,0.08)'
          : 'none',
        animation: isClosingSoon ? 'closingSoonPulse 2.4s ease-in-out infinite' : isUnlocked ? 'unlockedPulse 3s ease-in-out infinite' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Photo placeholder */}
      <div
        style={{
          width: '100%',
          height: '160px',
          background: CATEGORY_GRADIENTS[deal.category] ?? 'linear-gradient(135deg, #1A0E0A 0%, #2A1810 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '11px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'rgba(244,232,208,0.25)',
          }}
        >
          {deal.category}
        </span>

        {/* Tier pill */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            padding: '3px 10px',
            border: `1px solid ${TIER_COLORS[deal.tier]}60`,
            background: `${TIER_COLORS[deal.tier]}12`,
          }}
        >
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '8px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: TIER_COLORS[deal.tier],
            }}
          >
            {deal.tier}
          </span>
        </div>

        {/* Cashback pill */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '3px 10px',
            border: '1px solid rgba(0,255,136,0.2)',
            background: 'rgba(0,255,136,0.06)',
          }}
        >
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '8px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#00FF88',
            }}
          >
            12% back to Vault
          </span>
        </div>

        {/* Countdown / status badge */}
        {isUnlocked ? (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              padding: '4px 12px',
              background: 'rgba(0,255,136,0.15)',
              border: '1px solid rgba(0,255,136,0.4)',
            }}
          >
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '8px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#00FF88',
              }}
            >
              UNLOCKED
            </span>
          </div>
        ) : isClosingSoon && deal.closes_in_hours > 0 ? (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              padding: '4px 12px',
              background: 'rgba(255,169,107,0.12)',
              border: '1px solid rgba(255,169,107,0.35)',
            }}
          >
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '8px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#FFA96B',
                animation: 'textPulse 1.6s ease-in-out infinite',
              }}
            >
              CLOSING SOON · {countdownDisplay(deal.closes_in_hours)}
            </span>
          </div>
        ) : deal.closes_in_hours > 0 ? (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              padding: '4px 12px',
              background: 'rgba(244,232,208,0.04)',
              border: '1px solid rgba(244,232,208,0.08)',
            }}
          >
            <span
              style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '9px',
                color: 'rgba(244,232,208,0.3)',
              }}
            >
              {countdownDisplay(deal.closes_in_hours)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Card body */}
      <div style={{ padding: '20px 20px 22px' }}>
        {/* Brand + item */}
        <p
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '9px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'rgba(244,232,208,0.3)',
            marginBottom: '6px',
          }}
        >
          {deal.brand}
        </p>
        <h3
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: '18px',
            color: '#F4E8D0',
            marginBottom: '14px',
            lineHeight: 1.25,
          }}
        >
          {deal.item}
        </h3>

        {/* Pricing row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '22px',
              color: '#00FF88',
              fontWeight: 600,
            }}
          >
            {fmt(deal.members_cents)}
          </span>
          <span
            style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              color: 'rgba(244,232,208,0.25)',
              textDecoration: 'line-through',
            }}
          >
            {fmt(deal.retail_cents)}
          </span>
          {/* Savings badge */}
          <div
            style={{
              padding: '3px 10px',
              background: 'rgba(74,25,34,0.7)',
              border: '1px solid rgba(201,169,97,0.35)',
            }}
          >
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '8px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#C9A961',
              }}
            >
              SAVE {save}%
            </span>
          </div>
        </div>

        {/* Progress bar section */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span
              style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '10px',
                color: 'rgba(244,232,208,0.4)',
              }}
            >
              {localJoined}/{deal.goal} members joined
            </span>
            {isUnlocked && (
              <span
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '8px',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#00FF88',
                  animation: 'textPulse 2s ease-in-out infinite',
                }}
              >
                UNLOCKED
              </span>
            )}
            {isClosingSoon && !isUnlocked && (
              <span
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '8px',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#FFA96B',
                  animation: 'textPulse 1.6s ease-in-out infinite',
                }}
              >
                CLOSING SOON
              </span>
            )}
          </div>

          {/* Bar track */}
          <div style={{ width: '100%', height: '3px', background: 'rgba(0,255,136,0.1)', borderRadius: '1px' }}>
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: isUnlocked ? '#00FF88' : isClosingSoon ? '#FFA96B' : 'rgba(0,255,136,0.4)',
                transition: 'width 1s ease',
                borderRadius: '1px',
              }}
            />
          </div>
        </div>

        {/* Join button */}
        {isUnlocked ? (
          <div
            style={{
              width: '100%',
              padding: '13px',
              textAlign: 'center',
              background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.3)',
            }}
          >
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#00FF88',
              }}
            >
              Deal Unlocked · Activating
            </span>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joinState !== 'idle'}
            style={{
              width: '100%',
              padding: '13px',
              background:
                joinState === 'done'
                  ? 'rgba(0,255,136,0.12)'
                  : joinState === 'loading'
                  ? 'rgba(201,169,97,0.15)'
                  : '#00FF88',
              border:
                joinState === 'done'
                  ? '1px solid rgba(0,255,136,0.35)'
                  : joinState === 'loading'
                  ? '1px solid rgba(201,169,97,0.3)'
                  : 'none',
              color: joinState === 'done' ? '#00FF88' : joinState === 'loading' ? '#C9A961' : '#0A0406',
              fontFamily: 'Cinzel, serif',
              fontSize: '10px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              cursor: joinState !== 'idle' ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {joinState === 'done'
              ? "You're In ✓"
              : joinState === 'loading'
              ? 'Joining...'
              : 'Join This Deal'}
          </button>
        )}

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '9px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#C9A961',
                textAlign: 'center',
                marginTop: '8px',
              }}
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Scale() {
  const [edition, setEdition] = useState<'finesse' | 'carpe_diem'>('finesse');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  const closingToday = MOCK_DEALS.filter(
    (d) => d.closes_in_hours > 0 && d.closes_in_hours <= 24 && d.joined < d.goal,
  ).length;

  const filtered = MOCK_DEALS.filter((deal) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'live') return deal.joined < deal.goal && deal.closes_in_hours > 0;
    if (activeFilter === 'closing') return (deal.joined / deal.goal) >= 0.8 && deal.joined < deal.goal;
    if (activeFilter === 'premium') return deal.tier === 'premium' || deal.tier === 'contemporary';
    if (activeFilter === 'budget') return deal.tier === 'budget' || deal.tier === 'mid';
    return true;
  });

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'live', label: 'Live' },
    { key: 'closing', label: 'Closing Soon' },
    { key: 'premium', label: 'Premium' },
    { key: 'budget', label: 'Budget' },
  ];

  void edition; // used for gender-aware copy if needed later

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      style={{ minHeight: '100vh', background: '#0A0406', position: 'relative' }}
    >
      {/* Keyframe styles */}
      <style>{`
        @keyframes closingSoonPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,169,107,0); border-color: rgba(255,169,107,0.35); }
          50% { box-shadow: 0 0 16px rgba(255,169,107,0.18); border-color: rgba(255,169,107,0.65); }
        }
        @keyframes unlockedPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(0,255,136,0.08), 0 0 8px rgba(0,255,136,0.05); }
          50% { box-shadow: 0 0 32px rgba(0,255,136,0.2), 0 0 12px rgba(0,255,136,0.12); }
        }
        @keyframes greenDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes textPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '350px',
          background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Header ── */}
      <header style={{ textAlign: 'center', paddingTop: '52px', paddingBottom: '12px', position: 'relative', zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '36px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#F4E8D0',
              marginBottom: '6px',
            }}
          >
            SCALE
          </h1>
          <p
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '9px',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              color: 'rgba(244,232,208,0.2)',
            }}
          >
            group power · members price
          </p>
        </motion.div>

        {/* Closing today indicator */}
        {closingToday > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
              padding: '6px 16px',
              border: '1px solid rgba(0,255,136,0.2)',
              background: 'rgba(0,255,136,0.05)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#00FF88',
                display: 'inline-block',
                animation: 'greenDotPulse 1.8s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '9px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#00FF88',
              }}
            >
              {closingToday} deal{closingToday !== 1 ? 's' : ''} closing today
            </span>
          </motion.div>
        )}
      </header>

      {/* ── Filter tabs ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{
          maxWidth: '672px',
          margin: '24px auto 28px',
          padding: '0 16px',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: '7px 16px',
              fontFamily: 'Cinzel, serif',
              fontSize: '9px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              background: activeFilter === f.key ? '#00FF88' : 'transparent',
              color: activeFilter === f.key ? '#0A0406' : 'rgba(244,232,208,0.35)',
              border: activeFilter === f.key ? '1px solid #00FF88' : '1px solid rgba(244,232,208,0.1)',
            }}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* ── Deal cards ── */}
      <div
        style={{
          maxWidth: '672px',
          margin: '0 auto',
          padding: '0 16px 48px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                textAlign: 'center',
                fontFamily: '"Cormorant Garamond", serif',
                fontStyle: 'italic',
                fontSize: '15px',
                color: 'rgba(244,232,208,0.25)',
                paddingTop: '40px',
              }}
            >
              No deals match this filter right now.
            </motion.p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filtered.map((deal, i) => (
                <DealCard key={deal.id} deal={deal} index={i} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{ textAlign: 'center', paddingBottom: '36px', position: 'relative', zIndex: 10 }}
      >
        <p
          style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontStyle: 'italic',
            fontSize: '11px',
            color: 'rgba(244,232,208,0.15)',
            maxWidth: '400px',
            margin: '0 auto 20px',
            lineHeight: 1.7,
            padding: '0 16px',
          }}
        >
          Payment collected only when the group reaches its goal. Every transaction earns 12% back to your Vault.
        </p>
        <Link
          href="/lobby"
          style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: '13px',
            color: 'rgba(244,232,208,0.2)',
            textDecoration: 'none',
            letterSpacing: '0.1em',
          }}
        >
          return to the lobby
        </Link>
      </motion.div>

      {/* Bottom gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '33%',
          background: 'linear-gradient(to top, rgba(74,25,34,0.06), transparent)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}
