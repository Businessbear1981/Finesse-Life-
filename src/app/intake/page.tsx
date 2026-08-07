'use client';

import {useState, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {motion, AnimatePresence} from 'framer-motion';

/* ─── Types ─── */
type Gender = 'feminine' | 'masculine';
type Vibe = 'luxury' | 'social' | 'creative' | 'ambitious' | 'adventurous' | 'intimate';

interface IntakeData {
  gender: Gender | null;
  displayName: string;
  age: string;
  city: string;
  vibe: Vibe | null;
  bio: string;
}

/* ─── Vibe definitions ─── */
const VIBES: {key: Vibe; symbol: string; label: string; sub: string}[] = [
  {key: 'luxury',      symbol: '✦', label: 'Luxury',      sub: 'I move in elevated spaces'},
  {key: 'social',      symbol: '◈', label: 'Social',      sub: "I'm the room"},
  {key: 'creative',    symbol: '❋', label: 'Creative',    sub: 'I make things'},
  {key: 'ambitious',   symbol: '▲', label: 'Ambitious',   sub: "I'm building something"},
  {key: 'adventurous', symbol: '◉', label: 'Adventurous', sub: "I go where others don't"},
  {key: 'intimate',    symbol: '♡', label: 'Intimate',    sub: 'I prefer depth over breadth'},
];

const EASE = [0.22, 1, 0.36, 1] as const;

/* ─── Architectural arch ornament (replaces the old plain chandelier lines) ─── */
function ArchOrnament() {
  return (
    <motion.svg
      width="220"
      height="120"
      viewBox="0 0 220 120"
      fill="none"
      className="mb-6"
      initial={{opacity: 0, y: -12}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.9, ease: EASE}}
    >
      {/* Outer arch */}
      <path
        d="M20 120 V50 A90 90 0 0 1 200 50 V120"
        stroke="rgba(201,169,97,0.28)"
        strokeWidth="1"
      />
      {/* Inner arch */}
      <path
        d="M40 120 V55 A70 70 0 0 1 180 55 V120"
        stroke="rgba(201,169,97,0.14)"
        strokeWidth="1"
      />
      {/* Keystone */}
      <path
        d="M104 8 L110 2 L116 8 L112 18 L108 18 Z"
        fill="rgba(201,169,97,0.35)"
      />
      {/* Hanging fixture */}
      <line x1="110" y1="18" x2="110" y2="38" stroke="rgba(201,169,97,0.4)" strokeWidth="1" />
      <motion.circle
        cx="110"
        cy="44"
        r="4.5"
        fill="rgba(201,169,97,0.5)"
        animate={{opacity: [0.5, 1, 0.5]}}
        transition={{duration: 3.2, repeat: Infinity, ease: 'easeInOut'}}
      />
      <motion.circle
        cx="110"
        cy="44"
        r="9"
        fill="none"
        stroke="rgba(201,169,97,0.25)"
        strokeWidth="0.75"
        animate={{opacity: [0.2, 0.55, 0.2], scale: [1, 1.15, 1]}}
        transition={{duration: 3.2, repeat: Infinity, ease: 'easeInOut'}}
      />
    </motion.svg>
  );
}

/* ─── Progress rail — ornate line instead of dots ─── */
function ProgressRail({step, total}: {step: number; total: number}) {
  const pct = (step / (total - 1)) * 100;
  return (
    <div className="relative w-full max-w-[220px] h-px" style={{background: 'rgba(201,169,97,0.14)'}}>
      <motion.div
        className="absolute top-0 left-0 h-px"
        style={{background: 'linear-gradient(90deg, rgba(201,169,97,0.2), #C9A961)'}}
        initial={false}
        animate={{width: `${pct}%`}}
        transition={{duration: 0.6, ease: EASE}}
      />
      <motion.div
        className="absolute top-1/2 w-1.5 h-1.5 rotate-45"
        style={{background: '#C9A961', boxShadow: '0 0 8px rgba(201,169,97,0.7)', marginTop: '-3px', marginLeft: '-3px'}}
        initial={false}
        animate={{left: `${pct}%`}}
        transition={{duration: 0.6, ease: EASE}}
      />
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  borderColor: 'rgba(201,169,97,0.25)',
  color: '#E8C87A',
  caretColor: '#C9A961',
};

const primaryBtn: React.CSSProperties = {
  borderColor: 'rgba(201,169,97,0.35)',
  color: '#E8C87A',
  background: 'linear-gradient(180deg, rgba(201,169,97,0.10), rgba(201,169,97,0.02))',
};

/* ─── Step 1 — Edition / Gender ─── */
function StepEdition({onNext}: {onNext: (gender: Gender) => void}) {
  const cards: {gender: Gender; label: string; sub: string; hue: string}[] = [
    {gender: 'feminine', label: 'Finesse', sub: 'feminine energy', hue: '255,184,200'},
    {gender: 'masculine', label: 'Carpe Diem', sub: 'masculine energy', hue: '255,169,107'},
  ];
  return (
    <div className="flex flex-col items-center">
      <p className="font-body text-xl italic mb-10 text-center leading-relaxed" style={{color: 'rgba(244,232,208,0.75)'}}>
        How do you move through the world?
      </p>
      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        {cards.map((c, i) => (
          <motion.button
            key={c.gender}
            onClick={() => onNext(c.gender)}
            className="group relative border p-8 text-center overflow-hidden"
            style={{borderColor: `rgba(${c.hue},0.15)`, background: 'linear-gradient(160deg, rgba(10,4,6,0.7), rgba(20,8,11,0.4))'}}
            initial={{opacity: 0, y: 16}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, delay: 0.1 + i * 0.1, ease: EASE}}
            whileHover={{borderColor: `rgba(${c.hue},0.45)`, y: -2}}
            whileTap={{scale: 0.98}}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{background: `radial-gradient(ellipse at center, rgba(${c.hue},0.08) 0%, transparent 70%)`}}
            />
            {/* corner foil accents */}
            <span className="absolute top-2 left-2 w-3 h-3 border-t border-l opacity-40" style={{borderColor: `rgba(${c.hue},0.5)`}} />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r opacity-40" style={{borderColor: `rgba(${c.hue},0.5)`}} />
            <p className="relative z-10 font-display italic text-2xl tracking-[0.08em] mb-1.5" style={{color: '#E8C87A', textShadow: `0 0 24px rgba(${c.hue},0.25)`}}>
              {c.label}
            </p>
            <p className="relative z-10 font-label text-[8px] tracking-[0.35em] uppercase" style={{color: `rgba(${c.hue},0.5)`}}>
              {c.sub}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 2 — Display Name ─── */
function StepName({value, onChange, onNext}: {value: string; onChange: (v: string) => void; onNext: () => void}) {
  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      <p className="font-body text-xl italic mb-10 text-center leading-relaxed" style={{color: 'rgba(244,232,208,0.75)'}}>
        What do we call you?
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim().length >= 2 && onNext()}
        placeholder="Your name..."
        autoFocus
        maxLength={40}
        className="w-full px-5 py-4 border-b bg-transparent font-display italic text-2xl text-center focus:outline-none transition-colors duration-300"
        style={fieldStyle}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.6)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.25)')}
      />
      <motion.button
        onClick={onNext}
        disabled={value.trim().length < 2}
        className="mt-8 px-10 py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase disabled:opacity-25"
        style={primaryBtn}
        whileHover={value.trim().length >= 2 ? {borderColor: 'rgba(201,169,97,0.6)', background: 'linear-gradient(180deg, rgba(201,169,97,0.18), rgba(201,169,97,0.04))'} : {}}
        whileTap={{scale: 0.97}}
      >
        Continue →
      </motion.button>
    </div>
  );
}

/* ─── Step 3 — Age + City ─── */
function StepAgeCIty({
  age, city, onAgeChange, onCityChange, onNext,
}: {
  age: string;
  city: string;
  onAgeChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onNext: () => void;
}) {
  const ageNum = parseInt(age);
  const ageValid = !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;
  const cityValid = city.trim().length >= 2;
  const canContinue = ageValid && cityValid;

  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-7">
      <div className="w-full flex flex-col gap-2">
        <label className="font-label text-[9px] tracking-[0.3em] uppercase text-center block" style={{color: 'rgba(201,169,97,0.45)'}}>
          How old are you?
        </label>
        <input
          type="number"
          value={age}
          onChange={(e) => onAgeChange(e.target.value)}
          placeholder="Age"
          min={18}
          max={120}
          autoFocus
          className="w-full px-5 py-4 border-b bg-transparent font-display italic text-2xl text-center focus:outline-none transition-colors duration-300"
          style={fieldStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.6)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.25)')}
        />
        {age && !ageValid && (
          <p className="font-body text-xs italic text-center" style={{color: 'rgba(255,77,125,0.7)'}}>
            Must be 18 or older
          </p>
        )}
      </div>

      <div className="w-full flex flex-col gap-2">
        <label className="font-label text-[9px] tracking-[0.3em] uppercase text-center block" style={{color: 'rgba(201,169,97,0.45)'}}>
          What city are you in?
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canContinue && onNext()}
          placeholder="City..."
          maxLength={60}
          className="w-full px-5 py-4 border-b bg-transparent font-display italic text-2xl text-center focus:outline-none transition-colors duration-300"
          style={fieldStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.6)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.25)')}
        />
      </div>

      <motion.button
        onClick={onNext}
        disabled={!canContinue}
        className="px-10 py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase disabled:opacity-25"
        style={primaryBtn}
        whileHover={canContinue ? {borderColor: 'rgba(201,169,97,0.6)', background: 'linear-gradient(180deg, rgba(201,169,97,0.18), rgba(201,169,97,0.04))'} : {}}
        whileTap={{scale: 0.97}}
      >
        Continue →
      </motion.button>
    </div>
  );
}

/* ─── Step 4 — Vibe ─── */
function StepVibe({value, onSelect}: {value: Vibe | null; onSelect: (v: Vibe) => void}) {
  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <p className="font-body text-xl italic mb-10 text-center leading-relaxed" style={{color: 'rgba(244,232,208,0.75)'}}>
        What&apos;s your energy?
      </p>
      <div className="grid grid-cols-2 gap-3 w-full">
        {VIBES.map((v, i) => {
          const active = value === v.key;
          return (
            <motion.button
              key={v.key}
              onClick={() => onSelect(v.key)}
              className="group relative border p-4 text-left overflow-hidden"
              style={{
                borderColor: active ? 'rgba(201,169,97,0.55)' : 'rgba(201,169,97,0.10)',
                background: active
                  ? 'linear-gradient(160deg, rgba(201,169,97,0.12), rgba(201,169,97,0.03))'
                  : 'rgba(10,4,6,0.5)',
                boxShadow: active ? '0 0 24px rgba(201,169,97,0.10)' : 'none',
              }}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.4, delay: 0.05 * i, ease: EASE}}
              whileHover={!active ? {borderColor: 'rgba(201,169,97,0.32)', background: 'rgba(201,169,97,0.05)'} : {}}
              whileTap={{scale: 0.97}}
            >
              <span className="block text-lg mb-1" style={{color: active ? '#E8C87A' : 'rgba(201,169,97,0.40)'}}>
                {v.symbol}
              </span>
              <span className="block font-label text-[9px] tracking-[0.22em] uppercase mb-0.5" style={{color: active ? '#E8C87A' : 'rgba(201,169,97,0.55)'}}>
                {v.label}
              </span>
              <span className="block font-body text-[11px] italic leading-tight" style={{color: active ? 'rgba(244,232,208,0.65)' : 'rgba(244,232,208,0.28)'}}>
                {v.sub}
              </span>
              {active && (
                <motion.div
                  layoutId="vibe-active-dot"
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                  style={{background: '#C9A961', boxShadow: '0 0 6px rgba(201,169,97,0.8)'}}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 5 — Bio ─── */
function StepBio({
  value, onChange, onSubmit, submitting,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const MAX = 200;
  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      <p className="font-body text-xl italic mb-2 text-center leading-relaxed" style={{color: 'rgba(244,232,208,0.75)'}}>
        Tell us something about yourself
      </p>
      <p className="font-body text-xs italic mb-8 text-center" style={{color: 'rgba(244,232,208,0.28)'}}>
        Optional — you can always add this later
      </p>
      <div className="w-full relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX))}
          placeholder="A sentence or two..."
          rows={4}
          autoFocus
          className="w-full px-4 py-3 border bg-transparent font-body text-sm leading-relaxed focus:outline-none transition-colors duration-300 resize-none"
          style={{borderColor: 'rgba(201,169,97,0.18)', color: '#F4E8D0', caretColor: '#C9A961'}}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.45)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.18)')}
        />
        <span
          className="absolute bottom-2 right-3 font-label text-[8px] tracking-[0.1em]"
          style={{color: value.length >= MAX ? 'rgba(255,77,125,0.6)' : 'rgba(201,169,97,0.22)'}}
        >
          {value.length}/{MAX}
        </span>
      </div>
      <div className="flex gap-4 mt-8">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="font-label text-[9px] tracking-[0.3em] uppercase transition-colors duration-200 disabled:opacity-30"
          style={{color: 'rgba(201,169,97,0.4)'}}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(201,169,97,0.65)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(201,169,97,0.4)')}
        >
          Skip
        </button>
        <motion.button
          onClick={onSubmit}
          disabled={submitting}
          className="px-10 py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase disabled:opacity-25"
          style={primaryBtn}
          whileHover={!submitting ? {borderColor: 'rgba(201,169,97,0.6)', background: 'linear-gradient(180deg, rgba(201,169,97,0.18), rgba(201,169,97,0.04))'} : {}}
          whileTap={{scale: 0.97}}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brass/60 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-brass/60 animate-pulse" style={{animationDelay: '150ms'}} />
              <span className="w-1.5 h-1.5 rounded-full bg-brass/60 animate-pulse" style={{animationDelay: '300ms'}} />
            </span>
          ) : (
            'Enter →'
          )}
        </motion.button>
      </div>
    </div>
  );
}

/* ─── Main Intake Page ─── */
export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IntakeData>({
    gender: null,
    displayName: '',
    age: '',
    city: '',
    vibe: null,
    bio: '',
  });

  const TOTAL_STEPS = 5;

  const goTo = useCallback((next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }, [step]);

  const handleGender = useCallback((gender: Gender) => {
    localStorage.setItem('finesse_gender', gender);
    setData((d) => ({...d, gender}));
    goTo(1);
  }, [goTo]);

  const handleVibePick = useCallback((vibe: Vibe) => {
    setData((d) => ({...d, vibe}));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          display_name: data.displayName,
          gender: data.gender,
          age: parseInt(data.age) || null,
          city: data.city,
          vibe: data.vibe,
          bio: data.bio || null,
          intake_complete: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Something went wrong. Please try again.');
      }

      router.push('/lobby');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }, [data, router]);

  const gender = data.gender;
  const accentHue = gender === 'masculine' ? '255,169,107' : '255,184,200';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{background: '#0A0406'}}>
      {/* Cinematic vignette + spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{background: 'radial-gradient(ellipse at 50% 0%, rgba(20,10,12,0.4) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6) 0%, transparent 60%)'}}
      />
      <motion.div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[460px]"
        style={{background: `radial-gradient(ellipse at top, rgba(${accentHue},0.06) 0%, rgba(201,169,97,0.05) 40%, transparent 70%)`}}
        animate={{opacity: [0.65, 1, 0.65]}}
        transition={{duration: 4, repeat: Infinity, ease: 'easeInOut'}}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[35%]"
        style={{background: 'linear-gradient(to top, rgba(74,25,34,0.08) 0%, transparent 70%)'}}
      />
      {/* Vertical vignette edges for cinematic frame */}
      <div className="pointer-events-none absolute inset-0" style={{boxShadow: 'inset 0 0 160px 40px rgba(0,0,0,0.55)'}} />

      <div className="relative z-10 w-full max-w-lg px-6 py-10 flex flex-col items-center">
        <ArchOrnament />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            className="w-full flex flex-col items-center"
            initial={{opacity: 0, x: direction * 24}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: direction * -24}}
            transition={{duration: 0.45, ease: EASE}}
          >
            {step === 0 && <StepEdition onNext={handleGender} />}

            {step === 1 && (
              <StepName
                value={data.displayName}
                onChange={(v) => setData((d) => ({...d, displayName: v}))}
                onNext={() => goTo(2)}
              />
            )}

            {step === 2 && (
              <StepAgeCIty
                age={data.age}
                city={data.city}
                onAgeChange={(v) => setData((d) => ({...d, age: v}))}
                onCityChange={(v) => setData((d) => ({...d, city: v}))}
                onNext={() => goTo(3)}
              />
            )}

            {step === 3 && (
              <>
                <StepVibe value={data.vibe} onSelect={handleVibePick} />
                {data.vibe && (
                  <motion.button
                    onClick={() => goTo(4)}
                    className="mt-7 px-10 py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase"
                    style={primaryBtn}
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    whileHover={{borderColor: 'rgba(201,169,97,0.6)'}}
                    whileTap={{scale: 0.97}}
                  >
                    Continue →
                  </motion.button>
                )}
              </>
            )}

            {step === 4 && (
              <StepBio
                value={data.bio}
                onChange={(v) => setData((d) => ({...d, bio: v}))}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.p
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="mt-6 font-body text-sm italic text-center"
            style={{color: 'rgba(255,77,125,0.85)'}}
          >
            {error}
          </motion.p>
        )}

        {/* Progress rail */}
        <div className="mt-10 flex justify-center">
          <ProgressRail step={step} total={TOTAL_STEPS} />
        </div>

        {/* Back button — hidden on step 0 */}
        {step > 0 && (
          <button
            onClick={() => goTo(step - 1)}
            className="mt-5 font-label text-[8px] tracking-[0.3em] uppercase transition-colors duration-200"
            style={{color: 'rgba(201,169,97,0.22)'}}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(201,169,97,0.5)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(201,169,97,0.22)')}
          >
            ← back
          </button>
        )}
      </div>
    </div>
  );
}
