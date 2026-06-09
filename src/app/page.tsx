'use client';

import {useState, useRef, useEffect, useCallback} from 'react';
import {motion, useAnimation, AnimatePresence} from 'framer-motion';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

const DEMO_PIN = '123456';

function boltsGone(count: number): boolean {
  return count >= 5;
}

export default function VaultEntrance() {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [lightFlood, setLightFlood] = useState(false);
  const [showGenderSelect, setShowGenderSelect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const shakeControls = useAnimation();
  const count = digits.length;

  useEffect(() => {inputRef.current?.focus();}, []);

  const selectGender = (gender: 'feminine' | 'masculine') => {
    localStorage.setItem('finesse_gender', gender);
    router.push('/lobby');
  };

  const reset = useCallback(() => {
    setDigits([]); setError(false); setOpening(false); setLightFlood(false); setShowGenderSelect(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (opening || error || showGenderSelect) return;
    if (val.length <= 6) setDigits(val.split(''));
    if (val.length === 6) {
      setTimeout(() => {
        if (val === DEMO_PIN) {
          setOpening(true);
          setTimeout(() => setLightFlood(true), 800);
          setTimeout(() => setShowGenderSelect(true), 2200);
        } else {
          setError(true);
          shakeControls.start({x: [0, -15, 15, -10, 10, -5, 5, 0], transition: {duration: 0.5}});
          setTimeout(reset, 1500);
        }
      }, 400);
    }
  }, [opening, error, showGenderSelect, shakeControls, reset]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{background: '#0A0406'}}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0"
        style={{background: 'radial-gradient(ellipse at center, rgba(201,169,97,0.06) 0%, rgba(10,4,6,0.97) 55%, #0A0406 100%)'}}
      />

      {/* Sconces */}
      {['left-[6%]', 'right-[6%]'].map((pos, i) => (
        <div key={pos} className={`pointer-events-none absolute ${pos} top-1/2 -translate-y-1/2`}>
          <div className="flex flex-col items-center">
            <div className="w-1 h-8 bg-gradient-to-b from-brass/60 to-brass/20" />
            <div className="w-6 h-1 bg-gradient-to-r from-transparent via-brass/40 to-transparent" />
            <div className="w-32 h-32 -mt-1"
              style={{
                background: 'radial-gradient(circle, rgba(255,169,107,0.2) 0%, transparent 65%)',
                animation: `chandelier-pulse 4s ease-in-out infinite`,
                animationDelay: `${i * 2}s`,
              }}
            />
          </div>
        </div>
      ))}

      {/* Title */}
      <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="text-center mb-6 relative z-10">
        <h1 className="font-display text-5xl italic tracking-[0.15em]"
          style={{color: '#E8C87A', textShadow: '0 0 40px rgba(201,169,97,0.25), 0 0 80px rgba(255,77,125,0.08)'}}
        >FINESSE</h1>
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="w-10 h-px bg-brass/30" />
          <div className="w-1.5 h-1.5 rotate-45 border border-brass/40" />
          <span className="font-label text-[8px] tracking-[0.5em] text-brass/30 uppercase">est. mmxxvi</span>
          <div className="w-1.5 h-1.5 rotate-45 border border-brass/40" />
          <div className="w-10 h-px bg-brass/30" />
        </div>
      </motion.div>

      {/* ═══ VAULT PUZZLE ═══ */}
      <motion.div animate={shakeControls} className="relative z-10 w-[340px] h-[340px] max-w-[88vw] max-h-[88vw] mx-auto">
        {/* Warm light behind door */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{background: 'radial-gradient(circle, rgba(255,169,107,0.8) 0%, rgba(201,169,97,0.3) 50%, transparent 70%)'}}
          initial={{opacity: 0}} animate={{opacity: opening ? 1 : 0}} transition={{duration: 1.2}}
        />

        {/* Outer ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full relative">
            <div className="absolute inset-[2%] rounded-full border-[3px] border-brass/50"
              style={{boxShadow: '0 0 20px rgba(201,169,97,0.1), inset 0 0 20px rgba(201,169,97,0.05)'}}
            />
            {Array.from({length: 36}).map((_, i) => (
              <div key={`tick${i}`} className="absolute left-1/2 top-1/2"
                style={{
                  width: i % 3 === 0 ? '3px' : '1px',
                  height: i % 3 === 0 ? '18px' : '12px',
                  background: `linear-gradient(to bottom, #E8C87A${i % 3 === 0 ? '99' : '40'}, transparent)`,
                  transform: `rotate(${i * 10}deg) translateY(-155px)`,
                  transformOrigin: 'center center',
                }}
              />
            ))}
            <div className="absolute inset-[6%] rounded-full border border-brass/20" />
            <div className="absolute inset-[8%] rounded-full border border-brass/10" />
          </div>
        </div>

        {/* Gear ring */}
        <motion.div
          className="absolute inset-[12%] rounded-full border-[4px] border-brass/40"
          animate={{rotate: count >= 1 ? 60 : 0}}
          transition={{duration: 1.2, ease: 'easeOut'}}
          style={{boxShadow: 'inset 0 0 15px rgba(201,169,97,0.08)'}}
        >
          {Array.from({length: 48}).map((_, i) => (
            <div key={`gear${i}`} className="absolute left-1/2 top-1/2"
              style={{
                width: i % 4 === 0 ? '3px' : '1.5px',
                height: '8px',
                background: i % 4 === 0 ? '#C9A961' : '#C9A96150',
                transform: `rotate(${i * 7.5}deg) translateY(-${50}%)`,
                transformOrigin: 'center -125px',
              }}
            />
          ))}
        </motion.div>

        {/* Filigree ring */}
        <div className="absolute inset-[18%] rounded-full border border-brass/15">
          {[0, 90, 180, 270].map((deg) => (
            <div key={`brk${deg}`} className="absolute left-1/2 top-1/2"
              style={{
                width: '14px', height: '4px',
                background: 'linear-gradient(to right, transparent, #E8C87A80, transparent)',
                transform: `rotate(${deg}deg) translateY(-105px)`,
                transformOrigin: 'center center',
              }}
            />
          ))}
        </div>

        {/* Six petals */}
        {Array.from({length: 6}).map((_, i) => {
          const angle = i * 60 - 90;
          const folded = count > i;
          const rad = (angle * Math.PI) / 180;
          const dist = 75;
          const cx = 50 + Math.cos(rad) * (dist / 170) * 50;
          const cy = 50 + Math.sin(rad) * (dist / 170) * 50;
          return (
            <motion.div key={`petal${i}`} className="absolute"
              style={{left: `${cx}%`, top: `${cy}%`, transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`}}
              animate={{scale: folded ? 0 : 1, opacity: folded ? 0 : 1, rotate: folded ? (angle + 90 + 180) : (angle + 90)}}
              transition={{duration: 0.7, ease: 'easeInOut'}}
            >
              <div className="relative w-[44px] h-[52px]"
                style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', background: 'linear-gradient(to bottom, #F0D88A, #C9A961, #6B5028)'}}>
                <div className="absolute inset-[15%]" style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', border: '1px solid #E8C87A40'}} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pt-4">
                <span className="font-label text-[9px] font-bold text-ink/70">{i + 1}</span>
              </div>
            </motion.div>
          );
        })}

        {/* Tumbler bar */}
        <motion.div
          className="absolute left-[15%] right-[15%] top-1/2 -translate-y-1/2 h-[8px] rounded-sm"
          style={{background: 'linear-gradient(to right, #6B5028, #E8C87A, #C9A961, #E8C87A, #6B5028)', boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(232,200,122,0.3)'}}
          animate={{x: count >= 3 ? 40 : 0, opacity: count >= 3 ? 0.4 : 0.8}}
          transition={{duration: 0.8, ease: 'easeOut'}}
        >
          <div className="flex justify-evenly h-full items-center px-2">
            {Array.from({length: 10}).map((_, i) => (<div key={`tm${i}`} className="w-px h-[5px] bg-ink/30" />))}
          </div>
        </motion.div>

        {/* Bolts */}
        {[
          {top: '4%', left: '48%', w: '4%', h: '8%', dir: 'y', val: -20},
          {bottom: '4%', left: '48%', w: '4%', h: '8%', dir: 'y', val: 20},
          {top: '48%', left: '4%', w: '8%', h: '4%', dir: 'x', val: -20},
          {top: '48%', right: '4%', w: '8%', h: '4%', dir: 'x', val: 20},
        ].map((bolt, i) => (
          <motion.div key={`bolt${i}`} className="absolute rounded-sm"
            style={{
              top: bolt.top, bottom: (bolt as any).bottom, left: bolt.left, right: (bolt as any).right,
              width: bolt.w, height: bolt.h,
              background: 'linear-gradient(135deg, #F0D88A, #C9A961, #6B5028)',
              boxShadow: '0 0 4px rgba(201,169,97,0.2)',
            }}
            animate={{
              [(bolt.dir === 'x' ? 'x' : 'y')]: boltsGone(count) ? bolt.val : 0,
              opacity: boltsGone(count) ? 0 : 0.8,
            }}
            transition={{duration: 0.8, delay: i * 0.12}}
          />
        ))}

        {/* Central dial */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80px] h-[80px] rounded-full border-[3px]"
          style={{borderColor: '#C9A961', background: 'radial-gradient(circle, #0A0406 60%, #1a0e10 100%)', boxShadow: '0 0 20px rgba(201,169,97,0.15), inset 0 0 15px rgba(201,169,97,0.08)'}}
          animate={{rotate: (count >= 2 ? -30 : 0) + (count >= 4 ? -30 : 0) + (count >= 6 ? -30 : 0)}}
          transition={{duration: 1.0, ease: 'easeOut'}}
        >
          {Array.from({length: 12}).map((_, i) => (
            <div key={`dt${i}`} className="absolute left-1/2 top-1/2"
              style={{width: i % 3 === 0 ? '2px' : '1px', height: i % 3 === 0 ? '10px' : '6px', background: i % 3 === 0 ? '#E8C87A' : '#C9A96160', transform: `rotate(${i * 30}deg) translateY(-32px)`, transformOrigin: 'center center'}}
            />
          ))}
          <div className="absolute left-1/2 top-[8px] bottom-[8px] w-px bg-brass/20 -translate-x-1/2" />
          <div className="absolute top-1/2 left-[8px] right-[8px] h-px bg-brass/20 -translate-y-1/2" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rotate-45 border-2 border-brass/50" style={{background: 'linear-gradient(135deg, #F0D88A, #C9A961)'}} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border border-ink/40" style={{background: 'linear-gradient(135deg, #E8C87A, #6B5028)'}} />
        </motion.div>

        {/* Door split */}
        {!opening && <div className="absolute left-1/2 top-[5%] bottom-[5%] w-px bg-brass/15 -translate-x-1/2" />}

        {/* Door halves open */}
        {opening && (
          <>
            <motion.div className="absolute inset-0 overflow-hidden" style={{clipPath: 'inset(0 50% 0 0)'}}
              animate={{x: '-60%', opacity: 0}} transition={{duration: 1.5, delay: 0.3, ease: 'easeInOut'}}>
              <div className="w-full h-full rounded-full border-2 border-brass/20 bg-ink/80" />
            </motion.div>
            <motion.div className="absolute inset-0 overflow-hidden" style={{clipPath: 'inset(0 0 0 50%)'}}
              animate={{x: '60%', opacity: 0}} transition={{duration: 1.5, delay: 0.3, ease: 'easeInOut'}}>
              <div className="w-full h-full rounded-full border-2 border-brass/20 bg-ink/80" />
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Light flood */}
      <motion.div className="pointer-events-none fixed inset-0 z-30"
        initial={{opacity: 0}} animate={{opacity: lightFlood ? 1 : 0}} transition={{duration: 1.5}}
        style={{background: 'radial-gradient(ellipse at center, rgba(255,169,107,0.9) 0%, rgba(201,169,97,0.6) 40%, #0A0406 100%)'}}
      />

      {/* Members Only */}
      <motion.p initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.8}}
        className="font-label text-[10px] tracking-[0.5em] text-brass/40 uppercase mt-5 relative z-10"
        style={{textShadow: '0 0 10px rgba(201,169,97,0.15)'}}
      >Members Only</motion.p>

      {/* PIN Input */}
      <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 1}} className="mt-6 relative z-10">
        <input ref={inputRef} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={6}
          value={digits.join('')} onChange={handleInput}
          className="absolute opacity-0 w-0 h-0" autoFocus autoComplete="off"
        />
        <div className="flex gap-3 justify-center" onClick={() => inputRef.current?.focus()}>
          {Array.from({length: 6}).map((_, i) => {
            const filled = !!digits[i];
            return (
              <motion.div key={i}
                className="w-12 h-14 flex items-center justify-center border relative overflow-hidden"
                style={{
                  borderColor: error ? '#FF4D7D' : filled ? '#E8C87A' : '#C9A96118',
                  background: filled ? 'rgba(201,169,97,0.04)' : '#0A0406',
                  boxShadow: filled ? '0 0 15px rgba(201,169,97,0.12), inset 0 0 10px rgba(201,169,97,0.04)' : 'none',
                }}
                animate={error ? {x: [0, -4, 4, -2, 2, 0]} : {}}
                transition={{duration: 0.3}}
              >
                <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l" style={{borderColor: filled ? '#E8C87A50' : '#C9A96110'}} />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r" style={{borderColor: filled ? '#E8C87A50' : '#C9A96110'}} />
                <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l" style={{borderColor: filled ? '#E8C87A50' : '#C9A96110'}} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r" style={{borderColor: filled ? '#E8C87A50' : '#C9A96110'}} />
                {filled ? (
                  <motion.span initial={{scale: 0, opacity: 0}} animate={{scale: 1, opacity: 1}}
                    className="font-display text-2xl" style={{color: '#E8C87A', textShadow: '0 0 10px rgba(232,200,122,0.3)'}}
                  >{digits[i]}</motion.span>
                ) : (
                  <span className="w-1.5 h-1.5 rotate-45 border border-brass/10" />
                )}
              </motion.div>
            );
          })}
        </div>
        {error && (
          <motion.p initial={{opacity: 0}} animate={{opacity: 1}}
            className="text-center mt-4 font-body text-sm italic" style={{color: '#F4E0A0'}}
          >Try again</motion.p>
        )}
      </motion.div>

      {/* Sign up link */}
      {!showGenderSelect && (
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 1.2}} className="mt-8 relative z-10 text-center">
          <p className="font-body text-xs text-cream/15 italic">
            Not a member?{' '}
            <Link href="/signup" className="text-brass/30 hover:text-brass transition-colors">Request an invitation</Link>
          </p>
        </motion.div>
      )}

      {/* Gender selector */}
      <AnimatePresence>
        {showGenderSelect && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center"
            initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.8}}
            style={{background: 'radial-gradient(ellipse at center, rgba(255,169,107,0.15) 0%, rgba(10,4,6,0.98) 60%)'}}
          >
            <div className="text-center px-6">
              <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}}>
                <h2 className="font-display text-3xl italic text-brass tracking-[0.15em] mb-2"
                  style={{textShadow: '0 0 30px rgba(201,169,97,0.25)'}}
                >Welcome to Finesse</h2>
                <p className="font-body text-sm text-cream/30 italic mb-10">Choose your experience</p>
              </motion.div>
              <div className="flex gap-6 justify-center">
                <motion.button initial={{opacity: 0, x: -30}} animate={{opacity: 1, x: 0}} transition={{delay: 0.5}}
                  onClick={() => selectGender('feminine')}
                  className="group relative w-[160px] border border-brass/20 bg-ink/80 backdrop-blur-sm p-6 hover:border-brass/50 transition-all duration-500"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{background: 'radial-gradient(ellipse at center, rgba(255,77,125,0.08) 0%, transparent 70%)'}} />
                  <span className="relative z-10 text-5xl block mb-4">🌹</span>
                  <h3 className="relative z-10 font-display text-xl text-cream/80 tracking-wide mb-1 group-hover:text-brass transition-colors">Finesse</h3>
                  <p className="relative z-10 font-body text-[10px] text-cream/25 italic">handbags, shoes, beauty, spa</p>
                  <div className="relative z-10 mt-4 flex items-center justify-center gap-2">
                    <div className="w-6 h-px bg-oxblood/40" />
                    <div className="w-1.5 h-1.5 rotate-45 bg-neon-pink/20" />
                    <div className="w-6 h-px bg-oxblood/40" />
                  </div>
                </motion.button>
                <motion.button initial={{opacity: 0, x: 30}} animate={{opacity: 1, x: 0}} transition={{delay: 0.6}}
                  onClick={() => selectGender('masculine')}
                  className="group relative w-[160px] border border-brass/20 bg-ink/80 backdrop-blur-sm p-6 hover:border-brass/50 transition-all duration-500"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{background: 'radial-gradient(ellipse at center, rgba(201,169,97,0.08) 0%, transparent 70%)'}} />
                  <span className="relative z-10 text-5xl block mb-4">🦁</span>
                  <h3 className="relative z-10 font-display text-xl text-cream/80 tracking-wide mb-1 group-hover:text-brass transition-colors">Carpe Diem</h3>
                  <p className="relative z-10 font-body text-[10px] text-cream/25 italic">watches, golf, suits, whiskey</p>
                  <div className="relative z-10 mt-4 flex items-center justify-center gap-2">
                    <div className="w-6 h-px bg-brass/30" />
                    <div className="w-1.5 h-1.5 rotate-45 bg-brass/20" />
                    <div className="w-6 h-px bg-brass/30" />
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes chandelier-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
