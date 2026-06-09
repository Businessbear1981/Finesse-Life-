'use client';

import {useState, useCallback} from 'react';
import {useRouter} from 'next/navigation';

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

/* ─── Progress dots ─── */
function ProgressDots({step, total}: {step: number; total: number}) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({length: total}).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-500"
          style={{
            width: i === step ? '20px' : '6px',
            height: '6px',
            background:
              i < step
                ? 'rgba(201,169,97,0.55)'
                : i === step
                ? '#C9A961'
                : 'rgba(201,169,97,0.18)',
            transform: i === step ? 'none' : 'rotate(45deg)',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Chandelier ornament ─── */
function ChandelierOrnament() {
  return (
    <div className="flex flex-col items-center mb-8">
      <div
        className="w-px h-6"
        style={{background: 'linear-gradient(to bottom, rgba(201,169,97,0.5), rgba(201,169,97,0.15))'}}
      />
      <div
        className="w-2.5 h-2.5 rotate-45 border mb-1"
        style={{borderColor: 'rgba(201,169,97,0.45)', boxShadow: '0 0 10px rgba(201,169,97,0.2)'}}
      />
      <div
        className="w-8 h-1.5 border-x border-b"
        style={{borderColor: 'rgba(201,169,97,0.22)', background: 'rgba(201,169,97,0.04)'}}
      />
      <div
        className="w-12 h-1.5 border-x border-b"
        style={{borderColor: 'rgba(201,169,97,0.12)', background: 'rgba(201,169,97,0.02)'}}
      />
    </div>
  );
}

/* ─── Step 1 — Edition / Gender ─── */
function StepEdition({onNext}: {onNext: (gender: Gender) => void}) {
  return (
    <div className="flex flex-col items-center">
      <p
        className="font-body text-xl italic mb-10 text-center leading-relaxed"
        style={{color: 'rgba(244,232,208,0.75)'}}
      >
        How do you move through the world?
      </p>
      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        {/* Feminine */}
        <button
          onClick={() => onNext('feminine')}
          className="group relative border p-7 text-center transition-all duration-500 overflow-hidden"
          style={{borderColor: 'rgba(255,184,200,0.15)', background: 'rgba(10,4,6,0.6)'}}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,184,200,0.40)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,25,34,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,184,200,0.15)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,4,6,0.6)';
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{background: 'radial-gradient(ellipse at center, rgba(255,184,200,0.06) 0%, transparent 70%)'}}
          />
          <p
            className="relative z-10 font-display italic text-xl tracking-[0.08em] mb-1"
            style={{color: '#E8C87A', textShadow: '0 0 20px rgba(255,184,200,0.2)'}}
          >
            Finesse
          </p>
          <p
            className="relative z-10 font-label text-[8px] tracking-[0.35em] uppercase"
            style={{color: 'rgba(255,184,200,0.45)'}}
          >
            feminine energy
          </p>
        </button>

        {/* Masculine */}
        <button
          onClick={() => onNext('masculine')}
          className="group relative border p-7 text-center transition-all duration-500 overflow-hidden"
          style={{borderColor: 'rgba(255,169,107,0.15)', background: 'rgba(10,4,6,0.6)'}}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,169,107,0.40)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,25,34,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,169,107,0.15)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,4,6,0.6)';
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{background: 'radial-gradient(ellipse at center, rgba(255,169,107,0.06) 0%, transparent 70%)'}}
          />
          <p
            className="relative z-10 font-display italic text-xl tracking-[0.08em] mb-1"
            style={{color: '#E8C87A', textShadow: '0 0 20px rgba(255,169,107,0.2)'}}
          >
            Carpe Diem
          </p>
          <p
            className="relative z-10 font-label text-[8px] tracking-[0.35em] uppercase"
            style={{color: 'rgba(255,169,107,0.45)'}}
          >
            masculine energy
          </p>
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2 — Display Name ─── */
function StepName({value, onChange, onNext}: {value: string; onChange: (v: string) => void; onNext: () => void}) {
  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      <p
        className="font-body text-xl italic mb-10 text-center leading-relaxed"
        style={{color: 'rgba(244,232,208,0.75)'}}
      >
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
        style={{
          borderColor: 'rgba(201,169,97,0.25)',
          color: '#E8C87A',
          caretColor: '#C9A961',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.6)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.25)')}
      />
      <button
        onClick={onNext}
        disabled={value.trim().length < 2}
        className="mt-8 px-10 py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase transition-all duration-300 disabled:opacity-25"
        style={{
          borderColor: 'rgba(201,169,97,0.35)',
          color: '#E8C87A',
          background: 'rgba(201,169,97,0.04)',
        }}
        onMouseEnter={(e) => {
          if (value.trim().length >= 2) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.10)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.55)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.04)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.35)';
        }}
      >
        Continue →
      </button>
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
        <label
          className="font-label text-[9px] tracking-[0.3em] uppercase text-center block"
          style={{color: 'rgba(201,169,97,0.45)'}}
        >
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
          style={{
            borderColor: 'rgba(201,169,97,0.25)',
            color: '#E8C87A',
            caretColor: '#C9A961',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.6)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.25)')}
        />
        {age && !ageValid && (
          <p
            className="font-body text-xs italic text-center"
            style={{color: 'rgba(255,77,125,0.7)'}}
          >
            Must be 18 or older
          </p>
        )}
      </div>

      <div className="w-full flex flex-col gap-2">
        <label
          className="font-label text-[9px] tracking-[0.3em] uppercase text-center block"
          style={{color: 'rgba(201,169,97,0.45)'}}
        >
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
          style={{
            borderColor: 'rgba(201,169,97,0.25)',
            color: '#E8C87A',
            caretColor: '#C9A961',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.6)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.25)')}
        />
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="px-10 py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase transition-all duration-300 disabled:opacity-25"
        style={{
          borderColor: 'rgba(201,169,97,0.35)',
          color: '#E8C87A',
          background: 'rgba(201,169,97,0.04)',
        }}
        onMouseEnter={(e) => {
          if (canContinue) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.10)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.55)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.04)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.35)';
        }}
      >
        Continue →
      </button>
    </div>
  );
}

/* ─── Step 4 — Vibe ─── */
function StepVibe({value, onSelect}: {value: Vibe | null; onSelect: (v: Vibe) => void}) {
  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <p
        className="font-body text-xl italic mb-10 text-center leading-relaxed"
        style={{color: 'rgba(244,232,208,0.75)'}}
      >
        What's your energy?
      </p>
      <div className="grid grid-cols-2 gap-3 w-full">
        {VIBES.map((v) => {
          const active = value === v.key;
          return (
            <button
              key={v.key}
              onClick={() => onSelect(v.key)}
              className="group relative border p-4 text-left transition-all duration-400 overflow-hidden"
              style={{
                borderColor: active ? 'rgba(201,169,97,0.55)' : 'rgba(201,169,97,0.10)',
                background: active ? 'rgba(201,169,97,0.08)' : 'rgba(10,4,6,0.5)',
                boxShadow: active ? '0 0 20px rgba(201,169,97,0.08)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.30)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.10)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,4,6,0.5)';
                }
              }}
            >
              <span
                className="block text-lg mb-1"
                style={{color: active ? '#E8C87A' : 'rgba(201,169,97,0.40)'}}
              >
                {v.symbol}
              </span>
              <span
                className="block font-label text-[9px] tracking-[0.22em] uppercase mb-0.5"
                style={{color: active ? '#E8C87A' : 'rgba(201,169,97,0.55)'}}
              >
                {v.label}
              </span>
              <span
                className="block font-body text-[11px] italic leading-tight"
                style={{color: active ? 'rgba(244,232,208,0.65)' : 'rgba(244,232,208,0.28)'}}
              >
                {v.sub}
              </span>
              {active && (
                <div
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                  style={{background: '#C9A961', boxShadow: '0 0 6px rgba(201,169,97,0.8)'}}
                />
              )}
            </button>
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
      <p
        className="font-body text-xl italic mb-2 text-center leading-relaxed"
        style={{color: 'rgba(244,232,208,0.75)'}}
      >
        Tell us something about yourself
      </p>
      <p
        className="font-body text-xs italic mb-8 text-center"
        style={{color: 'rgba(244,232,208,0.28)'}}
      >
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
          style={{
            borderColor: 'rgba(201,169,97,0.18)',
            color: '#F4E8D0',
            caretColor: '#C9A961',
          }}
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
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(201,169,97,0.65)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(201,169,97,0.4)')
          }
        >
          Skip
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="px-10 py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase transition-all duration-300 disabled:opacity-25"
          style={{
            borderColor: 'rgba(201,169,97,0.35)',
            color: '#E8C87A',
            background: 'rgba(201,169,97,0.04)',
          }}
          onMouseEnter={(e) => {
            if (!submitting) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.10)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.55)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.04)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.35)';
          }}
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
        </button>
      </div>
    </div>
  );
}

/* ─── Main Intake Page ─── */
export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
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

  const handleGender = useCallback((gender: Gender) => {
    localStorage.setItem('finesse_gender', gender);
    setData((d) => ({...d, gender}));
    setStep(1);
  }, []);

  const handleVibePick = useCallback((vibe: Vibe) => {
    setData((d) => ({...d, vibe}));
    setStep(4);
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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      {/* Chandelier atmosphere */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px]"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(201,169,97,0.08) 0%, rgba(74,25,34,0.04) 50%, transparent 70%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[35%]"
        style={{background: 'linear-gradient(to top, rgba(74,25,34,0.07) 0%, transparent 70%)'}}
      />

      <div className="relative z-10 w-full max-w-lg px-6 py-10 flex flex-col items-center">
        <ChandelierOrnament />

        {/* Step content — fade key triggers re-render on step change */}
        <div
          key={step}
          className="w-full flex flex-col items-center"
          style={{animation: 'intake-fade-in 0.4s ease-out both'}}
        >
          {step === 0 && <StepEdition onNext={handleGender} />}

          {step === 1 && (
            <StepName
              value={data.displayName}
              onChange={(v) => setData((d) => ({...d, displayName: v}))}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepAgeCIty
              age={data.age}
              city={data.city}
              onAgeChange={(v) => setData((d) => ({...d, age: v}))}
              onCityChange={(v) => setData((d) => ({...d, city: v}))}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <>
              <StepVibe value={data.vibe} onSelect={handleVibePick} />
              {data.vibe && (
                <button
                  onClick={() => setStep(4)}
                  className="mt-7 px-10 py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase transition-all duration-300"
                  style={{
                    borderColor: 'rgba(201,169,97,0.35)',
                    color: '#E8C87A',
                    background: 'rgba(201,169,97,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.10)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.55)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,97,0.04)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.35)';
                  }}
                >
                  Continue →
                </button>
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
        </div>

        {/* Error */}
        {error && (
          <p
            className="mt-6 font-body text-sm italic text-center"
            style={{color: 'rgba(255,77,125,0.85)'}}
          >
            {error}
          </p>
        )}

        {/* Progress dots */}
        <div className="mt-10">
          <ProgressDots step={step} total={TOTAL_STEPS} />
        </div>

        {/* Back button — hidden on step 0 */}
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="mt-5 font-label text-[8px] tracking-[0.3em] uppercase transition-colors duration-200"
            style={{color: 'rgba(201,169,97,0.22)'}}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(201,169,97,0.5)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(201,169,97,0.22)')
            }
          >
            ← back
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes chandelier-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes intake-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
