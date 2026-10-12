'use client';

/**
 * The Vault — presentational pieces (After Hours skin). Data, auth and API calls stay in
 * page.tsx; everything here renders from props so the design previews can show it with
 * sample data. Export names and props are unchanged from the Continental version.
 */
import Link from 'next/link';
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import {CARD_FINISHES, CARD_FINISH_ORDER, type CardFinish} from '@/lib/card-finishes';
import {AHChip, AHDisplay, AHEyebrow, AHPill, AHRoom, AHSkeleton, AHTopBar} from '@/components/after-hours';

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
  transport: 'Rides',
  beauty: 'Salon',
  cashback: 'Cashback',
  general: 'Everything else',
};

function formatMoney(cents: number): string {
  const formatted = (Math.abs(cents) / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  return cents < 0 ? `−$${formatted}` : `+$${formatted}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

const dollars = (cents: number) => `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

/* ─── Header ─────────────────────────────────────────────────────────────── */
export function VaultHeader() {
  return (
    <header>
      <AHTopBar right={<AHChip live>Key holder</AHChip>} />
      <AHEyebrow>The Vault · Private floor</AHEyebrow>
      <AHDisplay size="l" style={{marginTop: 8}}>Your card.</AHDisplay>
    </header>
  );
}

/* ─── Finish selector ────────────────────────────────────────────────────── */
export function FinishSwatches({value, onChange}: {value: CardFinish; onChange: (f: CardFinish) => void}) {
  return (
    <div role="radiogroup" aria-label="Card finish" style={{display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap'}}>
      {CARD_FINISH_ORDER.map((f) => {
        const on = value === f;
        return (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(f)}
            className="ah-pill ah-focus"
            style={{
              minHeight: 44,
              padding: '0 11px 0 6px',
              gap: 7,
              fontSize: 12.5,
              background: on ? 'rgba(255,255,255,.1)' : 'transparent',
              borderColor: on ? 'rgba(255,255,255,.35)' : 'var(--ah-line-2)',
              color: on ? '#fff' : 'var(--ah-mute)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 20, height: 20, borderRadius: '50%', background: CARD_FINISHES[f].face,
                boxShadow: on ? '0 0 0 2px #050505, 0 0 0 3px rgba(255,255,255,.8)' : 'inset 0 0 0 1px rgba(255,255,255,.2)',
              }}
            />
            {CARD_FINISHES[f].label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── The card (tap to flip) ─────────────────────────────────────────────── */
function FlipCard({finish, brand, holder, flipped, onFlip}: {finish: CardFinish; brand: string; holder: string; flipped: boolean; onFlip: () => void}) {
  const f = CARD_FINISHES[finish];
  const reduce = useReducedMotion();
  const glow = finish === 'rose_gold' ? 'rgba(183,110,121,.4)' : finish === 'platinum' ? 'rgba(185,188,194,.28)' : 'rgba(183,110,121,.2)';
  const face: React.CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: 20, padding: 20, background: f.face, color: f.ink,
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,.14), 0 30px 60px rgba(0,0,0,.75), 0 0 70px ${glow}`,
  };
  const sheen = <span aria-hidden style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,.16) 48%, transparent 60%)'}} />;
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={flipped ? 'Show the front of your card' : 'Show the back of your card'}
      className="ah-focus"
      style={{display: 'block', width: '100%', maxWidth: 380, margin: '0 auto', padding: 0, border: 0, background: 'none', cursor: 'pointer', perspective: 1000, borderRadius: 20}}
    >
      <motion.div
        animate={{rotateY: flipped ? 180 : 0}}
        transition={reduce ? {duration: 0} : {type: 'spring', stiffness: 120, damping: 18}}
        style={{position: 'relative', aspectRatio: '1.586', transformStyle: 'preserve-3d'}}
      >
        <div style={face}>
          {sheen}
          <div style={{position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '.32em'}}>
            <span>{brand}</span>
            <span style={{width: 36, height: 27, borderRadius: 6, background: 'linear-gradient(135deg,#e3e4e7,#7d8086)'}} />
          </div>
          <div style={{position: 'relative', textAlign: 'left'}}>
            <div style={{fontSize: 11, letterSpacing: '.28em', color: f.inkSoft}}>•••• •••• •••• ––––</div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10}}>
              <span style={{fontSize: 13, fontWeight: 600, letterSpacing: '.18em'}}>{holder}</span>
              <span className="ah-serif-i" style={{fontSize: 24, lineHeight: 1}}>12%</span>
            </div>
          </div>
        </div>
        <div style={{...face, transform: 'rotateY(180deg)', padding: 0}}>
          {sheen}
          <div style={{height: 44, marginTop: 24, background: 'rgba(0,0,0,.82)'}} />
          <div style={{position: 'relative', padding: '16px 20px', textAlign: 'left', fontSize: 11, lineHeight: 1.5, color: f.inkSoft}}>
            <div style={{height: 30, borderRadius: 4, background: 'rgba(255,255,255,.75)', marginBottom: 12}} />
            Preview. Your card is issued once the card partner is live. {f.label} finish.
          </div>
        </div>
      </motion.div>
    </button>
  );
}

/* ─── The chamber: the card on display + finish choice ───────────────────── */
export function VaultChamber({
  finish,
  onFinish,
  flipped,
  onFlip,
  brand,
  holder,
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
  const reduce = useReducedMotion();
  return (
    <section aria-label="Your card" style={{marginTop: 26}}>
      <motion.div
        initial={reduce ? false : {opacity: 0, y: 30, rotateX: 25}}
        animate={{opacity: 1, y: 0, rotateX: 0}}
        transition={{duration: 1, ease: [0.2, 0.8, 0.2, 1]}}
        style={{perspective: 900}}
      >
        <FlipCard finish={finish} brand={brand} holder={holder} flipped={flipped} onFlip={onFlip} />
      </motion.div>
      <p style={{margin: '18px 0 16px', textAlign: 'center', fontSize: 12, color: 'var(--ah-faint)'}}>
        Tap to flip · Preview. Your card is issued once the card partner is live.
      </p>
      <FinishSwatches value={finish} onChange={onFinish} />
    </section>
  );
}

/* ─── Ledger: balance + the 12% ──────────────────────────────────────────── */
export function VaultLedger({loading, balanceCents, cashbackCents}: {loading: boolean; balanceCents: number; cashbackCents: number}) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading balance" style={{display: 'grid', gap: 12}}>
        <AHSkeleton h={12} w={120} />
        <AHSkeleton h={52} w={220} />
        <AHSkeleton h={110} r={24} />
      </div>
    );
  }
  return (
    <section aria-label="Balance">
      <AHEyebrow>Available</AHEyebrow>
      <p className="ah-num" style={{margin: '6px 0 0', fontSize: 'clamp(44px, 13vw, 56px)', fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1}}>
        {dollars(balanceCents)}
      </p>
      <div className="ah-card" style={{marginTop: 22, display: 'flex', alignItems: 'center', gap: 18, overflow: 'hidden'}}>
        <span aria-hidden style={{position: 'absolute', inset: 0, background: 'radial-gradient(60% 120% at 0% 50%, rgba(183,110,121,.28), transparent 70%)'}} />
        <span className="ah-serif-i ah-rose-text" style={{position: 'relative', fontSize: 64, lineHeight: 0.9}} title="12% cashback">12%</span>
        <div style={{position: 'relative'}}>
          <p style={{margin: 0, fontSize: 14, fontWeight: 600}}>Back on every purchase</p>
          <p className="ah-num" style={{margin: '4px 0 0', fontSize: 13, color: 'var(--ah-mute)'}}>
            {dollars(cashbackCents)} earned so far
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Activity (transactions) ────────────────────────────────────────────── */
export function DepositBox({tx, index}: {tx: VaultTransaction; index: number}) {
  const credit = tx.amount_cents > 0;
  const reduce = useReducedMotion();
  return (
    <motion.li
      initial={reduce ? false : {opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      transition={{delay: 0.05 + index * 0.05, duration: 0.5}}
      style={{display: 'flex', alignItems: 'center', gap: 14, padding: '14px 2px', borderBottom: '1px solid var(--ah-line)'}}
    >
      <span aria-hidden style={{flex: 'none', width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--ah-ink-3)', border: '1px solid var(--ah-line)', fontWeight: 700, fontSize: 15}}>
        {tx.merchant.trim()[0]?.toUpperCase() ?? '·'}
      </span>
      <div style={{flex: 1, minWidth: 0}}>
        <p style={{margin: 0, fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{tx.merchant}</p>
        <p style={{margin: '3px 0 0', fontSize: 12, color: 'var(--ah-mute)'}}>
          {formatDate(tx.created_at)} · {CATEGORY_LABEL[tx.category] ?? tx.category}
        </p>
      </div>
      <div style={{textAlign: 'right'}}>
        <p className="ah-num" style={{margin: 0, fontSize: 15, fontWeight: 600, color: credit ? 'var(--ah-ok)' : 'var(--ah-text)'}}>{formatMoney(tx.amount_cents)}</p>
        {tx.cashback_cents > 0 && (
          <p className="ah-num" style={{margin: '3px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--ah-rose)'}}>+{dollars(tx.cashback_cents)} back</p>
        )}
      </div>
    </motion.li>
  );
}

export function DepositBoxes({loading, transactions, onFund}: {loading: boolean; transactions: VaultTransaction[]; onFund: () => void}) {
  return (
    <section aria-label="Recent transactions">
      <AHEyebrow style={{marginBottom: 6}}>Activity</AHEyebrow>
      {loading ? (
        <div role="status" aria-label="Loading transactions" style={{display: 'grid', gap: 10, marginTop: 10}}>
          {[0, 1, 2].map((i) => <AHSkeleton key={i} h={56} r={14} />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="ah-card" style={{textAlign: 'center', marginTop: 10, padding: '28px 20px'}}>
          <p className="ah-serif-i" style={{margin: 0, fontSize: 28}}>Your Vault is empty.</p>
          <p style={{margin: '6px 0 18px', fontSize: 14, color: 'var(--ah-mute)'}}>Fund it to start earning 12% back.</p>
          <AHPill onClick={onFund}>Fund your Vault</AHPill>
        </div>
      ) : (
        <ul style={{listStyle: 'none', margin: 0, padding: 0}}>
          {transactions.map((tx, i) => <DepositBox key={tx.id} tx={tx} index={i} />)}
        </ul>
      )}
    </section>
  );
}

/* ─── Fund sheet ─────────────────────────────────────────────────────────── */
export function FundModal({open, loading, onConfirm, onClose}: {open: boolean; loading: boolean; onConfirm: () => void; onClose: () => void}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="fund-modal-backdrop"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          style={{position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(8px)'}}
          onClick={onClose}
        >
          <motion.div
            key="fund-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fund-title"
            initial={{y: 60, opacity: 0}}
            animate={{y: 0, opacity: 1}}
            exit={{y: 60, opacity: 0}}
            transition={{type: 'spring', stiffness: 200, damping: 26}}
            style={{width: '100%', maxWidth: 440, padding: '0 12px calc(env(safe-area-inset-bottom, 0px) + 12px)'}}
            onClick={(e) => e.stopPropagation()}
          >
            <FundPanel loading={loading} onConfirm={onConfirm} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The sheet's panel on its own (also used by the design previews). */
export function FundPanel({loading, onConfirm, onClose}: {loading: boolean; onConfirm: () => void; onClose: () => void}) {
  return (
    <div className="ah-card ah-card-glass" style={{borderRadius: 28, padding: 22, fontFamily: 'var(--ah-sans)', color: 'var(--ah-text)'}}>
      <div aria-hidden style={{width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.2)', margin: '-6px auto 16px'}} />
      <h2 id="fund-title" className="ah-serif-i" style={{margin: 0, fontSize: 32, lineHeight: 1}}>Fund your Vault</h2>
      <div className="ah-card" style={{marginTop: 18, padding: 18}}>
        <AHEyebrow>Instant top-up</AHEyebrow>
        <p className="ah-num" style={{margin: '6px 0 4px', fontSize: 34, fontWeight: 600, letterSpacing: '-.02em'}}>$500.00</p>
        <p style={{margin: '0 0 14px', fontSize: 13, color: 'var(--ah-mute)'}}>Added to your balance immediately.</p>
        <AHPill block onClick={onConfirm} disabled={loading}>{loading ? 'Processing…' : 'Confirm $500 top-up'}</AHPill>
      </div>
      <div style={{padding: '16px 4px 6px'}}>
        <p style={{margin: 0, fontSize: 14, fontWeight: 600}}>Wire transfer</p>
        <p style={{margin: '4px 0 0', fontSize: 13, color: 'var(--ah-mute)'}}>For larger top-ups. Ask the Concierge to set it up.</p>
      </div>
      <AHPill variant="ghost" block onClick={onClose} className="ah-focus">Close</AHPill>
    </div>
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
          initial={{opacity: 0, y: -16}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -16}}
          style={{
            position: 'fixed', left: '50%', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', zIndex: 100, transform: 'translateX(-50%)',
            padding: '12px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
            background: 'rgba(22,22,24,.92)', backdropFilter: 'blur(16px)', fontFamily: 'var(--ah-sans)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(126,226,184,.45)' : 'rgba(255,120,140,.5)'}`,
            color: toast.type === 'success' ? '#bff0da' : '#ffc0ca',
          }}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Closed vault (signed out / couldn't verify / not VIP) ─────────────── */
function ClosedDial() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" aria-hidden style={{display: 'block', margin: '10px auto 26px'}}>
      <defs>
        <linearGradient id="ah-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset=".55" stopColor="#b9bcc2" stopOpacity=".55" />
          <stop offset="1" stopColor="#6d7076" stopOpacity=".3" />
        </linearGradient>
        <radialGradient id="ah-rose-glow">
          <stop offset="0" stopColor="#b76e79" stopOpacity=".45" />
          <stop offset="1" stopColor="#b76e79" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#ah-rose-glow)" />
      {[88, 70, 52].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="url(#ah-chrome)" strokeWidth="1" />)}
      {Array.from({length: 60}, (_, i) => {
        const a = (i / 60) * Math.PI * 2;
        const r1 = i % 5 === 0 ? 76 : 80;
        const q = (n: number) => n.toFixed(2);
        return <line key={i} x1={q(100 + Math.cos(a) * r1)} y1={q(100 + Math.sin(a) * r1)} x2={q(100 + Math.cos(a) * 86)} y2={q(100 + Math.sin(a) * 86)} stroke="#b9bcc2" strokeOpacity=".45" strokeWidth="1" />;
      })}
      <rect x="96" y="54" width="8" height="26" rx="4" fill="#e8b4a0" />
      <circle cx="100" cy="100" r="6" fill="#e8b4a0" />
    </svg>
  );
}

export function VaultLocked({reason}: {reason: 'signed_out' | 'error' | 'not_vip'}) {
  const copy =
    reason === 'signed_out'
      ? 'Sign in to open your Vault.'
      : reason === 'error'
        ? "We couldn't confirm your membership just now. Your Vault stays closed until we can. Try again in a moment."
        : 'The Vault is for key holders: your prepaid Finesse card in Nano Black, Platinum or Rose Gold, with 12% back on every purchase.';
  return (
    <AHRoom>
      <AHTopBar right={<AHChip>{reason === 'not_vip' ? 'Key holders' : 'Closed'}</AHChip>} />
      <div style={{textAlign: 'center', paddingTop: 20}}>
        <ClosedDial />
        <AHEyebrow>The Vault</AHEyebrow>
        <AHDisplay size="l" style={{marginTop: 8}}>{reason === 'not_vip' ? 'By key only.' : 'Closed.'}</AHDisplay>
        <p style={{margin: '14px auto 26px', maxWidth: 340, fontSize: 15, lineHeight: 1.5, color: 'var(--ah-mute)'}}>{copy}</p>
        {reason === 'signed_out' ? (
          <AHPill href="/login">Sign in</AHPill>
        ) : reason === 'error' ? (
          <AHPill onClick={() => window.location.reload()}>Try again</AHPill>
        ) : (
          <AHPill href="/profile?upgrade=true" variant="rose">Become a key holder</AHPill>
        )}
        <div style={{marginTop: 18}}>
          <Link href="/lobby" style={{fontSize: 14, color: 'var(--ah-mute)', textDecoration: 'none', display: 'inline-block', padding: '12px 0'}}>Back to the Lobby</Link>
        </div>
      </div>
    </AHRoom>
  );
}

export function VaultLoading() {
  return (
    <AHRoom>
      <div role="status" aria-label="Opening the Vault" style={{display: 'grid', gap: 14, paddingTop: 40}}>
        <AHSkeleton h={12} w={140} />
        <AHSkeleton h={60} w="60%" />
        <AHSkeleton h={220} r={20} style={{marginTop: 20}} />
      </div>
    </AHRoom>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
export function VaultFooter() {
  return (
    <footer style={{textAlign: 'center', padding: '28px 0 10px'}}>
      <Link href="/lobby" style={{fontSize: 14, color: 'var(--ah-mute)', textDecoration: 'none', display: 'inline-block', padding: '12px 0'}}>Back to the Lobby</Link>
    </footer>
  );
}

/* ─── The whole room (used by page.tsx and the design previews) ─────────── */
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
    <AHRoom>
      <VaultToast toast={toast} />
      <VaultHeader />
      <VaultChamber finish={finish} onFinish={onFinish} flipped={flipped} onFlip={onFlip} brand={brand} holder={holder} accent={accent} doorState={doorState} />
      <div style={{display: 'grid', gap: 30, marginTop: 36}}>
        <VaultLedger loading={loading} balanceCents={balanceCents} cashbackCents={cashbackCents} />
        <AHPill block onClick={() => onFundOpen(true)}>Fund your Vault</AHPill>
        <DepositBoxes loading={loading} transactions={transactions} onFund={() => onFundOpen(true)} />
      </div>
      <VaultFooter />
      <FundModal open={fundOpen} loading={fundLoading} onConfirm={onFundConfirm} onClose={() => onFundOpen(false)} />
    </AHRoom>
  );
}
