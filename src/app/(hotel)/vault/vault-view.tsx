'use client';

/**
 * The Vault — presentational pieces (Continental skin). Data, auth and API calls stay in
 * page.tsx; everything here renders from props so /design/continental can show it with
 * sample data.
 */
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {CARD_FINISHES, CARD_FINISH_ORDER, type CardFinish} from '@/lib/card-finishes';
import {
  BrassButton,
  BrassCounter,
  BrassLink,
  Coin,
  DecoFrame,
  Divider,
  EngravedHeading,
  Eyebrow,
  FinesseCard,
  LacquerSurface,
  Plate,
  Seal,
  Sigil,
  VaultDoor,
  VelvetSurface,
} from '@/components/continental';
import {brushedUri, sparkleUri} from '@/components/continental/textures';

export interface VaultTransaction {
  id: string;
  merchant: string;
  amount_cents: number;
  cashback_cents: number;
  category: string;
  direction: string;
  created_at: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  dining: 'Dining',
  funding: 'Deposit',
  events: 'Evenings',
  transport: 'Motor car',
  beauty: 'Salon',
  cashback: 'Cashback',
  general: 'Sundries',
};

function formatMoney(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars.toFixed(2);
  return cents < 0 ? `-$${formatted}` : `+$${formatted}`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

const dollars = (cents: number) => `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

/* ─── Header ─────────────────────────────────────────────────────────────── */
export function VaultHeader() {
  return (
    <header className="relative px-4 pb-6 pt-10 text-center">
      <div className="mb-5 flex items-center justify-center gap-4">
        <Plate number="06" label="Safe deposit" size="md" />
      </div>
      <EngravedHeading eyebrow="The Hotel · Private floor" title="The Vault" script="your finesse card" />
    </header>
  );
}

/* ─── Finish selector: three metal samples ───────────────────────────────── */
const SWATCH: Record<CardFinish, string> = {
  nano_black: `${sparkleUri(0.6)}, radial-gradient(circle at 35% 30%, #34343a 0%, #0d0d10 55%, #030304 100%)`,
  platinum:
    'conic-gradient(from 30deg, #8f939a, #f4f4f3 12%, #a6aab1 25%, #e3e5e8 40%, #8a8e95 55%, #f7f7f6 70%, #a3a7ae 85%, #8f939a)',
  rose_gold:
    'conic-gradient(from 30deg, #9a5c55, #f6d2c1 12%, #b87c71 25%, #f1c8b5 40%, #985a53 55%, #fadfd0 70%, #b67a6e 85%, #9a5c55)',
};

export function FinishSwatches({value, onChange}: {value: CardFinish; onChange: (f: CardFinish) => void}) {
  return (
    <div className="flex justify-center gap-5 sm:gap-8" role="radiogroup" aria-label="Card finish">
      {CARD_FINISH_ORDER.map((f) => {
        const on = value === f;
        return (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(f)}
            className="group flex min-w-[76px] flex-col items-center gap-2 py-1 focus-visible:outline-none"
          >
            <span
              className="relative block h-12 w-12 rounded-full transition-transform duration-500 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-[var(--brass-200)] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[var(--lacquer)]"
              style={{
                backgroundImage: SWATCH[f],
                backgroundSize: f === 'nano_black' ? '80px 80px, 100% 100%' : undefined,
                boxShadow: on
                  ? '0 0 0 2px #0b080c, 0 0 0 3.5px #e8c87a, 0 0 18px rgb(232 200 122 / 45%), inset 0 1px 1px rgb(255 255 255 / 45%), inset 0 -2px 4px rgb(0 0 0 / 50%)'
                  : '0 0 0 1px rgb(201 169 97 / 35%), 0 4px 10px rgb(0 0 0 / 70%), inset 0 1px 1px rgb(255 255 255 / 40%), inset 0 -2px 4px rgb(0 0 0 / 50%)',
              }}
            >
              <span className="absolute inset-0 rounded-full" style={{background: 'radial-gradient(circle at 32% 26%, rgb(255 255 255 / 55%) 0%, rgb(255 255 255 / 0%) 34%)', mixBlendMode: 'screen'}} />
            </span>
            <span className={`font-label text-[9px] uppercase tracking-[0.28em] ${on ? 'text-[var(--brass-100)]' : 'text-[var(--ct-text-mute)]'}`}>{CARD_FINISHES[f].label}</span>
            <span aria-hidden className={`h-1 w-1 rotate-45 transition-opacity ${on ? 'bg-[var(--brass-200)] opacity-100' : 'opacity-0'}`} />
          </button>
        );
      })}
    </div>
  );
}

/* ─── The chamber: vault door + card on its velvet tray ─────────────────── */
export function VaultChamber({
  finish,
  onFinish,
  flipped,
  onFlip,
  brand,
  holder,
  accent,
  doorState = 'opening',
}: {
  finish: CardFinish;
  onFinish: (f: CardFinish) => void;
  flipped: boolean;
  onFlip: () => void;
  brand: string;
  holder: string;
  accent: string;
  doorState?: 'opening' | 'open';
}) {
  return (
    <section aria-label="Your card, presented in the vault" className="relative">
      <div className="overflow-hidden">
        <VaultDoor state={doorState} plate="No. 06">
          <div className="w-[86%] sm:w-[52%]">
            <VelvetSurface className="rounded-[10px] p-[3.5%]" style={{boxShadow: '0 0 0 1px #6b5028, 0 0 0 2px #1a0e06, 0 0 0 3px rgb(201 169 97 / 55%), 0 24px 40px -10px rgb(0 0 0 / 95%)'}}>
              <FinesseCard finish={finish} brand={brand} holder={holder} flipped={flipped} onFlip={onFlip} accent={accent} />
            </VelvetSurface>
          </div>
        </VaultDoor>
      </div>
      <p className="mt-4 px-4 text-center font-label text-[9px] uppercase leading-relaxed tracking-[0.26em] text-[var(--ct-text-mute)]">
        tap card to flip · preview — your card is issued once the card partner is live
      </p>
      <div className="mt-6 px-2">
        <FinishSwatches value={finish} onChange={onFinish} />
      </div>
    </section>
  );
}

/* ─── Ledger: balance counter + cashback marker ─────────────────────────── */
export function VaultLedger({loading, balanceCents, cashbackCents}: {loading: boolean; balanceCents: number; cashbackCents: number}) {
  if (loading) {
    return (
      <LacquerSurface className="ct-keyline px-5 py-8" role="status" aria-label="Loading balance">
        <div className="mx-auto h-3 w-32 animate-pulse bg-[rgb(201_169_97/0.15)]" />
        <div className="mx-auto mt-4 h-12 w-56 animate-pulse bg-[rgb(201_169_97/0.1)]" />
        <div className="mx-auto mt-8 h-24 w-24 animate-pulse rounded-full bg-[rgb(201_169_97/0.08)]" />
      </LacquerSurface>
    );
  }
  return (
    <DecoFrame as="section" className="overflow-hidden" style={{background: 'var(--lacquer)'}}>
      <LacquerSurface sparkle className="px-4 pb-7 pt-7 sm:px-8">
        <Eyebrow className="text-center">Balance on deposit</Eyebrow>
        <div className="mt-4 flex justify-center">
          <BrassCounter value={dollars(balanceCents)} label={`Balance ${dollars(balanceCents)}`} size={24} />
        </div>
        <p className="mt-3 text-center font-label text-[9px] uppercase tracking-[0.3em] text-[var(--ct-text-mute)]">Available funds</p>

        <Divider className="mx-auto my-7 max-w-[300px]" />

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
          <Coin size={124} value="12%" caption="CASHBACK" title="Finesse house marker: 12% cashback" />
          <div className="text-center sm:text-left">
            <Eyebrow>Cashback earned</Eyebrow>
            <p className="ct-gilt mt-2 font-label text-[32px] font-semibold tracking-[0.06em]">{dollars(cashbackCents)}</p>
            <p className="mt-1 font-label text-[9px] uppercase tracking-[0.28em] text-[var(--ct-text-mute)]">12% on purchases</p>
            <p className="mt-3 max-w-[240px] font-body text-[15px] italic leading-snug text-[var(--ct-text-soft)]">The house keeps its markers.</p>
          </div>
        </div>
      </LacquerSurface>
    </DecoFrame>
  );
}

/* ─── Safe-deposit boxes (transactions) ─────────────────────────────────── */
const BOX_FACE: CSSProperties = {
  backgroundImage: `linear-gradient(110deg, rgb(255 240 210 / 0%) 30%, rgb(255 240 210 / 6%) 46%, rgb(255 240 210 / 0%) 60%), ${brushedUri(0.07)}, linear-gradient(180deg, #2a231c 0%, #1a1612 55%, #120f0c 100%)`,
  backgroundSize: '100% 100%, 100% 100%, 100% 100%',
  boxShadow: 'inset 0 1px 0 rgb(255 235 190 / 14%), inset 0 -1px 0 rgb(0 0 0 / 70%), inset 0 0 0 1px rgb(201 169 97 / 22%), inset 0 0 0 4px #110e0b, inset 0 0 0 5px rgb(201 169 97 / 12%), 0 2px 0 #050404',
};

function Keyhole() {
  return (
    <span aria-hidden className="relative inline-flex h-7 w-7 items-center justify-center rounded-full" style={{background: 'radial-gradient(circle at 35% 30%, #f6e0a6, #a8843f 55%, #5b4219)', boxShadow: '0 1px 2px rgb(0 0 0 / 80%), inset 0 -1px 1px rgb(0 0 0 / 40%)'}}>
      <svg viewBox="0 0 10 14" width="7" height="10">
        <path d="M5 1a2.4 2.4 0 0 1 1.2 4.5L7.2 13H2.8l1-7.5A2.4 2.4 0 0 1 5 1Z" fill="#120c05" />
      </svg>
    </span>
  );
}

export function DepositBox({tx, index}: {tx: VaultTransaction; index: number}) {
  const credit = tx.amount_cents > 0;
  return (
    <motion.li
      initial={{opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      transition={{delay: 0.1 + index * 0.06, duration: 0.6, ease: [0.22, 0.8, 0.18, 1]}}
      className="relative flex items-center gap-3 px-4 py-4"
      style={BOX_FACE}
    >
      <div className="flex shrink-0 flex-col items-center gap-2">
        <Plate number={`${101 + index}`} size="sm" screws={false} />
        <Keyhole />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-[17px] leading-tight text-[var(--ct-text)]">{tx.merchant}</p>
        <p className="mt-1 font-label text-[9px] uppercase tracking-[0.26em] text-[var(--ct-text-mute)]">
          {formatDate(tx.created_at)} · {CATEGORY_LABEL[tx.category] ?? tx.category}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-label text-[15px] font-semibold tracking-[0.04em]" style={{color: credit ? '#a9dcb9' : 'var(--ct-text)'}}>
          {formatMoney(tx.amount_cents)}
        </p>
        {tx.cashback_cents > 0 && (
          <p className="ct-gilt mt-1 font-label text-[10px] font-semibold uppercase tracking-[0.18em]">+${(tx.cashback_cents / 100).toFixed(2)} back</p>
        )}
      </div>
      {/* drawer pull */}
      <span aria-hidden className="absolute bottom-1.5 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full" style={{background: 'linear-gradient(180deg, #f2d99a, #8a6a2e)', boxShadow: '0 1px 1px rgb(0 0 0 / 80%)'}} />
    </motion.li>
  );
}

export function DepositBoxes({loading, transactions, onFund}: {loading: boolean; transactions: VaultTransaction[]; onFund: () => void}) {
  return (
    <section aria-label="Recent transactions">
      <Divider label="Recent Transactions" className="mb-5" />
      {loading ? (
        <ul className="space-y-2" role="status" aria-label="Loading transactions">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[92px] animate-pulse" style={{...BOX_FACE, opacity: 0.7 - i * 0.15}} />
          ))}
        </ul>
      ) : transactions.length === 0 ? (
        <div className="relative px-5 pb-8 pt-6 text-center" style={BOX_FACE}>
          <VelvetSurface className="mx-auto mb-6 h-16 max-w-[260px] rounded-[2px]" style={{boxShadow: 'inset 0 8px 14px rgb(0 0 0 / 80%), 0 0 0 1px rgb(201 169 97 / 35%)'}} />
          <p className="font-display text-[22px] italic text-[var(--ct-text)]">Your Vault is empty.</p>
          <p className="mb-6 mt-1 font-body text-[16px] text-[var(--ct-text-soft)]">Fund it to start earning cashback.</p>
          <BrassButton size="sm" onClick={onFund}>Fund Your Vault</BrassButton>
        </div>
      ) : (
        <ul className="space-y-2">
          {transactions.map((tx, i) => (
            <DepositBox key={tx.id} tx={tx} index={i} />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── Fund modal ─────────────────────────────────────────────────────────── */
export function FundModal({open, loading, onConfirm, onClose}: {open: boolean; loading: boolean; onConfirm: () => void; onClose: () => void}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="fund-modal-backdrop"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{background: 'rgb(6 4 6 / 88%)', backdropFilter: 'blur(8px)'}}
          onClick={onClose}
        >
          <motion.div
            key="fund-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fund-title"
            initial={{opacity: 0, y: 40}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 40}}
            transition={{type: 'spring', stiffness: 160, damping: 24}}
            className="mx-4 mb-8 w-full max-w-sm sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <FundPanel loading={loading} onConfirm={onConfirm} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The modal's panel on its own (also used by the design showcase). */
export function FundPanel({loading, onConfirm, onClose}: {loading: boolean; onConfirm: () => void; onClose: () => void}) {
  return (
    <DecoFrame style={{background: 'var(--lacquer)', boxShadow: '0 40px 80px rgb(0 0 0 / 80%)'}}>
      <LacquerSurface className="px-6 pb-6 pt-8">
        <div className="mb-6 text-center">
          <Seal size={64} mark="F" className="mx-auto mb-3" />
          <h2 id="fund-title" className="ct-gilt font-label text-[20px] font-semibold uppercase tracking-[0.22em]">Fund Your Vault</h2>
          <Divider className="mx-auto mt-3 max-w-[160px]" />
        </div>
        <div className="mb-4 border border-[rgb(201_169_97/0.3)] p-4 text-center" style={{background: 'rgb(201 169 97 / 5%)'}}>
          <p className="mb-2 font-label text-[9px] uppercase tracking-[0.35em] text-[var(--brass-200)]">Instant Top-Up — $500</p>
          <p className="mb-4 font-body text-[16px] leading-relaxed text-[var(--ct-text-soft)]">Add $500 to your Vault balance immediately.</p>
          <BrassButton block onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing…' : 'Confirm $500 Top-Up'}
          </BrassButton>
        </div>
        <div className="mb-6 border border-[rgb(201_169_97/0.15)] p-4 text-center">
          <p className="mb-2 font-label text-[9px] uppercase tracking-[0.35em] text-[var(--brass-200)]">Wire Transfer</p>
          <p className="font-body text-[16px] leading-relaxed text-[var(--ct-text-soft)]">
            Wire transfer available for premium top-ups.
            <br />
            Contact your concierge to initiate.
          </p>
        </div>
        <BrassButton variant="lacquer" size="sm" block onClick={onClose}>
          Close
        </BrassButton>
      </LacquerSurface>
    </DecoFrame>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
export function VaultToast({toast}: {toast: {message: string; type: 'success' | 'error'} | null}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key="toast"
          role="status"
          initial={{opacity: 0, y: -20}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -20}}
          className="fixed left-1/2 top-20 z-[100] -translate-x-1/2 px-6 py-3 font-label text-[11px] uppercase tracking-[0.22em]"
          style={{
            background: 'linear-gradient(180deg, #1b161c, #09070a)',
            boxShadow: `inset 0 0 0 1px ${toast.type === 'success' ? 'rgb(169 220 185 / 55%)' : 'rgb(255 120 140 / 60%)'}, 0 20px 40px rgb(0 0 0 / 70%)`,
            color: toast.type === 'success' ? '#bfe8cb' : '#ffb3bf',
          }}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Closed vault (signed out / couldn't verify / not VIP) ─────────────── */
export function VaultLocked({reason}: {reason: 'signed_out' | 'error' | 'not_vip'}) {
  const copy =
    reason === 'signed_out'
      ? 'Sign in to open your Vault.'
      : reason === 'error'
        ? "We couldn't confirm your membership just now. Your Vault stays closed until we can — try again in a moment."
        : 'Vault access is reserved for VIP members. Upgrade to unlock your prepaid Finesse card and 12% cashback.';
  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 0.8}} className="flex min-h-screen flex-col items-center px-0 pb-16 pt-8 text-center">
      <div className="w-full max-w-[640px] overflow-hidden">
        <VaultDoor state="closed" />
      </div>
      <div className="-mt-6 flex flex-col items-center px-6">
        <Plate finish="enamel" label="Closed · by appointment" size="md" />
        <h1 className="ct-gilt mt-6 font-label text-[30px] font-semibold uppercase tracking-[0.22em]">The Vault</h1>
        <p className="mb-8 mt-3 max-w-sm font-body text-[18px] leading-relaxed text-[var(--ct-text-soft)]">{copy}</p>
        {reason === 'signed_out' ? (
          <BrassLink href="/login">Sign in</BrassLink>
        ) : reason === 'error' ? (
          <BrassButton onClick={() => window.location.reload()}>Try again</BrassButton>
        ) : (
          <BrassLink href="/profile?upgrade=true">Upgrade to VIP</BrassLink>
        )}
        <Link href="/lobby" className="mt-8 inline-block min-h-11 py-3 font-body text-[15px] italic text-[var(--ct-text-mute)] transition-colors hover:text-[var(--brass-200)]">
          return to the lobby
        </Link>
      </div>
    </motion.div>
  );
}

export function VaultLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5" role="status">
      <Sigil size={44} className="animate-pulse motion-reduce:animate-none" />
      <p className="font-label text-[10px] uppercase tracking-[0.5em] text-[var(--ct-text-mute)]">accessing vault…</p>
    </div>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
export function VaultFooter() {
  return (
    <footer className="pb-10 pt-4 text-center">
      <Sigil size={26} className="mx-auto mb-3 opacity-70" />
      <Link href="/lobby" className="inline-block min-h-11 py-3 font-body text-[15px] italic text-[var(--ct-text-mute)] transition-colors hover:text-[var(--brass-200)]">
        return to the lobby
      </Link>
    </footer>
  );
}

/* ─── The whole room (used by page.tsx and the design showcase) ─────────── */
export function VaultRoom({
  toast,
  finish,
  onFinish,
  flipped,
  onFlip,
  brand,
  holder,
  accent,
  loading,
  balanceCents,
  cashbackCents,
  transactions,
  fundOpen,
  onFundOpen,
  fundLoading,
  onFundConfirm,
  doorState = 'opening',
}: {
  toast: {message: string; type: 'success' | 'error'} | null;
  finish: CardFinish;
  onFinish: (f: CardFinish) => void;
  flipped: boolean;
  onFlip: () => void;
  brand: string;
  holder: string;
  accent: string;
  loading: boolean;
  balanceCents: number;
  cashbackCents: number;
  transactions: VaultTransaction[];
  fundOpen: boolean;
  onFundOpen: (open: boolean) => void;
  fundLoading: boolean;
  onFundConfirm: () => void;
  doorState?: 'opening' | 'open';
}) {
  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="relative min-h-screen overflow-hidden"
      style={{background: 'radial-gradient(120% 60% at 50% 0%, #1a1216 0%, var(--lacquer) 55%)'}}
    >
      <VaultToast toast={toast} />

      <div className="relative z-10 mx-auto max-w-[760px]">
        <VaultHeader />

        {/* The chamber: the vault door opens on the card */}
        <VaultChamber finish={finish} onFinish={onFinish} flipped={flipped} onFlip={onFlip} brand={brand} holder={holder} accent={accent} doorState={doorState} />

        <div className="mx-auto mt-10 max-w-[560px] space-y-10 px-4">
          {/* Balance + cashback marker */}
          <VaultLedger loading={loading} balanceCents={balanceCents} cashbackCents={cashbackCents} />

          {/* Fund Your Vault CTA */}
          <BrassButton block size="lg" onClick={() => onFundOpen(true)}>
            Fund Your Vault
          </BrassButton>

          {/* Recent transactions: safe-deposit boxes */}
          <DepositBoxes loading={loading} transactions={transactions} onFund={() => onFundOpen(true)} />
        </div>

        <VaultFooter />
      </div>

      <FundModal open={fundOpen} loading={fundLoading} onConfirm={onFundConfirm} onClose={() => onFundOpen(false)} />
    </motion.div>
  );
}
