'use client';

// The Entrance view (After Hours). Presentational only: the KeyLock flow, challenge and verification
// live in page.tsx (or the design preview). The door's seam warms with each digit typed; that is
// progress only and never reveals whether a digit is right.

import {useState, type ChangeEvent, type RefObject} from 'react';
import Link from 'next/link';
import {AnimatePresence, motion, type useAnimation} from 'framer-motion';
import {AHChip, AHClock, AHDisplay, AHEyebrow, AHRoom, AHTopBar, ahcx} from '@/components/after-hours';
import './entrance.css';

export type EntranceGender = 'feminine' | 'masculine';

export type EntranceViewProps = {
  digits: string[];
  flash: number | null;
  error: boolean;
  message: string;
  verifying: boolean;
  preview: boolean;
  opening: boolean;
  lightFlood: boolean;
  showChoice: boolean;
  reduceMotion: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onInput?: (e: ChangeEvent<HTMLInputElement>) => void;
  onChoose?: (gender: EntranceGender) => void;
  shake?: ReturnType<typeof useAnimation>;
  /** Design preview only: draw the key field as focused. */
  forceFocus?: boolean;
};

const EASE = [0.4, 0, 0.2, 1] as const;

export function EntranceView(props: EntranceViewProps) {
  const {digits, flash, error, message, verifying, preview, opening, lightFlood, showChoice, reduceMotion, inputRef, onInput, onChoose, shake, forceFocus} = props;
  const [focused, setFocused] = useState(false);
  const isFocused = focused || !!forceFocus;
  const progress = opening ? 1 : digits.length / 6;
  const dur = (s: number) => (reduceMotion ? 0 : s);

  let line: React.ReactNode;
  if (error) line = <p className="ent-line ent-line-error">{message}</p>;
  else if (opening) line = <p className="ent-line" style={{color: 'var(--ah-rose)'}}>You’re on the list. Doors opening.</p>;
  else if (verifying) line = <p className="ent-line">Checking the list…</p>;
  else line = <p className="ent-line">Six digits. The door opens on the last one.</p>;

  return (
    <div onClick={() => inputRef?.current?.focus()}>
      <AHRoom wide className="ent-root">
        <AHTopBar right={<><AHClock /><AHChip>By invitation</AHChip></>} />

        <div className="ent-grid">
          {/* The door */}
          <div className="ent-stage" style={{['--p' as string]: progress}} aria-hidden>
            <div className="ent-floor" />
            <div className="ent-arch">
              <div className="ent-arch-inner">
                <div className="ent-light" />
                <motion.div className="ent-panel ent-panel-l" animate={{x: opening ? '-101%' : 0}} transition={{duration: dur(1.1), delay: dur(0.15), ease: EASE}}>
                  <span className="ent-handle" />
                </motion.div>
                <motion.div className="ent-panel ent-panel-r" animate={{x: opening ? '101%' : 0}} transition={{duration: dur(1.1), delay: dur(0.15), ease: EASE}}>
                  <span className="ent-handle" />
                </motion.div>
                {!opening && <div className="ent-seam" />}
                {!opening && <div className="ent-under" />}
              </div>
            </div>
            <div className="ent-rope">
              <svg viewBox="0 0 300 70" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ent-rope" x1="0" x2="1">
                    <stop offset="0" stopColor="#8e4b55" />
                    <stop offset=".5" stopColor="#d58f98" />
                    <stop offset="1" stopColor="#8e4b55" />
                  </linearGradient>
                  <linearGradient id="ent-post" x1="0" x2="1">
                    <stop offset="0" stopColor="#6d7076" />
                    <stop offset=".45" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#6d7076" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M18 26 Q150 66 282 26"
                  fill="none"
                  stroke="url(#ent-rope)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  animate={opening ? {opacity: 0, y: 16} : {opacity: 1, y: 0}}
                  transition={{duration: dur(0.5), ease: 'easeIn'}}
                />
                {[12, 288].map((x) => (
                  <g key={x}>
                    <rect x={x - 3} y="22" width="6" height="46" rx="2" fill="url(#ent-post)" />
                    <ellipse cx={x} cy="69" rx="10" ry="2.5" fill="url(#ent-post)" />
                    <circle cx={x} cy="19" r="6" fill="url(#ent-post)" />
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Copy + guest-list key */}
          <div className="ent-copy">
            <AHEyebrow>The door · Members &amp; their guests</AHEyebrow>
            <AHDisplay style={{marginTop: 14, fontSize: 'clamp(50px, 6vw + 26px, 112px)'}}>
              Say the <span className="ah-rose-text">word.</span>
            </AHDisplay>
            <p className="ent-body">
              Entry is by invitation. Enter the <strong>six-digit key</strong> from yours and the door does the rest.
            </p>

            <motion.div animate={shake}>
              <label htmlFor="entrance-key" className={ahcx('ent-list', isFocused && !error && 'is-focus', error && 'is-error')}>
                <span className="ent-list-head">
                  <AHEyebrow style={{color: 'var(--ah-text)'}}>Guest list · Your key</AHEyebrow>
                  <span className="ent-count ah-num">{digits.length}/6</span>
                </span>
                <span className="ent-slots">
                  {Array.from({length: 6}).map((_, i) => {
                    const d = digits[i];
                    const isNext = i === digits.length && isFocused && !opening && !error && !verifying;
                    return (
                      <span key={i} className={ahcx('ent-slot', d && 'is-filled', flash === i && 'is-flash', error && 'is-error')}>
                        {d ? (
                          <motion.span className="ah-num" initial={reduceMotion ? false : {opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{duration: 0.25}}>
                            {d}
                          </motion.span>
                        ) : isNext ? <i className="ent-caret" /> : <i className="ent-slot-dot" />}
                      </span>
                    );
                  })}
                </span>
                {line}
                {preview && !opening && (
                  <p className="ent-line ent-line-preview" style={{marginTop: 6}}>Preview entrance · any six digits open the doors</p>
                )}
              </label>
            </motion.div>

            <input
              id="entrance-key"
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={digits.join('')}
              onChange={onInput ?? (() => {})}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="ent-input"
              autoFocus
              autoComplete="off"
              aria-label="Six-digit entrance code"
              aria-describedby="entrance-status"
            />
            <p id="entrance-status" role="status" aria-live="polite" className="sr-only">
              {verifying ? 'Checking the list' : error ? message : `${digits.length} of 6 digits entered`}
            </p>

            {!showChoice && (
              <div className="ent-foot">
                <span>
                  Not on the list?{' '}
                  <Link href="/signup" className="ent-link ah-focus" onClick={(e) => e.stopPropagation()}>
                    <span>Request an invitation</span>
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>
      </AHRoom>

      {/* The light behind the door */}
      <motion.div className="ent-flood" initial={{opacity: 0}} animate={{opacity: lightFlood && !showChoice ? 1 : 0}} transition={{duration: dur(0.9)}} />
      {!reduceMotion && (
        <motion.div
          className="ent-sweep"
          initial={{x: '-120%', opacity: 0}}
          animate={opening ? {x: '120%', opacity: [0, 1, 0]} : {x: '-120%', opacity: 0}}
          transition={{duration: 1.3, delay: 0.2, ease: [0.16, 1, 0.3, 1], times: [0, 0.22, 1]}}
          style={{skewX: -14}}
        />
      )}

      {/* Which floor first */}
      <AnimatePresence>
        {showChoice && (
          <motion.div
            className="ent-choice"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entrance-choice-title"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: dur(0.6)}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ent-choice-inner">
              <AHTopBar right={<AHChip live>You’re in</AHChip>} />
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                <motion.div initial={reduceMotion ? false : {opacity: 0, y: 14}} animate={{opacity: 1, y: 0}} transition={{delay: dur(0.2), duration: 0.5}}>
                  <AHEyebrow>Welcome to the house</AHEyebrow>
                  <AHDisplay as="h2" style={{marginTop: 14, fontSize: 'clamp(46px, 5vw + 26px, 96px)'}}>
                    <span id="entrance-choice-title">Which floor <span className="ah-rose-text">first?</span></span>
                  </AHDisplay>
                  <p className="ent-body">
                    This only sets what we feature for you. It’s taste, not identity, and every member is welcome on both.
                  </p>
                </motion.div>
                <div className="ent-options">
                  {([
                    {g: 'feminine', n: '01', name: 'Finesse', sub: 'Handbags · shoes · beauty · spa', tone: 'ent-option-rose'},
                    {g: 'masculine', n: '02', name: 'Carpe Diem', sub: 'Watches · golf · suits · whiskey', tone: 'ent-option-plat'},
                  ] as const).map((o, i) => (
                    <motion.button
                      key={o.g}
                      type="button"
                      className={ahcx('ent-option', o.tone)}
                      onClick={() => onChoose?.(o.g)}
                      initial={reduceMotion ? false : {opacity: 0, y: 20}}
                      animate={{opacity: 1, y: 0}}
                      transition={{delay: dur(0.35 + i * 0.1), duration: 0.5, ease: EASE}}
                    >
                      <span className="ent-option-top"><span>Floor {o.n}</span><span aria-hidden>→</span></span>
                      <span className="ent-option-name">{o.name}</span>
                      <span className="ent-option-sub">{o.sub}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
