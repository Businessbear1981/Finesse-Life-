'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {motion, useReducedMotion} from 'framer-motion';
import {trackFromGender, type Track} from '@/lib/rooms/registry';

const ARRIVAL: Record<Track, {gradient: string; accent: string; lines: string[]}> = {
  finesse: {
    gradient: 'linear-gradient(180deg, rgba(255,77,125,0.22) 0%, rgba(201,169,97,0.12) 35%, #080406 75%)',
    accent: '#FF4D7D',
    lines: ['Private care', 'Styling by appointment', 'The inner circle'],
  },
  carpe_diem: {
    gradient: 'linear-gradient(180deg, rgba(255,169,107,0.22) 0%, rgba(107,80,40,0.2) 35%, #080406 75%)',
    accent: '#FFA96B',
    lines: ['Tables held', 'Travel and access', 'The inner circle'],
  },
};

const SUITES = [
  {href: '/vip', label: 'The Inner Room', note: 'Private feed, exclusives and Telegram line — live'},
  {href: '/concierge', label: 'Nova, after hours', note: 'Concierge requests routed with VIP context — live'},
  {href: '/backstage', label: 'Backstage', note: 'Your private profile, behind its own KeyLock — live'},
  {href: '/stylist', label: 'The Stylist', note: 'Human edit layer — preview'},
];

export function PenthouseScene({expiresAt}: {expiresAt: string}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [track, setTrack] = useState<Track>('finesse');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read client-only side preference
    setTrack(trackFromGender(localStorage.getItem('finesse_gender')));
  }, []);

  const a = ARRIVAL[track];
  const until = new Date(expiresAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

  const lock = async () => {
    setClosing(true);
    await fetch('/api/vip-keylock/lock', {method: 'POST'}).catch(() => undefined);
    router.push('/lobby');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080406] text-cream">
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{background: a.gradient}}
        initial={reduce ? false : {clipPath: 'inset(0 50% 0 50%)'}}
        animate={{clipPath: 'inset(0 0% 0 0%)'}}
        transition={{duration: 0.9, ease: [0.16, 1, 0.3, 1]}}
        aria-hidden="true"
      />
      {/* Skyline window: stepped Deco mullions */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] opacity-60" aria-hidden="true"
        style={{background: 'repeating-linear-gradient(90deg, transparent 0 calc(12.5% - 1px), rgba(201,169,97,0.25) calc(12.5% - 1px) 12.5%)'}} />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-20 text-center">
        <p className="font-label text-[11px] uppercase tracking-[0.6em] text-brass">Floor 17 · P</p>
        <h1 className="mt-4 font-display text-5xl italic tracking-[0.08em] text-brass-highlight sm:text-6xl">The Penthouse</h1>
        <p className="mt-3 font-body text-lg italic text-cream/80">The lift remembers you.</p>
        <div className="mt-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px w-16 bg-brass/50" /><span className="h-2 w-2 rotate-45" style={{background: a.accent}} /><span className="h-px w-16 bg-brass/50" />
        </div>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 font-label text-[10px] uppercase tracking-[0.35em] text-cream/70">
          {a.lines.map((l) => <li key={l}>{l}</li>)}
        </ul>

        <nav aria-label="Penthouse suites" className="mt-12 grid w-full gap-3 sm:grid-cols-2">
          {SUITES.map((s) => (
            <Link key={s.href} href={s.href} className="group min-h-20 border border-brass/30 bg-ink/70 p-5 text-left transition hover:border-brass/70">
              <span className="block font-display text-xl text-cream group-hover:text-brass-highlight">{s.label}</span>
              <span className="mt-1 block font-body text-sm italic text-cream/60">{s.note}</span>
            </Link>
          ))}
        </nav>

        <p className="mt-10 font-body text-xs italic text-cream/50">
          Lift session held until {until}. Arriving here is access, not a purchase.
        </p>
        <button
          type="button"
          onClick={() => void lock()}
          disabled={closing}
          className="mt-4 min-h-11 border border-brass/40 px-5 py-3 font-label text-[10px] uppercase tracking-[0.4em] text-brass hover:bg-brass/10 disabled:opacity-50"
        >
          {closing ? 'Descending…' : 'Close the lift'}
        </button>
      </div>
    </main>
  );
}
