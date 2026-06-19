'use client';

import {useState, useEffect} from 'react';
import {motion} from 'framer-motion';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GymClass {
  day: string;
  time: string;
  name: string;
  studio: string;
  instructor: string;
}

interface TrainerCard {
  name: string;
  specialty: string;
  nextSession: string;
  rate: string;
  novaNote: string;
}

interface RecoveryItem {
  name: string;
  venue: string;
  price: string;
  when: string;
}

interface GearItem {
  brand: string;
  name: string;
  price: string;
  novaNote: string;
}

interface PerfStat {
  label: string;
  value: string;
}

interface ScheduleItem {
  day: string;
  time: string;
  name: string;
  venue: string;
}

// ─── Feminine data ─────────────────────────────────────────────────────────────

const FEM_CLASSES: GymClass[] = [
  {day: 'Monday', time: '7:00 AM', name: 'SoulCycle', studio: 'East 83rd', instructor: 'Jordan M.'},
  {day: 'Wednesday', time: '6:00 PM', name: 'Hot Pilates', studio: 'CorePower Studio', instructor: 'Studio Class'},
  {day: 'Saturday', time: '10:00 AM', name: 'Barre', studio: 'Physique 57 (Chelsea)', instructor: 'Natalie R.'},
];

const FEM_TRAINER: TrainerCard = {
  name: 'Aaliyah S.',
  specialty: 'Strength & Conditioning',
  nextSession: 'Thursday — 8:00 AM',
  rate: '$185 / session',
  novaNote: "She's going to push you. That's why I booked her.",
};

const FEM_RECOVERY: RecoveryItem[] = [
  {name: 'Cryotherapy', venue: 'RESTORE Hyper Wellness', price: '$65', when: 'Sunday — 2:00 PM'},
  {name: 'Swedish Massage', venue: 'The Well', price: '$195', when: 'Next Friday'},
];

const FEM_GEAR: GearItem[] = [
  {brand: 'LULULEMON', name: 'Align Leggings — Mauve Mist', price: '$98', novaNote: 'Already in your size.'},
  {brand: 'VUORI', name: 'Performance Jogger', price: '$108', novaNote: 'Post-workout or coffee run. Both.'},
];

// ─── Masculine data ────────────────────────────────────────────────────────────

const MASC_STATS: PerfStat[] = [
  {label: 'Week Streak', value: '4'},
  {label: 'Total Sessions', value: '47'},
  {label: 'Avg Session', value: '62 min'},
  {label: 'PR This Month', value: '385 lb deadlift'},
];

const MASC_SCHEDULE: ScheduleItem[] = [
  {day: 'Tuesday', time: '6:00 AM', name: 'Personal Training — Marcus T.', venue: "Gold's Gym, 67th St"},
  {day: 'Thursday', time: '7:00 AM', name: 'Sauna + Cold Plunge', venue: 'Othership'},
  {day: 'Saturday', time: '11:00 AM', name: 'Golf Fitness — Coach Rivera', venue: 'Chelsea Piers'},
];

const MASC_GEAR: GearItem[] = [
  {brand: 'HYPERICE', name: 'Hypervolt 2 Pro', price: '$299', novaNote: 'recovery is the workout'},
  {brand: 'LULULEMON', name: 'ABC Pant — Commission', price: '$128', novaNote: 'you wear these to everything and you know it'},
];

// ─── Art deco divider ─────────────────────────────────────────────────────────

function GoldDivider({label}: {label: string}) {
  return (
    <div className="flex items-center gap-4 my-7">
      <div className="h-px flex-1" style={{background: 'rgba(201,169,97,0.18)'}} />
      <span
        className="font-label uppercase"
        style={{fontSize: '0.52rem', letterSpacing: '0.45em', color: 'rgba(201,169,97,0.38)'}}
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{background: 'rgba(201,169,97,0.18)'}} />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function GymPage() {
  const [gender, setGender] = useState<string | null>(null);

  useEffect(() => {
    setGender(localStorage.getItem('finesse_gender'));
  }, []);

  const isMasc = gender === 'masculine';
  const accent = isMasc ? '#FFA96B' : '#FF4D7D';

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="min-h-screen relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[420px]"
          style={{background: `radial-gradient(ellipse at center, ${accent}09 0%, transparent 65%)`}}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[340px] h-[340px]"
          style={{
            background: 'radial-gradient(circle, rgba(201,169,97,0.05) 0%, transparent 60%)',
            animation: 'gym-pulse 6s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="text-center pt-12 pb-8 relative z-10">
        <motion.div initial={{opacity: 0, y: -12}} animate={{opacity: 1, y: 0}} transition={{delay: 0.15}}>
          <div style={{color: accent, fontSize: '2rem', lineHeight: 1, marginBottom: '0.75rem'}}>
            {isMasc ? '◈' : '✦'}
          </div>
          <h1
            className="font-display italic tracking-[0.18em]"
            style={{fontSize: '2.2rem', color: 'rgba(244,232,208,0.85)'}}
          >
            {isMasc ? 'THE GYM' : 'THE STUDIO'}
          </h1>
          <p
            className="font-label uppercase mt-2"
            style={{fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(244,232,208,0.22)'}}
          >
            {isMasc ? 'performance. recovery. results.' : 'move with intention'}
          </p>

          {/* Nova status line */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{delay: 0.5}}
            className="mt-5 mx-auto max-w-xs"
            style={{
              border: `1px solid ${accent}20`,
              background: `${accent}06`,
              padding: '0.6rem 1.1rem',
            }}
          >
            <p
              className="font-body italic"
              style={{fontSize: '0.76rem', color: 'rgba(244,232,208,0.45)', lineHeight: 1.55}}
            >
              {isMasc
                ? 'Nova says: You skipped Monday. I\'m not judging — I\'m rescheduling.'
                : 'Nova noticed you went 3 for 3 this week. Consistency is the move.'}
            </p>
          </motion.div>
        </motion.div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 pb-32 relative z-10">

        {/* ════ FEMININE EXPERIENCE ═══════════════════════════════════════════ */}
        {!isMasc && (
          <motion.div
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.3, duration: 0.45}}
          >
            {/* This Week */}
            <GoldDivider label="this week" />
            <div
              style={{
                border: '1px solid rgba(201,169,97,0.12)',
                background: 'rgba(10,4,6,0.7)',
                backdropFilter: 'blur(8px)',
                padding: '1.4rem',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-display" style={{fontSize: '1rem', color: 'rgba(244,232,208,0.78)'}}>
                  3 sessions completed
                </span>
                <span
                  className="font-label uppercase"
                  style={{fontSize: '0.52rem', letterSpacing: '0.25em', color: '#FF4D7D', border: '1px solid #FF4D7D30', padding: '0.25rem 0.6rem'}}
                >
                  3 for 3
                </span>
              </div>
              <div className="flex gap-2 mb-3">
                {['Mon', 'Wed', 'Sat'].map((d) => (
                  <div
                    key={d}
                    className="flex-1 text-center py-2"
                    style={{background: 'rgba(255,77,125,0.1)', border: '1px solid rgba(255,77,125,0.2)'}}
                  >
                    <div className="font-mono" style={{fontSize: '0.55rem', color: 'rgba(244,232,208,0.35)', letterSpacing: '0.15em'}}>{d}</div>
                    <div style={{color: '#FF4D7D', fontSize: '0.85rem', marginTop: '0.2rem'}}>✓</div>
                  </div>
                ))}
              </div>
              <p
                className="font-body italic"
                style={{fontSize: '0.74rem', color: 'rgba(244,232,208,0.32)', lineHeight: 1.55}}
              >
                "Consistency is the move."
              </p>
            </div>

            {/* My Classes */}
            <GoldDivider label="my classes" />
            <div className="space-y-3">
              {FEM_CLASSES.map((cls, i) => (
                <motion.div
                  key={i}
                  initial={{opacity: 0, x: -8}}
                  animate={{opacity: 1, x: 0}}
                  transition={{delay: 0.35 + i * 0.07}}
                  style={{
                    border: '1px solid rgba(201,169,97,0.12)',
                    background: 'rgba(14,6,8,0.8)',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <p className="font-display" style={{fontSize: '1rem', color: 'rgba(244,232,208,0.8)'}}>{cls.name}</p>
                    <p className="font-body" style={{fontSize: '0.75rem', color: 'rgba(244,232,208,0.38)', marginTop: '0.2rem'}}>{cls.studio}</p>
                    {cls.instructor !== 'Studio Class' && (
                      <p className="font-label uppercase" style={{fontSize: '0.52rem', letterSpacing: '0.18em', color: 'rgba(201,169,97,0.5)', marginTop: '0.3rem'}}>
                        {cls.instructor}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono" style={{fontSize: '0.7rem', color: 'rgba(244,232,208,0.55)'}}>{cls.day}</p>
                    <p className="font-mono" style={{fontSize: '0.88rem', color: '#C9A84C', marginTop: '0.15rem'}}>{cls.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* My Trainer */}
            <GoldDivider label="my trainer" />
            <motion.div
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: 0.55}}
              style={{
                border: '1px solid rgba(255,77,125,0.18)',
                background: 'rgba(255,77,125,0.04)',
                backdropFilter: 'blur(8px)',
                padding: '1.5rem',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display" style={{fontSize: '1.25rem', color: 'rgba(244,232,208,0.85)'}}>{FEM_TRAINER.name}</h3>
                  <p className="font-label uppercase mt-1" style={{fontSize: '0.52rem', letterSpacing: '0.25em', color: 'rgba(201,169,97,0.55)'}}>
                    {FEM_TRAINER.specialty}
                  </p>
                </div>
                <span
                  className="font-mono"
                  style={{fontSize: '0.75rem', color: '#C9A84C', border: '1px solid rgba(201,169,97,0.2)', padding: '0.3rem 0.65rem'}}
                >
                  {FEM_TRAINER.rate}
                </span>
              </div>
              <div className="h-px mb-4" style={{background: 'rgba(201,169,97,0.1)'}} />
              <div className="flex items-center justify-between mb-4">
                <span className="font-label uppercase" style={{fontSize: '0.52rem', letterSpacing: '0.2em', color: 'rgba(244,232,208,0.28)'}}>Next session</span>
                <span className="font-mono" style={{fontSize: '0.78rem', color: 'rgba(244,232,208,0.65)'}}>{FEM_TRAINER.nextSession}</span>
              </div>
              <p className="font-body italic" style={{fontSize: '0.76rem', color: 'rgba(244,232,208,0.35)', lineHeight: 1.55}}>
                "{FEM_TRAINER.novaNote}"
              </p>
            </motion.div>

            {/* Recovery */}
            <GoldDivider label="recovery" />
            <div className="space-y-3">
              {FEM_RECOVERY.map((item, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid rgba(201,169,97,0.1)',
                    background: 'rgba(14,6,8,0.7)',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <p className="font-display" style={{fontSize: '0.95rem', color: 'rgba(244,232,208,0.78)'}}>{item.name}</p>
                    <p className="font-body" style={{fontSize: '0.72rem', color: 'rgba(244,232,208,0.35)', marginTop: '0.2rem'}}>{item.venue}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono" style={{fontSize: '0.88rem', color: '#C9A84C'}}>{item.price}</p>
                    <p className="font-mono" style={{fontSize: '0.62rem', color: 'rgba(244,232,208,0.3)', marginTop: '0.2rem'}}>{item.when}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Gear Wishlist */}
            <GoldDivider label="gear wishlist" />
            <div className="space-y-3">
              {FEM_GEAR.map((item, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid rgba(201,169,97,0.1)',
                    background: 'rgba(14,6,8,0.7)',
                    padding: '1.1rem 1.25rem',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-label uppercase" style={{fontSize: '0.52rem', letterSpacing: '0.22em', color: 'rgba(201,169,97,0.5)', marginRight: '0.5rem'}}>{item.brand}</span>
                      <span className="font-body" style={{fontSize: '0.88rem', color: 'rgba(244,232,208,0.72)'}}>{item.name}</span>
                    </div>
                    <span className="font-mono" style={{fontSize: '0.85rem', color: '#C9A84C', marginLeft: '1rem'}}>{item.price}</span>
                  </div>
                  <p className="font-body italic" style={{fontSize: '0.7rem', color: 'rgba(244,232,208,0.28)', marginTop: '0.35rem'}}>{item.novaNote}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ════ MASCULINE EXPERIENCE ══════════════════════════════════════════ */}
        {isMasc && (
          <motion.div
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.3, duration: 0.45}}
          >
            {/* Performance Stats */}
            <GoldDivider label="performance" />
            <div className="grid grid-cols-2 gap-3">
              {MASC_STATS.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{opacity: 0, scale: 0.96}}
                  animate={{opacity: 1, scale: 1}}
                  transition={{delay: 0.3 + i * 0.07}}
                  style={{
                    border: '1px solid rgba(201,169,97,0.12)',
                    background: 'rgba(14,6,8,0.8)',
                    padding: '1.1rem',
                    textAlign: 'center',
                  }}
                >
                  <p className="font-display" style={{fontSize: i === 3 ? '0.85rem' : '1.6rem', color: '#FFA96B', lineHeight: 1}}>
                    {stat.value}
                  </p>
                  <p className="font-label uppercase mt-2" style={{fontSize: '0.5rem', letterSpacing: '0.25em', color: 'rgba(244,232,208,0.3)'}}>
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Nova Check-In */}
            <GoldDivider label="nova check-in" />
            <motion.div
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: 0.5}}
              style={{
                border: '1px solid rgba(255,169,107,0.18)',
                background: 'rgba(255,169,107,0.04)',
                padding: '1.4rem',
              }}
            >
              <p className="font-label uppercase mb-3" style={{fontSize: '0.52rem', letterSpacing: '0.3em', color: 'rgba(255,169,107,0.6)'}}>
                Nova
              </p>
              <p className="font-body italic" style={{fontSize: '0.9rem', color: 'rgba(244,232,208,0.62)', lineHeight: 1.65}}>
                "You skipped Monday. I'm not judging — I'm rescheduling. Marcus has 6am Thursday open. Confirmed."
              </p>
            </motion.div>

            {/* My Schedule */}
            <GoldDivider label="my schedule" />
            <div className="space-y-3">
              {MASC_SCHEDULE.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{opacity: 0, x: -8}}
                  animate={{opacity: 1, x: 0}}
                  transition={{delay: 0.4 + i * 0.07}}
                  style={{
                    border: '1px solid rgba(201,169,97,0.12)',
                    background: 'rgba(14,6,8,0.8)',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <p className="font-display" style={{fontSize: '0.95rem', color: 'rgba(244,232,208,0.8)'}}>{item.name}</p>
                    <p className="font-body" style={{fontSize: '0.72rem', color: 'rgba(244,232,208,0.35)', marginTop: '0.2rem'}}>{item.venue}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono" style={{fontSize: '0.65rem', color: 'rgba(244,232,208,0.45)'}}>{item.day}</p>
                    <p className="font-mono" style={{fontSize: '0.88rem', color: '#C9A84C', marginTop: '0.1rem'}}>{item.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Gear */}
            <GoldDivider label="gear — nova's picks" />
            <div className="space-y-3">
              {MASC_GEAR.map((item, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid rgba(201,169,97,0.1)',
                    background: 'rgba(14,6,8,0.7)',
                    padding: '1.1rem 1.25rem',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-label uppercase" style={{fontSize: '0.52rem', letterSpacing: '0.22em', color: 'rgba(201,169,97,0.5)', marginRight: '0.5rem'}}>{item.brand}</span>
                      <span className="font-body" style={{fontSize: '0.88rem', color: 'rgba(244,232,208,0.72)'}}>{item.name}</span>
                    </div>
                    <span className="font-mono" style={{fontSize: '0.85rem', color: '#C9A84C', marginLeft: '1rem'}}>{item.price}</span>
                  </div>
                  <p className="font-body italic" style={{fontSize: '0.7rem', color: 'rgba(244,232,208,0.28)', marginTop: '0.35rem'}}>"{item.novaNote}"</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </main>

      {/* ── Bottom action bar ──────────────────────────────────────────────── */}
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.7, duration: 0.4}}
        className="fixed bottom-0 left-0 right-0 z-30"
        style={{
          background: 'linear-gradient(to top, #0A0406 60%, transparent)',
          borderTop: '1px solid rgba(201,169,97,0.1)',
          padding: '1.25rem 1.5rem 2rem',
        }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            className="flex-1 py-3 font-label uppercase transition-all duration-300"
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.3em',
              background: accent,
              color: '#0A0406',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isMasc ? 'Book Recovery Session' : 'Add a Class'}
          </button>
          <Link
            href="/lobby"
            className="font-label uppercase transition-colors"
            style={{
              fontSize: '0.55rem',
              letterSpacing: '0.25em',
              color: 'rgba(244,232,208,0.22)',
              whiteSpace: 'nowrap',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(201,169,97,0.1)',
            }}
          >
            Lobby
          </Link>
        </div>
      </motion.div>

      {/* Floor gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{background: 'linear-gradient(to top, rgba(74,25,34,0.08), transparent)'}}
      />

      <style jsx>{`
        @keyframes gym-pulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
