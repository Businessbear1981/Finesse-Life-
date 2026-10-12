'use client';

// The Penthouse, After Hours: the top of the house at night. Purely presentational over the gate in
// page.tsx (VIP entitlement + a live private-lift session); the only action here is closing the lift.

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion, useReducedMotion} from 'framer-motion';
import {AHCard, AHChip, AHDisplay, AHEyebrow, AHIndex, AHPill, AHSection, useLocalPref, type IndexItem} from '@/components/after-hours';
import {trackFromGender, type Track} from '@/lib/rooms/registry';
import './penthouse.css';

const ARRIVAL: Record<Track, {lines: string[]}> = {
  finesse: {lines: ['Private care', 'Styling by appointment', 'The inner circle']},
  carpe_diem: {lines: ['Tables held', 'Travel and access', 'The inner circle']},
};

// Honest labels: what is wired today vs. a preview.
const SUITES: IndexItem[] = [
  {href: '/vip', name: 'The Inner Room', sub: 'Private feed, exclusives and the Telegram line', tag: 'Live', tagTone: 'live'},
  {href: '/concierge', name: 'Nova, after hours', sub: 'Concierge requests routed with VIP context', tag: 'Live', tagTone: 'live'},
  {href: '/backstage', name: 'Backstage', sub: 'Your private profile, behind its own KeyLock', tag: 'Live', tagTone: 'live'},
  {href: '/stylist', name: 'The Stylist', sub: 'Human edit layer', tag: 'Preview'},
];

/* A deterministic night skyline (no randomness at render). */
type Tower = {x: number; w: number; h: number; lit: [number, number][]};
const TOWERS: Tower[] = (() => {
  let seed = 23;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const out: Tower[] = [];
  let x = -6;
  while (x < 1200) {
    const w = 14 + Math.round(rnd() * 26);
    const tall = rnd() > 0.82;
    const h = tall ? 120 + Math.round(rnd() * 70) : 40 + Math.round(rnd() * 80);
    const lit: [number, number][] = [];
    for (let row = 8; row < h - 6; row += 7) {
      for (let col = 4; col < w - 4; col += 5) if (rnd() > 0.86) lit.push([col, row]);
    }
    out.push({x, w, h, lit});
    x += w + 2 + Math.round(rnd() * 4);
  }
  return out;
})();

function Skyline() {
  return (
    <svg className="ph-skyline" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ph-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141218" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
      </defs>
      {TOWERS.map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${220 - t.h})`}>
          <rect width={t.w} height={t.h} fill="url(#ph-tower)" />
          <rect width={t.w} height="0.6" fill="rgba(255,255,255,.18)" />
          {t.lit.map(([cx, cy], j) => (
            <rect key={j} x={cx} y={cy} width="1.6" height="2.2" className={j % 3 === 0 ? 'ph-win ph-win-warm' : 'ph-win'} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function PenthouseScene({expiresAt}: {expiresAt: string}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const track = useLocalPref<Track>('finesse_gender', trackFromGender, 'finesse');
  const [closing, setClosing] = useState(false);

  const a = ARRIVAL[track];
  const until = new Date(expiresAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

  const lock = async () => {
    setClosing(true);
    await fetch('/api/vip-keylock/lock', {method: 'POST'}).catch(() => undefined);
    router.push('/lobby');
  };

  return (
    <main className="ah-room ph" data-track={track}>
      {/* The view: night sky, skyline, floor-to-ceiling glass. Opens from the centre like the lift doors. */}
      <motion.div
        className="ph-view"
        initial={reduce ? false : {clipPath: 'inset(0 50% 0 50%)'}}
        animate={{clipPath: 'inset(0 0% 0 0%)'}}
        transition={{duration: 0.9, ease: [0.16, 1, 0.3, 1]}}
        aria-hidden="true"
      >
        <div className="ph-sky" />
        <Skyline />
        <div className="ph-glass" />
        <div className="ph-fade" />
      </motion.div>

      <div className="ah-wrap ph-wrap">
        <header className="ph-top">
          <span className="ah-mark">FINESSE</span>
          <span className="ph-floor" aria-label="Floor 17, Penthouse">
            <span>17</span>
            <i aria-hidden="true" />
            <span>P</span>
          </span>
        </header>

        <section className="ph-hero">
          <AHEyebrow>Floor 17 · The top of the house</AHEyebrow>
          <AHDisplay size="xl" style={{marginTop: 12}}>The<br />Penthouse.</AHDisplay>
          <p className="ah-serif-i" style={{margin: '14px 0 0', fontSize: 22, lineHeight: 1.2, color: 'var(--ah-text)'}}>
            The lift remembers you.
          </p>
          <ul className="ph-lines">
            {a.lines.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </section>

        <AHSection title="On this floor" style={{marginTop: 44}}>
          <nav aria-label="Penthouse suites">
            <AHIndex items={SUITES} />
          </nav>
        </AHSection>

        <AHCard glass className="ph-session">
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
            <AHChip><i className="ah-live-dot" />Lift held</AHChip>
            <span className="ah-num" style={{fontSize: 13, color: 'var(--ah-mute)'}} suppressHydrationWarning>until {until}</span>
          </div>
          <p style={{margin: '14px 0 16px', fontSize: 13, lineHeight: 1.5, color: 'var(--ah-mute)'}}>
            Your lift session is held for a while. Arriving here is access, not a purchase.
          </p>
          <AHPill variant="ghost" block onClick={() => void lock()} disabled={closing}>
            {closing ? 'Descending…' : 'Close the lift'}
          </AHPill>
        </AHCard>
      </div>
    </main>
  );
}
