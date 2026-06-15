'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Edition = 'finesse' | 'carpe_diem';

interface VaultTransaction {
  id: string;
  merchant: string;
  amount_cents: number;
  cashback_cents: number;
  category: string;
  direction: string;
  created_at: string;
}

interface VaultBalance {
  balance_cents: number;
  cashback_earned_cents: number;
  transactions: VaultTransaction[];
}

const CATEGORY_ICONS: Record<string, string> = {
  dining: '🍽',
  funding: '💳',
  events: '🎵',
  transport: '🚗',
  beauty: '✨',
  cashback: '💰',
  general: '🏷',
};

function formatMoney(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars.toFixed(2);
  return cents < 0 ? `-$${formatted}` : `+$${formatted}`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function BalanceSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="border p-5"
          style={{ borderColor: 'rgba(201,169,97,0.2)', background: 'rgba(201,169,97,0.04)' }}
        >
          <div className="h-2 w-16 mb-3 rounded" style={{ background: 'rgba(201,169,97,0.15)', animation: 'pulse 1.6s infinite' }} />
          <div className="h-7 w-24 mb-2 rounded" style={{ background: 'rgba(201,169,97,0.1)', animation: 'pulse 1.6s infinite' }} />
          <div className="h-2 w-20 rounded" style={{ background: 'rgba(201,169,97,0.08)', animation: 'pulse 1.6s infinite' }} />
        </div>
      ))}
    </div>
  );
}

export default function VaultPage() {
  const [edition, setEdition] = useState<Edition>('finesse');
  const [displayName, setDisplayName] = useState<string>('MEMBER');
  const [isVip, setIsVip] = useState<boolean | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Vault data
  const [vaultData, setVaultData] = useState<VaultBalance | null>(null);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [fundLoading, setFundLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Gender detection (SSR-safe)
  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  // Auth + profile fetch
  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsVip(false); return; }
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, is_vip')
          .eq('id', user.id)
          .single();
        if (profile) {
          setDisplayName((profile.display_name as string | null)?.toUpperCase() ?? 'MEMBER');
          setIsVip(profile.is_vip as boolean ?? false);
        } else {
          setIsVip(false);
        }
      } catch {
        // Supabase not wired yet — show demo mode
        setIsVip(true);
        setDisplayName('DEMO MEMBER');
      }
    }
    loadProfile();
  }, []);

  // Fetch vault balance from real API
  const fetchVault = useCallback(async () => {
    setVaultLoading(true);
    try {
      const res = await fetch('/api/vault/balance');
      if (res.ok) {
        const data = await res.json() as VaultBalance;
        setVaultData(data);
      }
    } catch {
      // Network error — stay on null, zero defaults will show empty state
    } finally {
      setVaultLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // Derive display values from real vault data (zero defaults until funded)
  const balanceCents = vaultData?.balance_cents ?? 0;
  const cashbackCents = vaultData?.cashback_earned_cents ?? 0;
  const transactions = vaultData?.transactions ?? [];

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleFund() {
    setFundLoading(true);
    try {
      const res = await fetch('/api/vault/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: 50000 }), // $500
      });
      const data = await res.json() as { funded?: boolean; new_balance_cents?: number; error?: string };
      if (res.ok && data.funded) {
        setShowFundModal(false);
        showToast(`$500.00 deposited to your Vault`);
        await fetchVault();
      } else {
        showToast(data.error ?? 'Top-up failed', 'error');
      }
    } catch {
      showToast('Network error — try again', 'error');
    } finally {
      setFundLoading(false);
    }
  }

  const accentColor = edition === 'finesse' ? '#FF4D7D' : '#69C9D0';
  const cardLabel = edition === 'finesse' ? 'FINESSE' : 'CARPE DIEM';

  const cardGradient =
    edition === 'finesse'
      ? 'linear-gradient(135deg, #C9A961 0%, #8B6914 40%, #C9A961 70%, #F4E8D0 100%)'
      : 'linear-gradient(135deg, #1A3A3A 0%, #0D2525 40%, #1E4A4A 70%, #69C9D0 100%)';

  // Still loading VIP status
  if (isVip === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="font-label text-[10px] tracking-[0.5em] text-brass/40 uppercase"
        >
          accessing vault…
        </motion.div>
      </div>
    );
  }

  // Non-VIP locked view
  if (!isVip) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      >
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="font-display text-3xl italic text-brass mb-3">The Vault</h1>
        <p className="font-body text-cream/50 text-lg mb-8 max-w-sm">
          Vault access is reserved for VIP members. Upgrade to unlock your prepaid Finesse card and 12% cashback.
        </p>
        <Link
          href="/profile?upgrade=true"
          className="px-8 py-3 font-label text-[11px] tracking-[0.35em] uppercase text-ink bg-brass hover:bg-[#E8C87A] transition-colors"
        >
          Upgrade to VIP
        </Link>
        <div className="mt-8">
          <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">
            return to the lobby
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 text-sm font-label tracking-[0.2em] uppercase"
            style={{
              background: toast.type === 'success' ? 'rgba(0,255,136,0.12)' : 'rgba(255,77,125,0.12)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,136,0.35)' : 'rgba(255,77,125,0.35)'}`,
              color: toast.type === 'success' ? '#00FF88' : '#FF4D7D',
              backdropFilter: 'blur(12px)',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px]"
          style={{
            background: `radial-gradient(ellipse at center, ${accentColor}08 0%, transparent 70%)`,
          }}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 relative z-10">

        {/* ── Header ── */}
        <header className="text-center pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h1 className="font-display text-4xl italic text-brass tracking-[0.18em]">THE VAULT</h1>
            <p className="font-label text-[9px] tracking-[0.55em] text-cream/25 uppercase mt-2">
              your finesse card
            </p>
          </motion.div>
        </header>

        {/* ── Virtual Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 120 }}
          className="flex justify-center mb-8"
        >
          <div
            onClick={() => setCardFlipped((f) => !f)}
            className="relative cursor-pointer select-none"
            style={{ width: 320, height: 190, perspective: 1000 }}
            title="Tap to flip"
          >
            <motion.div
              animate={{ rotateY: cardFlipped ? 180 : 0 }}
              transition={{ duration: 0.55, type: 'spring', stiffness: 80 }}
              style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
            >
              {/* FRONT */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden"
                style={{
                  background: cardGradient,
                  backfaceVisibility: 'hidden',
                  boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${accentColor}22`,
                }}
              >
                {/* Shine overlay */}
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background:
                      'linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, transparent 65%)',
                  }}
                />
                {/* EMV chip */}
                <div
                  className="absolute"
                  style={{
                    top: 52,
                    left: 24,
                    width: 36,
                    height: 28,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #E8C87A, #C9A961)',
                    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.3)',
                  }}
                />
                {/* Logo top-left */}
                <div className="absolute top-5 left-6">
                  <span
                    className="font-label text-[11px] tracking-[0.4em] uppercase"
                    style={{
                      color: edition === 'finesse' ? '#2A0A12' : '#F4E8D0',
                      fontWeight: 700,
                      textShadow: edition === 'finesse' ? '0 1px 4px rgba(255,255,255,0.3)' : 'none',
                    }}
                  >
                    {cardLabel}
                  </span>
                </div>
                {/* Card number */}
                <div
                  className="absolute font-mono text-base tracking-[0.3em]"
                  style={{
                    bottom: 52,
                    left: 24,
                    color: edition === 'finesse' ? 'rgba(30,10,16,0.85)' : 'rgba(244,232,208,0.9)',
                    letterSpacing: '0.22em',
                    fontSize: 15,
                  }}
                >
                  **** &nbsp;**** &nbsp;**** &nbsp;8421
                </div>
                {/* Member name + expiry */}
                <div
                  className="absolute flex items-end justify-between"
                  style={{ bottom: 18, left: 24, right: 20 }}
                >
                  <div>
                    <div
                      className="font-label text-[7px] tracking-[0.3em] uppercase mb-0.5"
                      style={{ color: edition === 'finesse' ? 'rgba(30,10,16,0.45)' : 'rgba(244,232,208,0.4)' }}
                    >
                      CARD HOLDER
                    </div>
                    <div
                      className="font-label text-[11px] tracking-[0.15em] uppercase"
                      style={{ color: edition === 'finesse' ? 'rgba(30,10,16,0.85)' : 'rgba(244,232,208,0.9)' }}
                    >
                      {displayName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-label text-[7px] tracking-[0.3em] uppercase mb-0.5"
                      style={{ color: edition === 'finesse' ? 'rgba(30,10,16,0.45)' : 'rgba(244,232,208,0.4)' }}
                    >
                      EXPIRES
                    </div>
                    <div
                      className="font-mono text-[12px]"
                      style={{ color: edition === 'finesse' ? 'rgba(30,10,16,0.85)' : 'rgba(244,232,208,0.9)' }}
                    >
                      12/28
                    </div>
                  </div>
                </div>
                {/* Visa-style mark top-right */}
                <div
                  className="absolute"
                  style={{ top: 16, right: 20 }}
                >
                  <div
                    className="font-label text-[18px] tracking-tight italic"
                    style={{
                      color: edition === 'finesse' ? 'rgba(30,10,16,0.55)' : 'rgba(244,232,208,0.55)',
                      fontStyle: 'italic',
                    }}
                  >
                    VISA
                  </div>
                </div>
                {/* Holographic circle decoration */}
                <div
                  className="absolute"
                  style={{
                    right: -20,
                    bottom: -20,
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
                  }}
                />
              </div>

              {/* BACK */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-center items-center"
                style={{
                  background: cardGradient,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${accentColor}22`,
                }}
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background:
                      'linear-gradient(115deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
                  }}
                />
                {/* Magnetic stripe */}
                <div
                  className="absolute w-full"
                  style={{ top: 36, left: 0, height: 40, background: 'rgba(0,0,0,0.55)' }}
                />
                <div className="relative mt-6 text-center px-8">
                  <div
                    className="font-label text-[8px] tracking-[0.35em] uppercase mb-2"
                    style={{ color: edition === 'finesse' ? 'rgba(30,10,16,0.5)' : 'rgba(244,232,208,0.4)' }}
                  >
                    12% CASHBACK ON ALL FINESSE PURCHASES
                  </div>
                  <div
                    className="font-mono text-[10px] tracking-widest"
                    style={{ color: edition === 'finesse' ? 'rgba(30,10,16,0.7)' : 'rgba(244,232,208,0.7)' }}
                  >
                    CVV: ***
                  </div>
                </div>
                <div
                  className="absolute bottom-4 font-label text-[7px] tracking-[0.3em] uppercase"
                  style={{ color: edition === 'finesse' ? 'rgba(30,10,16,0.4)' : 'rgba(244,232,208,0.35)' }}
                >
                  finesselife.app &middot; PREPAID CARD
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="text-center mb-8">
          <span className="font-label text-[8px] tracking-[0.3em] text-cream/20 uppercase">tap card to flip</span>
        </div>

        {/* ── Balance + Cashback Stats ── */}
        {vaultLoading ? (
          <BalanceSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-4 mb-8"
          >
            {/* Balance */}
            <div
              className="border p-5"
              style={{ borderColor: 'rgba(201,169,97,0.2)', background: 'rgba(201,169,97,0.04)' }}
            >
              <div className="font-label text-[8px] tracking-[0.4em] text-brass/40 uppercase mb-2">Balance</div>
              <div className="font-mono text-2xl text-cream tracking-tight">
                ${(balanceCents / 100).toFixed(2)}
              </div>
              <div className="font-label text-[7px] tracking-[0.25em] text-cream/25 uppercase mt-1.5">
                Available funds
              </div>
            </div>
            {/* Cashback */}
            <div
              className="border p-5"
              style={{ borderColor: `${accentColor}28`, background: `${accentColor}06` }}
            >
              <div
                className="font-label text-[8px] tracking-[0.4em] uppercase mb-2"
                style={{ color: `${accentColor}70` }}
              >
                Cashback Earned
              </div>
              <div
                className="font-mono text-2xl tracking-tight"
                style={{ color: accentColor }}
              >
                ${(cashbackCents / 100).toFixed(2)}
              </div>
              <div className="font-label text-[7px] tracking-[0.25em] text-cream/25 uppercase mt-1.5">
                12% on purchases
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Fund Your Vault CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-10"
        >
          <button
            onClick={() => setShowFundModal(true)}
            className="w-full py-4 font-label text-[11px] tracking-[0.45em] uppercase text-ink transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: `linear-gradient(90deg, #C9A961, #E8C87A, #C9A961)` }}
          >
            Fund Your Vault
          </button>
        </motion.div>

        {/* ── Recent Transactions ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px flex-1 bg-brass/15" />
            <span className="font-label text-[8px] tracking-[0.45em] text-brass/40 uppercase">
              Recent Transactions
            </span>
            <div className="h-px flex-1 bg-brass/15" />
          </div>

          {vaultLoading ? (
            <div className="space-y-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3 border border-cream/5 bg-ink/30"
                  style={{ opacity: 0.5 - i * 0.1 }}
                >
                  <div className="w-9 h-9 rounded" style={{ background: 'rgba(201,169,97,0.08)', animation: 'pulse 1.6s infinite' }} />
                  <div className="flex-1">
                    <div className="h-3 w-32 rounded mb-1.5" style={{ background: 'rgba(244,232,208,0.1)', animation: 'pulse 1.6s infinite' }} />
                    <div className="h-2 w-16 rounded" style={{ background: 'rgba(244,232,208,0.05)', animation: 'pulse 1.6s infinite' }} />
                  </div>
                  <div className="h-4 w-16 rounded" style={{ background: 'rgba(244,232,208,0.08)', animation: 'pulse 1.6s infinite' }} />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="text-center py-12 border border-cream/5"
              style={{ background: 'rgba(201,169,97,0.02)' }}
            >
              <p className="font-display text-lg italic text-cream/30 mb-2">Your Vault is empty.</p>
              <p className="font-body text-sm text-cream/20 mb-6">Fund it to start earning cashback.</p>
              <button
                onClick={() => setShowFundModal(true)}
                className="px-6 py-2.5 font-label text-[9px] tracking-[0.35em] uppercase text-ink transition-all hover:scale-[1.01]"
                style={{ background: 'linear-gradient(90deg, #C9A961, #E8C87A, #C9A961)' }}
              >
                Fund Your Vault
              </button>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.07 }}
                  className="flex items-center gap-4 px-4 py-3 border border-cream/5 bg-ink/30 hover:bg-ink/50 transition-colors"
                >
                  {/* Category icon */}
                  <div
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-lg"
                    style={{
                      background: tx.amount_cents > 0 ? 'rgba(201,169,97,0.08)' : `${accentColor}0A`,
                      border: `1px solid ${tx.amount_cents > 0 ? 'rgba(201,169,97,0.15)' : accentColor + '20'}`,
                      borderRadius: 4,
                    }}
                  >
                    {CATEGORY_ICONS[tx.category] ?? '💳'}
                  </div>

                  {/* Merchant + date */}
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-sm text-cream/80 truncate">{tx.merchant}</div>
                    <div className="font-label text-[8px] tracking-[0.25em] text-cream/25 uppercase mt-0.5">
                      {formatDate(tx.created_at)}
                    </div>
                  </div>

                  {/* Amount + cashback */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className="font-mono text-sm"
                      style={{ color: tx.amount_cents > 0 ? '#00FF88' : 'rgba(244,232,208,0.75)' }}
                    >
                      {formatMoney(tx.amount_cents)}
                    </div>
                    {tx.cashback_cents > 0 && (
                      <div
                        className="font-label text-[7px] tracking-[0.2em] uppercase mt-0.5"
                        style={{ color: `${accentColor}90` }}
                      >
                        +${(tx.cashback_cents / 100).toFixed(2)} back
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Footer ── */}
        <div className="text-center pb-10">
          <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">
            return to the lobby
          </Link>
        </div>
      </div>

      {/* ── Fund Modal ── */}
      <AnimatePresence>
        {showFundModal && (
          <motion.div
            key="fund-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(10,4,6,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowFundModal(false)}
          >
            <motion.div
              key="fund-modal-panel"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="w-full max-w-sm mx-4 mb-8 sm:mb-0 p-8 border"
              style={{
                background: '#0A0406',
                borderColor: 'rgba(201,169,97,0.25)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">💳</div>
                <h2 className="font-display text-2xl italic text-brass mb-2">Fund Your Vault</h2>
                <div
                  className="h-px w-16 mx-auto"
                  style={{ background: 'rgba(201,169,97,0.3)' }}
                />
              </div>

              {/* $500 instant top-up */}
              <div
                className="p-4 mb-4 text-center border"
                style={{ borderColor: 'rgba(201,169,97,0.2)', background: 'rgba(201,169,97,0.06)' }}
              >
                <p className="font-label text-[9px] tracking-[0.35em] text-brass/60 uppercase mb-2">
                  Instant Top-Up — $500
                </p>
                <p className="font-body text-cream/50 text-sm leading-relaxed mb-4">
                  Add $500 to your Vault balance immediately.
                </p>
                <button
                  onClick={handleFund}
                  disabled={fundLoading}
                  className="w-full py-3 font-label text-[10px] tracking-[0.4em] uppercase text-ink transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  style={{ background: `linear-gradient(90deg, #C9A961, #E8C87A, #C9A961)` }}
                >
                  {fundLoading ? 'Processing…' : 'Confirm $500 Top-Up'}
                </button>
              </div>

              {/* Wire transfer info */}
              <div
                className="p-4 mb-6 text-center border"
                style={{ borderColor: 'rgba(201,169,97,0.1)', background: 'rgba(201,169,97,0.04)' }}
              >
                <p className="font-label text-[9px] tracking-[0.35em] text-brass/60 uppercase mb-2">
                  Wire Transfer
                </p>
                <p className="font-body text-cream/50 text-sm leading-relaxed">
                  Wire transfer available for premium top-ups.<br />
                  Contact your concierge to initiate.
                </p>
              </div>

              <button
                onClick={() => setShowFundModal(false)}
                className="w-full py-3 font-label text-[10px] tracking-[0.4em] uppercase border border-cream/10 text-cream/40 hover:border-brass/30 hover:text-brass/70 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/4 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(74,25,34,0.06), transparent)' }}
      />
    </motion.div>
  );
}
