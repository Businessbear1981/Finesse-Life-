'use client';

/**
 * THE PRIVATE LIFT — Lobby VIP / Penthouse elevator (room 23 destination).
 * Ceremony over an existing entitlement: the doors open ONLY when
 * POST /api/vip-keylock/verify returns state "unlocked". No client state,
 * animation or stored value can open them.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import type {Track, VipLiftChallengeResponse, VipLiftVerifyResponse} from '@/lib/contracts';

type Phase =
  | 'dormant' | 'calling' | 'ready' | 'confirm' | 'verifying' | 'unlocked'
  | 'signed_out' | 'not_entitled' | 'expired' | 'rate_limited' | 'unavailable';

const ACCENT: Record<Track, {glow: string; soft: string}> = {
  finesse: {glow: '#FF4D7D', soft: 'rgba(255,77,125,0.18)'},
  carpe_diem: {glow: '#FFA96B', soft: 'rgba(255,169,107,0.2)'},
};

const CLOSED_COPY: Partial<Record<Phase, {title: string; cta?: {href: string; label: string}}>> = {
  signed_out: {title: 'The private lift answers to members', cta: {href: '/login', label: 'Sign in'}},
  not_entitled: {title: 'The private lift remains closed', cta: {href: '/profile?upgrade=true', label: 'View VIP access'}},
  expired: {title: 'Your floor has lapsed', cta: {href: '/profile?upgrade=true', label: 'Renew VIP access'}},
  rate_limited: {title: 'The lift is resting'},
  unavailable: {title: 'The lift is being serviced'},
};

export function PrivateLift({track}: {track: Track}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const accent = ACCENT[track];
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('dormant');
  const [mode, setMode] = useState<'verify' | 'enroll'>('verify');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [digits, setDigits] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [message, setMessage] = useState('');
  const [floor, setFloor] = useState('· · ·');
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (phase === 'ready' || phase === 'confirm') inputRef.current?.focus();
  }, [phase]);

  const call = useCallback(async () => {
    setPhase('calling');
    setFloor('CALL');
    setDigits('');
    setFirstPin('');
    setMessage('');
    try {
      const res = await fetch('/api/vip-keylock/challenge', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({track}),
      });
      const body = (await res.json()) as VipLiftChallengeResponse;
      if (body.state === 'ready') {
        setChallengeId(body.challengeId);
        setMode(body.mode);
        setFloor('01');
        setMessage(body.mode === 'enroll'
          ? 'First ride. Choose six brass numbers — the lift will remember them.'
          : 'Align the six brass numbers.');
        setTimeout(() => setPhase('ready'), reduce ? 0 : 850);
      } else {
        setMessage(body.message);
        setFloor('· · ·');
        setPhase(body.state);
      }
    } catch {
      setMessage('The private lift is being serviced.');
      setPhase('unavailable');
    }
  }, [track, reduce]);

  const verify = useCallback(async (code: string) => {
    if (!challengeId) return;
    setPhase('verifying');
    try {
      const res = await fetch('/api/vip-keylock/verify', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({challengeId, code, destination: 'penthouse'}),
      });
      const body = (await res.json()) as VipLiftVerifyResponse;
      if (body.state === 'unlocked') {
        setPhase('unlocked');
        setMessage('The lift remembers you. Penthouse — floor 17.');
        if (reduce) {
          setFloor('P');
          setTimeout(() => router.push(body.href), 300);
          return;
        }
        ['03', '07', '11', '14', '17', 'P'].forEach((f, i) => setTimeout(() => setFloor(f), 140 * (i + 1)));
        setTimeout(() => router.push(body.href), 2400);
        return;
      }
      setMessage(body.message);
      setShake((n) => n + 1);
      setDigits('');
      setFirstPin('');
      if (body.state === 'invalid' && (body.attemptsRemaining ?? 1) > 0) {
        setPhase('ready');
      } else if (body.state === 'invalid' || body.state === 'expired') {
        setPhase('dormant');
        setFloor('· · ·');
      } else {
        setPhase(body.state);
      }
    } catch {
      setMessage('The private lift is being serviced.');
      setPhase('unavailable');
    }
  }, [challengeId, reduce, router]);

  const accept = useCallback((next: string) => {
    if (phase !== 'ready' && phase !== 'confirm') return;
    const clean = next.replace(/\D/g, '').slice(0, 6);
    setDigits(clean);
    if (clean.length < 6) return;
    if (mode === 'enroll' && phase === 'ready') {
      setFirstPin(clean);
      setDigits('');
      setMessage('Once more, to set the tumblers.');
      setPhase('confirm');
      return;
    }
    if (mode === 'enroll' && phase === 'confirm' && clean !== firstPin) {
      setMessage('The two settings differ. Choose your six numbers again.');
      setShake((n) => n + 1);
      setDigits('');
      setFirstPin('');
      setPhase('ready');
      return;
    }
    void verify(clean);
  }, [phase, mode, firstPin, verify]);

  const press = (d: string) => accept(digits + d);
  const back = () => setDigits((v) => v.slice(0, -1));

  const doorsClosed = phase !== 'dormant' && !CLOSED_COPY[phase];
  const showCipher = phase === 'ready' || phase === 'confirm' || phase === 'verifying' || phase === 'unlocked';
  const opening = phase === 'unlocked';
  const closed = CLOSED_COPY[phase];
  const cells = digits.padEnd(6, ' ').split('');
  const doorT = reduce ? {duration: 0} : {duration: 1.25, ease: [0.65, 0, 0.35, 1] as const, delay: 1.1};

  return (
    <section aria-labelledby="private-lift-title" className="relative mx-auto w-full max-w-[680px] px-4 py-10">
      {/* Canopy */}
      <div className="relative mx-auto flex flex-col items-center">
        <div className="h-px w-[86%] bg-gradient-to-r from-transparent via-brass/60 to-transparent" />
        <div className="mt-1 h-px w-[72%] bg-gradient-to-r from-transparent via-brass/40 to-transparent" />
        <div className="mt-1 h-px w-[58%] bg-gradient-to-r from-transparent via-brass/30 to-transparent" />
        <div className="-mt-3 h-6 w-6 rotate-45 border border-brass/60 bg-ink" style={{boxShadow: phase !== 'dormant' ? `0 0 18px ${accent.soft}` : 'none'}} />
        <h2 id="private-lift-title" className="mt-3 font-label text-[11px] uppercase tracking-[0.55em] text-brass/80">
          The Private Lift
        </h2>
        <p className="mt-1 font-body text-sm italic text-cream/60">A room above the room.</p>
      </div>

      <div className="mt-6 flex items-stretch justify-center gap-3 sm:gap-5">
        {/* Floor indicator */}
        <div className="hidden w-14 flex-col items-center justify-start sm:flex" aria-hidden="true">
          <div className="flex h-16 w-14 items-center justify-center rounded-t-full border border-brass/40 bg-[#080406]">
            <span className="font-display text-lg" style={{color: floor === 'P' ? '#F4E8D0' : '#E8C87A', textShadow: floor === 'P' ? `0 0 14px ${accent.glow}` : 'none'}}>
              {floor}
            </span>
          </div>
          <div className="h-full w-px bg-gradient-to-b from-brass/40 to-transparent" />
        </div>

        {/* Bay: fluted columns + doors */}
        <div className="relative flex w-full max-w-[520px]">
          <div className="w-3 shrink-0 sm:w-5" style={{background: 'repeating-linear-gradient(90deg,#6B5028 0 2px,#C9A961 2px 4px,#3a2a14 4px 6px)'}} aria-hidden="true" />
          <div
            className="relative flex-1 overflow-hidden border-y border-brass/40"
            style={{aspectRatio: '4 / 5', background: `radial-gradient(ellipse at 50% 30%, ${accent.soft} 0%, #080406 60%)`}}
          >
            {/* Interior light revealed when doors open */}
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{opacity: opening ? 1 : 0}}
              transition={reduce ? {duration: 0} : {duration: 1.2, delay: 1.3}}
              style={{background: `linear-gradient(180deg, #F4E8D0 0%, ${accent.glow}55 55%, #080406 100%)`}}
              aria-hidden="true"
            />

            {(['left', 'right'] as const).map((side) => {
              const slice = side === 'left' ? cells.slice(0, 3) : cells.slice(3);
              return (
                <motion.div
                  key={side}
                  className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
                  style={{
                    [side]: 0, width: '50%',
                    background: 'linear-gradient(180deg,#1a0a0f 0%,#17090D 50%,#0e0508 100%)',
                    borderRight: side === 'left' ? '1px solid rgba(201,169,97,0.25)' : undefined,
                    borderLeft: side === 'right' ? '1px solid rgba(201,169,97,0.25)' : undefined,
                  }}
                  initial={false}
                  animate={{x: opening ? (side === 'left' ? '-100%' : '100%') : 0}}
                  transition={doorT}
                >
                  {/* Inset Deco linework */}
                  <div className="pointer-events-none absolute inset-4 border border-brass/15" aria-hidden="true" />
                  <div className="pointer-events-none absolute inset-8 border border-brass/10" aria-hidden="true" />
                  <svg className="pointer-events-none absolute top-8 h-16 w-16 opacity-40" viewBox="0 0 64 64" aria-hidden="true">
                    {[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165].map((a) => (
                      <line key={a} x1="32" y1="62" x2={32 + 30 * Math.cos((a * Math.PI) / 180) * (side === 'left' ? -1 : 1)} y2={62 - 30 * Math.sin((a * Math.PI) / 180)} stroke="#C9A961" strokeWidth="0.6" />
                    ))}
                  </svg>

                  <motion.div
                    key={`${side}-${shake}`}
                    className="relative z-10 flex gap-2"
                    animate={shake && !reduce ? {x: [0, -8, 8, -4, 4, 0]} : {}}
                    transition={{duration: 0.45}}
                  >
                    {slice.map((d, i) => {
                      const index = side === 'left' ? i : i + 3;
                      const filled = d.trim() !== '';
                      const active = showCipher && index === digits.length && phase !== 'verifying' && phase !== 'unlocked';
                      return (
                        <motion.div
                          key={index}
                          aria-hidden="true"
                          className="flex h-14 w-9 items-center justify-center border sm:h-16 sm:w-11"
                          style={{
                            borderColor: active ? '#F4E8D0' : filled ? '#E8C87A' : 'rgba(107,80,40,0.8)',
                            background: 'linear-gradient(180deg,#0a0406,#1d0e12 50%,#0a0406)',
                            boxShadow: filled ? `inset 0 0 10px rgba(232,200,122,0.25), 0 0 12px ${accent.soft}` : 'inset 0 0 8px #000',
                          }}
                          initial={false}
                          animate={{opacity: showCipher ? 1 : 0.25, rotateX: filled && !reduce ? [90, 0] : 0}}
                          transition={{duration: reduce ? 0 : 0.16}}
                        >
                          <span className="font-display text-xl text-brass-highlight sm:text-2xl">
                            {showCipher ? (filled ? (mode === 'enroll' ? '◆' : d) : '·') : '·'}
                          </span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                  <span className="relative z-10 mt-4 font-label text-[9px] uppercase tracking-[0.4em] text-brass/40">
                    {side === 'left' ? 'Private' : 'Lift'}
                  </span>
                </motion.div>
              );
            })}

            {/* Center seam + keyhole diamond */}
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
              initial={false}
              animate={{
                background: phase === 'verifying' || opening ? '#F4E8D0' : 'rgba(201,169,97,0.35)',
                boxShadow: opening ? `0 0 28px 6px ${accent.glow}88` : '0 0 0 transparent',
                opacity: opening ? [1, 1, 0] : 1,
              }}
              transition={reduce ? {duration: 0} : {duration: 1.4}}
            />
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border"
              initial={false}
              animate={{
                borderColor: digits.length === 6 || phase === 'verifying' || opening ? '#F4E8D0' : '#6B5028',
                backgroundColor: opening ? '#F4E8D0' : '#080406',
                opacity: opening ? 0 : 1,
              }}
              transition={reduce ? {duration: 0} : {duration: 0.6, delay: opening ? 0.9 : 0}}
            />

            {/* Closed-state plate */}
            <AnimatePresence>
              {closed && (
                <motion.div
                  className="absolute inset-x-6 bottom-8 z-20 border border-brass/40 bg-ink/90 p-5 text-center"
                  initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}
                  role="alert"
                >
                  <p className="font-label text-[10px] uppercase tracking-[0.4em] text-brass">{closed.title}</p>
                  <p className="mt-2 font-body text-sm italic text-cream/75">{message}</p>
                  <div className="mt-4 flex justify-center gap-3">
                    {closed.cta && (
                      <Link href={closed.cta.href} className="min-h-11 border border-brass/60 px-4 py-3 font-label text-[10px] uppercase tracking-[0.3em] text-brass-highlight hover:bg-brass/10">
                        {closed.cta.label}
                      </Link>
                    )}
                    <button type="button" onClick={() => { setPhase('dormant'); setFloor('· · ·'); }} className="min-h-11 px-4 py-3 font-label text-[10px] uppercase tracking-[0.3em] text-cream/60 hover:text-cream">
                      Step back
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="w-3 shrink-0 sm:w-5" style={{background: 'repeating-linear-gradient(90deg,#3a2a14 0 2px,#C9A961 2px 4px,#6B5028 4px 6px)'}} aria-hidden="true" />
        </div>
      </div>

      {/* Hidden keyboard capture (digits, backspace, paste, Enter) */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        maxLength={6}
        value={digits}
        onChange={(e) => accept(e.target.value)}
        onPaste={(e) => { e.preventDefault(); accept(e.clipboardData.getData('text')); }}
        className="sr-only"
        aria-label={`VIP cipher, ${digits.length} of 6 digits entered`}
        disabled={!(phase === 'ready' || phase === 'confirm')}
      />

      {/* Status line */}
      <p role="status" aria-live="polite" className="mt-5 min-h-6 text-center font-body text-base italic text-cream/80">
        {phase === 'verifying' ? 'The motor engages…' : !closed ? message : ''}
      </p>

      {/* Controls */}
      <div className="mt-4 flex flex-col items-center gap-4">
        {phase === 'dormant' && (
          <button
            type="button"
            onClick={() => void call()}
            className="min-h-12 w-full max-w-sm border border-brass/70 bg-gradient-to-b from-[#2a1418] to-ink px-6 py-3 font-label text-xs uppercase tracking-[0.45em] text-brass-highlight transition hover:shadow-[0_0_24px_rgba(201,169,97,0.25)]"
          >
            Penthouse · Call the lift
          </button>
        )}
        {phase === 'calling' && <p className="font-label text-[10px] uppercase tracking-[0.4em] text-brass/70">The lift is arriving…</p>}
        {(phase === 'ready' || phase === 'confirm') && (
          <div className="grid w-full max-w-xs grid-cols-3 gap-2" role="group" aria-label="Brass keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" onClick={() => press(d)} className="min-h-12 border border-brass/30 font-display text-xl text-brass-highlight hover:bg-brass/10" aria-label={`Digit ${d}`}>{d}</button>
            ))}
            <button type="button" onClick={back} className="min-h-12 border border-brass/20 font-label text-[9px] uppercase tracking-[0.25em] text-cream/60" aria-label="Remove last digit">Back</button>
            <button type="button" onClick={() => press('0')} className="min-h-12 border border-brass/30 font-display text-xl text-brass-highlight hover:bg-brass/10" aria-label="Digit 0">0</button>
            <button type="button" onClick={() => { setPhase('dormant'); setFloor('· · ·'); setDigits(''); }} className="min-h-12 border border-brass/20 font-label text-[9px] uppercase tracking-[0.25em] text-cream/60">Leave</button>
          </div>
        )}
        {(phase === 'ready' || phase === 'confirm') && mode === 'enroll' && (
          <p className="max-w-sm text-center font-body text-xs italic text-cream/55">
            Your six numbers are stored only as a one-way hash. They open the lift; they never grant membership.
          </p>
        )}
      </div>
      {doorsClosed && phase !== 'unlocked' && <span className="sr-only">Doors closed.</span>}
    </section>
  );
}
