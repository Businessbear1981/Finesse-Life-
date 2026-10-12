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
import {AHEyebrow} from '@/components/after-hours';
import './private-lift.css';

type Phase =
  | 'dormant' | 'calling' | 'ready' | 'confirm' | 'verifying' | 'unlocked'
  | 'signed_out' | 'not_entitled' | 'expired' | 'rate_limited' | 'unavailable';

// Seam light per track (After Hours rose gold; Carpe Diem runs a touch warmer).
const ACCENT: Record<Track, {glow: string; soft: string}> = {
  finesse: {glow: '#E8B4A0', soft: 'rgba(232,180,160,0.28)'},
  carpe_diem: {glow: '#ECC896', soft: 'rgba(236,200,150,0.28)'},
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
          ? 'First ride. Choose six numbers. The lift will remember them.'
          : 'Your six numbers, please.');
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
      setMessage('Once more, to confirm.');
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
  const lit = phase !== 'dormant' && !closed;
  const idleFloor = floor === '· · ·';

  return (
    <section aria-labelledby="private-lift-title" className="pl" data-track={track} data-lit={lit}>
      {/* Head: title + floor readout */}
      <div className="pl-head">
        <div>
          <AHEyebrow>The private lift · Key holders</AHEyebrow>
          <h2 id="private-lift-title" className="pl-title">Penthouse.</h2>
          <p className="pl-sub">A room above the room.</p>
        </div>
        <div className="pl-floor" aria-hidden="true">
          <span className="pl-floor-label">Floor</span>
          <span className="pl-floor-val" data-idle={idleFloor}>{floor}</span>
        </div>
      </div>

      {/* The car: chrome frame, black-glass doors */}
      <div className="pl-frame">
        <div className="pl-bay">
          {/* What waits behind the doors, revealed as they part */}
          <motion.div
            className="pl-beyond"
            initial={false}
            animate={{opacity: opening ? 1 : 0}}
            transition={reduce ? {duration: 0} : {duration: 1.2, delay: 1.3}}
            aria-hidden="true"
          >
            <div className="pl-beyond-sky" />
          </motion.div>

          {(['left', 'right'] as const).map((side) => {
            const slice = side === 'left' ? cells.slice(0, 3) : cells.slice(3);
            return (
              <motion.div
                key={side}
                className={`pl-door ${side === 'left' ? 'pl-door-l' : 'pl-door-r'}`}
                initial={false}
                animate={{x: opening ? (side === 'left' ? '-100%' : '100%') : 0}}
                transition={doorT}
              >
                <motion.div
                  key={`${side}-${shake}`}
                  className="pl-cells"
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
                        className="pl-cell"
                        data-filled={filled}
                        data-active={active}
                        initial={false}
                        animate={{opacity: showCipher ? 1 : 0.3, scale: filled && !reduce ? [0.86, 1] : 1}}
                        transition={{duration: reduce ? 0 : 0.16}}
                      >
                        {showCipher && filled
                          ? (mode === 'enroll' ? <i className="pl-dot" /> : d)
                          : <i className="pl-dot-empty" />}
                      </motion.div>
                    );
                  })}
                </motion.div>
                <span className="pl-door-word">{side === 'left' ? 'Private' : 'Lift'}</span>
              </motion.div>
            );
          })}

          {/* The seam: chrome hairline, rose light leaking through */}
          <motion.div
            aria-hidden="true"
            className="pl-seam"
            initial={false}
            animate={{
              background: phase === 'verifying' || opening
                ? `linear-gradient(180deg, transparent, ${accent.glow} 20%, #fff 50%, ${accent.glow} 80%, transparent)`
                : lit
                  ? `linear-gradient(180deg, transparent, ${accent.glow} 30%, ${accent.glow} 70%, transparent)`
                  : 'linear-gradient(180deg, transparent, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.22) 70%, transparent)',
              boxShadow: opening
                ? `0 0 36px 10px ${accent.soft}`
                : lit ? `0 0 18px 3px ${accent.soft}` : '0 0 0 0 transparent',
              opacity: opening ? [1, 1, 0] : 1,
            }}
            transition={reduce ? {duration: 0} : {duration: 1.4}}
          />

          {/* Closed-state plate */}
          <AnimatePresence>
            {closed && (
              <motion.div
                className="pl-plate"
                initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}
                role="alert"
              >
                <p className="pl-plate-title">{closed.title}.</p>
                <p className="pl-plate-msg">{message}</p>
                <div className="pl-plate-actions">
                  {closed.cta && (
                    <Link href={closed.cta.href} className="ah-pill ah-pill-solid">
                      {closed.cta.label}
                    </Link>
                  )}
                  <button type="button" onClick={() => { setPhase('dormant'); setFloor('· · ·'); }} className="ah-pill ah-pill-ghost">
                    Step back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
      <p role="status" aria-live="polite" className="pl-status">
        {phase === 'verifying' ? 'Going up…' : !closed ? message : ''}
      </p>

      {/* Controls */}
      <div style={{marginTop: 16}}>
        {phase === 'dormant' && (
          <button type="button" onClick={() => void call()} className="pl-call">
            <span>Call the lift</span>
            <span className="pl-call-btn" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2.5 12 9H2z" fill="currentColor" /></svg>
            </span>
          </button>
        )}
        {phase === 'calling' && (
          <p style={{margin: 0, textAlign: 'center'}}>
            <span className="pl-calling"><i className="ah-live-dot ah-live-dot-pulse" />The lift is on its way</span>
          </p>
        )}
        {(phase === 'ready' || phase === 'confirm') && (
          <div className="pl-keypad" role="group" aria-label="Lift keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" onClick={() => press(d)} className="pl-key" aria-label={`Digit ${d}`}>{d}</button>
            ))}
            <button type="button" onClick={back} className="pl-key pl-key-text" aria-label="Remove last digit">Back</button>
            <button type="button" onClick={() => press('0')} className="pl-key" aria-label="Digit 0">0</button>
            <button type="button" onClick={() => { setPhase('dormant'); setFloor('· · ·'); setDigits(''); }} className="pl-key pl-key-text">Leave</button>
          </div>
        )}
        {(phase === 'ready' || phase === 'confirm') && mode === 'enroll' && (
          <p className="pl-fine">
            Your six numbers are stored only as a one-way hash. They open the lift; they never grant membership.
          </p>
        )}
      </div>
      {doorsClosed && phase !== 'unlocked' && <span className="sr-only">Doors closed.</span>}
    </section>
  );
}
