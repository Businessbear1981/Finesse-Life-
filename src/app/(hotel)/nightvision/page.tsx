'use client';

import {useState, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Edition = 'finesse' | 'carpe_diem';
type PageState = 'connect' | 'analyzing' | 'profile';

interface Answers {
  movement: string;
  spending: string[];
  age: string;
  identity: string;
  fragrance: string;
  pricepoint: string;
  cities: string[];
}

interface Sources {
  instagram: boolean;
  snapchat: boolean;
  plaid: boolean;
  spotify: boolean;
}

interface NightvisionProfile {
  answers: Answers;
  style_dna: string;
  brand_radar: string[];
  style_tags: string[];
  generated_at: string;
}

interface AnalyzeResponse {
  style_dna: string;
  brand_radar: string[];
  style_tags: string[];
}

interface ProfileGetResponse {
  profile: NightvisionProfile | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#69C9D0';
const BRASS = '#C9A961';
const CREAM = '#F4E8D0';
const BG = '#0A0406';

const QUESTIONS = [
  {
    id: 'movement' as const,
    label: 'HOW DO YOU MOVE?',
    type: 'single' as const,
    options: ['Luxury/Editorial', 'Streetwear', 'Business', 'Casual', 'Hybrid'],
  },
  {
    id: 'spending' as const,
    label: 'WHAT DO YOU SPEND MOST ON?',
    type: 'multi' as const,
    options: ['Clothes', 'Shoes', 'Bags', 'Jewelry', 'Fragrance', 'Tech', 'Experiences'],
  },
  {
    id: 'age' as const,
    label: 'YOUR AGE RANGE?',
    type: 'single' as const,
    options: ['18–24', '25–34', '35–44', '45+'],
  },
  {
    id: 'identity' as const,
    label: 'YOUR CULTURAL IDENTITY?',
    sublabel: 'This shapes brand curation. Entirely optional.',
    type: 'single' as const,
    options: [
      'Black/African American',
      'Latina/Hispanic',
      'Asian/Pacific Islander',
      'White/European',
      'Mixed',
      'Other',
      'Prefer not to say',
    ],
  },
  {
    id: 'fragrance' as const,
    label: 'FRAGRANCE DIRECTION?',
    type: 'single' as const,
    options: ['Florals', 'Woody/Musky', 'Fresh/Clean', 'Dark/Intense', "I don't wear fragrance"],
  },
  {
    id: 'pricepoint' as const,
    label: 'PRICE POINT PER PIECE?',
    type: 'single' as const,
    options: ['Under $200', '$200–500', '$500–1k', '$1k+'],
  },
  {
    id: 'cities' as const,
    label: 'STYLE CITIES?',
    sublabel: 'Select all that influence you.',
    type: 'multi' as const,
    options: ['NYC', 'ATL', 'LA', 'Miami', 'Paris', 'London', 'Tokyo', 'Lagos', 'Seoul'],
  },
];

const SCAN_LINES = [
  'Instagram feed...',
  'Brand mentions...',
  'Purchase history...',
  'Style patterns...',
  'Cultural signals...',
  'Fragrance identity...',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAnswersComplete(a: Answers): boolean {
  return (
    a.movement !== '' &&
    a.spending.length > 0 &&
    a.age !== '' &&
    a.identity !== '' &&
    a.fragrance !== '' &&
    a.pricepoint !== '' &&
    a.cities.length > 0
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const EMPTY_ANSWERS: Answers = {
  movement: '',
  spending: [],
  age: '',
  identity: '',
  fragrance: '',
  pricepoint: '',
  cities: [],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LED({on}: {on: boolean}) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: on ? '#4ADE80' : 'rgba(244,232,208,0.15)',
        boxShadow: on ? '0 0 6px #4ADE80' : 'none',
        flexShrink: 0,
        transition: 'all 0.3s',
      }}
    />
  );
}

function SectionLabel({children}: {children: React.ReactNode}) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-label)',
        fontSize: '8px',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        color: `${TEAL}88`,
        marginBottom: '16px',
      }}
    >
      {children}
    </p>
  );
}

interface ConnectCardProps {
  title: string;
  subtitle: string;
  detail: string;
  connected: boolean;
  onConnect: () => void;
}

function ConnectCard({title, subtitle, detail, connected, onConnect}: ConnectCardProps) {
  return (
    <motion.div
      initial={{opacity: 0, y: 16}}
      animate={{opacity: 1, y: 0}}
      style={{
        border: `1px solid ${connected ? TEAL + '55' : 'rgba(201,169,97,0.15)'}`,
        background: connected ? `${TEAL}08` : 'rgba(244,232,208,0.015)',
        padding: '22px 20px',
        transition: 'border-color 0.4s, background 0.4s',
      }}
    >
      <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px'}}>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '10px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: connected ? TEAL : BRASS,
              marginBottom: '4px',
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: '11px',
              color: 'rgba(244,232,208,0.4)',
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        </div>
        <LED on={connected} />
      </div>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'rgba(244,232,208,0.5)',
          marginBottom: '16px',
          lineHeight: 1.6,
        }}
      >
        {detail}
      </p>
      {connected ? (
        <span
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '8px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#4ADE80',
          }}
        >
          CONNECTED
        </span>
      ) : (
        <button
          onClick={onConnect}
          style={{
            background: 'none',
            border: `1px solid ${TEAL}`,
            color: TEAL,
            fontFamily: 'var(--font-label)',
            fontSize: '8px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            padding: '8px 20px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${TEAL}18`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
          }}
        >
          CONNECT
        </button>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NightvisionPage() {
  // ── edition ──
  const [edition, setEdition] = useState<Edition>('finesse');
  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  // ── auth ──
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({data}) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  // ── page state ──
  const [pageState, setPageState] = useState<PageState>('connect');
  const [profileLoaded, setProfileLoaded] = useState(false);

  // ── sources ──
  const [sources, setSources] = useState<Sources>({
    instagram: false,
    snapchat: false,
    plaid: false,
    spotify: false,
  });

  // ── questionnaire ──
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [currentQ, setCurrentQ] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // ── scan state ──
  const [scanChecks, setScanChecks] = useState<boolean[]>(new Array(SCAN_LINES.length).fill(false));

  // ── profile result ──
  const [nvProfile, setNvProfile] = useState<NightvisionProfile | null>(null);

  // ── load existing profile on mount ──
  useEffect(() => {
    if (!userId) return;
    fetch('/api/nightvision/profile')
      .then((r) => r.json())
      .then((d: ProfileGetResponse) => {
        if (d.profile) {
          setNvProfile(d.profile);
          setAnswers(d.profile.answers as Answers);
          setPageState('profile');
        }
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [userId]);

  // ── if no userId yet, still mark loaded after a beat ──
  useEffect(() => {
    const t = setTimeout(() => setProfileLoaded(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── connect handlers ──
  const handleConnectInstagram = () => {
    const hasEnv = !!process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
    if (!hasEnv) {
      showToast('Instagram OAuth · wiring in progress');
      // Optimistically mark connected for demo flow
      setSources((p) => ({...p, instagram: true}));
      return;
    }
    window.location.href = '/api/auth/instagram';
  };

  const handleConnectSnapchat = () => {
    showToast('Snapchat OAuth · wiring in progress');
    setSources((p) => ({...p, snapchat: true}));
  };

  const handleConnectPlaid = async () => {
    try {
      const res = await fetch('/api/plaid/link', {method: 'POST'});
      if (!res.ok) throw new Error('not configured');
      const data = (await res.json()) as {link_token?: string};
      if (data.link_token) {
        showToast('Plaid Link initializing...');
        setSources((p) => ({...p, plaid: true}));
      }
    } catch {
      showToast('Plaid · wiring in progress');
      setSources((p) => ({...p, plaid: true}));
    }
  };

  const handleConnectSpotify = () => {
    window.location.href = '/api/auth/spotify';
  };

  // ── questionnaire handlers ──
  function handleSingleSelect(qId: keyof Answers, value: string) {
    setAnswers((prev) => ({...prev, [qId]: value}));
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ((q) => q + 1), 260);
    }
  }

  function handleMultiToggle(qId: 'spending' | 'cities', value: string) {
    setAnswers((prev) => {
      const arr = prev[qId] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return {...prev, [qId]: next};
    });
  }

  function advanceMulti() {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((q) => q + 1);
    }
  }

  const anySourceConnected = sources.instagram || sources.snapchat || sources.plaid || sources.spotify;
  const questionnaireComplete = isAnswersComplete(answers);
  const canGenerate = questionnaireComplete || anySourceConnected;

  // ── run analysis ──
  async function runAnalysis() {
    setPageState('analyzing');

    // Animate scan checks sequentially
    for (let i = 0; i < SCAN_LINES.length; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 420));
      setScanChecks((prev) => {
        const next = [...prev];
        next[i] = true;
        return next;
      });
    }

    try {
      const res = await fetch('/api/nightvision/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({answers, sources}),
      });

      const data = (await res.json()) as AnalyzeResponse;

      const profile: NightvisionProfile = {
        answers,
        style_dna: data.style_dna,
        brand_radar: data.brand_radar,
        style_tags: data.style_tags,
        generated_at: new Date().toISOString(),
      };

      // Save to Supabase
      await fetch('/api/nightvision/profile', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(profile),
      });

      setNvProfile(profile);
      setPageState('profile');
    } catch {
      showToast('Analysis failed — check connection');
      setPageState('connect');
      setScanChecks(new Array(SCAN_LINES.length).fill(false));
    }
  }

  const _ = edition; // suppress unused var warning — used for future styling forks

  if (!profileLoaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '9px',
            letterSpacing: '0.4em',
            color: `${TEAL}55`,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          NIGHTVISION
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{background: BG, color: CREAM}}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${TEAL}08 0%, transparent 55%)`,
        }}
      />

      {/* Scan-line texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${TEAL}03 2px,
            ${TEAL}03 4px
          )`,
        }}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{opacity: 0, y: -12}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -12}}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0F0A0C',
              border: `1px solid ${TEAL}44`,
              color: TEAL,
              fontFamily: 'var(--font-label)',
              fontSize: '8px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              padding: '10px 20px',
              zIndex: 100,
              whiteSpace: 'nowrap',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-24">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER — always visible */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {pageState !== 'analyzing' && (
            <motion.header
              key="header"
              initial={{opacity: 0, y: -12}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              transition={{duration: 0.6}}
              className="text-center pt-14 pb-8"
            >
              {/* Eye icon */}
              <div style={{marginBottom: '16px'}}>
                <svg
                  width="28"
                  height="18"
                  viewBox="0 0 28 18"
                  fill="none"
                  style={{display: 'inline-block'}}
                >
                  <ellipse cx="14" cy="9" rx="13" ry="8" stroke={TEAL} strokeWidth="1.2" opacity="0.6" />
                  <circle cx="14" cy="9" r="3.5" fill="none" stroke={TEAL} strokeWidth="1.2" opacity="0.9" />
                  <circle cx="14" cy="9" r="1.2" fill={TEAL} opacity="0.8" />
                  <line x1="0" y1="9" x2="5" y2="9" stroke={TEAL} strokeWidth="0.8" opacity="0.4" />
                  <line x1="23" y1="9" x2="28" y2="9" stroke={TEAL} strokeWidth="0.8" opacity="0.4" />
                </svg>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 'clamp(28px, 8vw, 42px)',
                  color: TEAL,
                  letterSpacing: '0.18em',
                  marginBottom: '8px',
                }}
              >
                NIGHTVISION
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontStyle: 'italic',
                  fontSize: '13px',
                  color: 'rgba(244,232,208,0.3)',
                  letterSpacing: '0.08em',
                }}
              >
                {pageState === 'profile'
                  ? 'intelligence file active'
                  : 'your intelligence file'}
              </p>
              <div
                style={{
                  width: '40px',
                  height: '1px',
                  background: `${TEAL}44`,
                  margin: '14px auto 0',
                }}
              />
            </motion.header>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STATE 1: CONNECT                                           */}
          {/* ─────────────────────────────────────────────────────────── */}
          {pageState === 'connect' && (
            <motion.div
              key="connect"
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -16}}
              transition={{duration: 0.5}}
            >
              {/* Nova briefing */}
              <div
                style={{
                  border: `1px solid ${TEAL}22`,
                  background: `${TEAL}06`,
                  padding: '20px',
                  marginBottom: '32px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-label)',
                    fontSize: '7px',
                    letterSpacing: '0.35em',
                    textTransform: 'uppercase',
                    color: `${TEAL}66`,
                    marginBottom: '10px',
                  }}
                >
                  NOVA · INTELLIGENCE ENGINE
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontStyle: 'italic',
                    fontSize: '14px',
                    color: 'rgba(244,232,208,0.65)',
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  NIGHTVISION builds your complete intelligence file — style, taste, music, spending. The more you share, the more precise we get. Your data stays in Finesse and only makes your experience sharper.
                </p>
              </div>

              {/* Connect cards */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px'}}>
                <SectionLabel>DATA SOURCES</SectionLabel>

                <ConnectCard
                  title="INSTAGRAM"
                  subtitle="Visual identity layer"
                  detail="We read your posts, brand tags, aesthetic, visual identity. Style signals extracted from your feed."
                  connected={sources.instagram}
                  onConnect={handleConnectInstagram}
                />

                <ConnectCard
                  title="SNAPCHAT"
                  subtitle="Social graph layer"
                  detail="Story patterns, social graph, location signals. How you move, who you move with."
                  connected={sources.snapchat}
                  onConnect={handleConnectSnapchat}
                />

                <ConnectCard
                  title="PLAID · SPENDING INTEL"
                  subtitle="Transaction layer"
                  detail="Real transaction data. We see what brands you actually pay for — not just follow."
                  connected={sources.plaid}
                  onConnect={handleConnectPlaid}
                />

                <ConnectCard
                  title="SPOTIFY · MUSIC INTELLIGENCE"
                  subtitle="Taste signal layer"
                  detail="Top artists, genres, recently played. Music is the fastest read on who you really are."
                  connected={sources.spotify}
                  onConnect={handleConnectSpotify}
                />
              </div>

              {/* Questionnaire */}
              <div style={{marginBottom: '40px'}}>
                <SectionLabel>STYLE QUESTIONNAIRE · {currentQ + 1} / {QUESTIONS.length}</SectionLabel>

                {/* Progress bar */}
                <div
                  style={{
                    height: '1px',
                    background: 'rgba(201,169,97,0.1)',
                    marginBottom: '24px',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    style={{height: '100%', background: TEAL}}
                    animate={{width: `${((currentQ + 1) / QUESTIONS.length) * 100}%`}}
                    transition={{duration: 0.4}}
                  />
                </div>

                <AnimatePresence mode="wait">
                  {QUESTIONS.map((q, idx) =>
                    idx === currentQ ? (
                      <motion.div
                        key={q.id}
                        initial={{opacity: 0, x: 20}}
                        animate={{opacity: 1, x: 0}}
                        exit={{opacity: 0, x: -20}}
                        transition={{duration: 0.3}}
                      >
                        <p
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '10px',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            color: CREAM,
                            marginBottom: q.sublabel ? '4px' : '16px',
                          }}
                        >
                          {q.label}
                        </p>
                        {q.sublabel && (
                          <p
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontStyle: 'italic',
                              fontSize: '11px',
                              color: 'rgba(244,232,208,0.35)',
                              marginBottom: '14px',
                            }}
                          >
                            {q.sublabel}
                          </p>
                        )}

                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                          {q.options.map((opt) => {
                            const answerVal = answers[q.id];
                            const isSelected =
                              q.type === 'single'
                                ? answerVal === opt
                                : Array.isArray(answerVal) && (answerVal as string[]).includes(opt);

                            return (
                              <button
                                key={opt}
                                onClick={() => {
                                  if (q.type === 'single') {
                                    handleSingleSelect(q.id, opt);
                                  } else {
                                    handleMultiToggle(q.id as 'spending' | 'cities', opt);
                                  }
                                }}
                                style={{
                                  background: isSelected ? `${TEAL}22` : 'rgba(244,232,208,0.03)',
                                  border: `1px solid ${isSelected ? TEAL : 'rgba(201,169,97,0.15)'}`,
                                  color: isSelected ? TEAL : 'rgba(244,232,208,0.55)',
                                  fontFamily: 'var(--font-body)',
                                  fontSize: '13px',
                                  padding: '8px 16px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {q.type === 'multi' && (
                          <button
                            onClick={advanceMulti}
                            style={{
                              marginTop: '16px',
                              background: 'none',
                              border: `1px solid ${TEAL}44`,
                              color: TEAL,
                              fontFamily: 'var(--font-label)',
                              fontSize: '8px',
                              letterSpacing: '0.3em',
                              textTransform: 'uppercase',
                              padding: '8px 20px',
                              cursor: 'pointer',
                              display: idx < QUESTIONS.length - 1 ? 'inline-block' : 'none',
                            }}
                          >
                            NEXT →
                          </button>
                        )}
                      </motion.div>
                    ) : null,
                  )}
                </AnimatePresence>

                {/* Q navigation pills */}
                <div style={{display: 'flex', gap: '4px', marginTop: '20px'}}>
                  {QUESTIONS.map((q, idx) => {
                    const answerVal = answers[q.id];
                    const done =
                      q.type === 'single'
                        ? answerVal !== ''
                        : Array.isArray(answerVal) && (answerVal as string[]).length > 0;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQ(idx)}
                        style={{
                          width: '24px',
                          height: '3px',
                          background: idx === currentQ ? TEAL : done ? `${TEAL}55` : 'rgba(201,169,97,0.12)',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.3s',
                          padding: 0,
                        }}
                        aria-label={`Go to question ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* CTA */}
              <AnimatePresence>
                {canGenerate && (
                  <motion.div
                    initial={{opacity: 0, y: 12}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0}}
                    style={{textAlign: 'center', marginBottom: '20px'}}
                  >
                    <button
                      onClick={runAnalysis}
                      style={{
                        background: TEAL,
                        color: BG,
                        fontFamily: 'var(--font-label)',
                        fontSize: '10px',
                        letterSpacing: '0.35em',
                        textTransform: 'uppercase',
                        padding: '16px 40px',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        maxWidth: '360px',
                      }}
                    >
                      GENERATE STYLE DNA
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Skip option */}
              {!anySourceConnected && (
                <div style={{textAlign: 'center'}}>
                  <button
                    onClick={() => {
                      if (questionnaireComplete) {
                        runAnalysis();
                      } else {
                        showToast('Complete the questionnaire first');
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(244,232,208,0.2)',
                      fontFamily: 'var(--font-body)',
                      fontStyle: 'italic',
                      fontSize: '12px',
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                      padding: '8px',
                    }}
                  >
                    Skip connections, build from answers only
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STATE 2: ANALYZING                                         */}
          {/* ─────────────────────────────────────────────────────────── */}
          {pageState === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '80px',
              }}
            >
              {/* Scanning lines CSS animation */}
              <style>{`
                @keyframes scan-down {
                  0% { transform: translateY(-100%); opacity: 0.7; }
                  100% { transform: translateY(100vh); opacity: 0; }
                }
                @keyframes blink-nv {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.2; }
                }
                @keyframes pulse-teal {
                  0%, 100% { box-shadow: 0 0 0 0 rgba(105,201,208,0); }
                  50% { box-shadow: 0 0 20px 4px rgba(105,201,208,0.15); }
                }
              `}</style>

              {/* Scanner graphic */}
              <div
                style={{
                  position: 'relative',
                  width: '140px',
                  height: '140px',
                  border: `1px solid ${TEAL}33`,
                  marginBottom: '40px',
                  overflow: 'hidden',
                  animation: 'pulse-teal 2s ease-in-out infinite',
                }}
              >
                {/* Corner marks */}
                {([
                  {key: 'tl', style: {top: 0, left: 0, borderWidth: '1.5px 0 0 1.5px'}},
                  {key: 'tr', style: {top: 0, right: 0, borderWidth: '1.5px 1.5px 0 0'}},
                  {key: 'bl', style: {bottom: 0, left: 0, borderWidth: '0 0 1.5px 1.5px'}},
                  {key: 'br', style: {bottom: 0, right: 0, borderWidth: '0 1.5px 1.5px 0'}},
                ] as const).map(({key, style}) => (
                  <div
                    key={key}
                    style={{
                      position: 'absolute',
                      width: '16px',
                      height: '16px',
                      borderColor: TEAL,
                      borderStyle: 'solid',
                      ...style,
                    }}
                  />
                ))}

                {/* Scan line */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
                    animation: 'scan-down 1.8s linear infinite',
                    top: 0,
                  }}
                />

                {/* Center eye */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
                    <ellipse cx="16" cy="10" rx="15" ry="9" stroke={TEAL} strokeWidth="1" opacity="0.5" />
                    <circle cx="16" cy="10" r="4" fill="none" stroke={TEAL} strokeWidth="1" opacity="0.9" />
                    <circle cx="16" cy="10" r="1.5" fill={TEAL} />
                  </svg>
                </div>
              </div>

              {/* NIGHTVISION ACTIVE */}
              <p
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '11px',
                  letterSpacing: '0.5em',
                  textTransform: 'uppercase',
                  color: TEAL,
                  marginBottom: '32px',
                  animation: 'blink-nv 1.4s ease-in-out infinite',
                }}
              >
                NIGHTVISION ACTIVE
              </p>

              {/* Scan progress */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '32px',
                }}
              >
                {SCAN_LINES.map((line, i) => (
                  <div
                    key={line}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: scanChecks[i] || i === scanChecks.filter(Boolean).length ? 1 : 0.25,
                      transition: 'opacity 0.3s',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        border: `1px solid ${TEAL}55`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: TEAL,
                        fontSize: '9px',
                        transition: 'background 0.3s',
                        background: scanChecks[i] ? `${TEAL}22` : 'transparent',
                      }}
                    >
                      {scanChecks[i] ? '✓' : ''}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, Courier New)',
                        fontSize: '11px',
                        color: scanChecks[i] ? TEAL : 'rgba(244,232,208,0.3)',
                        letterSpacing: '0.05em',
                        transition: 'color 0.3s',
                      }}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>

              {/* Nova typing */}
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontStyle: 'italic',
                  fontSize: '12px',
                  color: 'rgba(244,232,208,0.3)',
                  letterSpacing: '0.06em',
                }}
              >
                Calibrating your profile...
              </p>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STATE 3: PROFILE REVEALED                                  */}
          {/* ─────────────────────────────────────────────────────────── */}
          {pageState === 'profile' && nvProfile && (
            <motion.div
              key="profile"
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              transition={{duration: 0.6}}
            >
              {/* Classified header strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '28px',
                  paddingBottom: '12px',
                  borderBottom: `1px solid ${TEAL}22`,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-label)',
                    fontSize: '8px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'rgba(244,232,208,0.25)',
                  }}
                >
                  GENERATED {formatDate(nvProfile.generated_at)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-label)',
                    fontSize: '7px',
                    letterSpacing: '0.35em',
                    textTransform: 'uppercase',
                    color: TEAL,
                    border: `1px solid ${TEAL}55`,
                    padding: '3px 8px',
                  }}
                >
                  CLASSIFIED
                </span>
              </div>

              {/* Style DNA Card */}
              <div
                style={{
                  border: `1px solid ${BRASS}44`,
                  background: `${BRASS}06`,
                  padding: '24px',
                  marginBottom: '28px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Corner accent */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(225deg, ${TEAL}12 0%, transparent 60%)`,
                  }}
                />
                <p
                  style={{
                    fontFamily: 'var(--font-label)',
                    fontSize: '8px',
                    letterSpacing: '0.4em',
                    textTransform: 'uppercase',
                    color: `${BRASS}88`,
                    marginBottom: '14px',
                  }}
                >
                  STYLE DNA · NOVA ANALYSIS
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontStyle: 'italic',
                    fontSize: '15px',
                    color: 'rgba(244,232,208,0.85)',
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                >
                  {nvProfile.style_dna}
                </p>
              </div>

              {/* Connected Sources */}
              <div style={{marginBottom: '28px'}}>
                <SectionLabel>CONNECTED SOURCES</SectionLabel>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {[
                    {key: 'instagram' as const, label: 'INSTAGRAM', detail: 'Visual identity'},
                    {key: 'snapchat' as const, label: 'SNAPCHAT', detail: 'Social graph'},
                    {key: 'plaid' as const, label: 'PLAID', detail: 'Transaction data'},
                    {key: 'spotify' as const, label: 'SPOTIFY', detail: 'Music intelligence'},
                  ].map(({key, label, detail}) => {
                    const connected = nvProfile.answers && sources[key];
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          border: '1px solid rgba(201,169,97,0.08)',
                          background: 'rgba(244,232,208,0.01)',
                        }}
                      >
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <LED on={connected} />
                          <span
                            style={{
                              fontFamily: 'var(--font-label)',
                              fontSize: '8px',
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: connected ? TEAL : 'rgba(244,232,208,0.3)',
                            }}
                          >
                            {label}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontStyle: 'italic',
                            fontSize: '11px',
                            color: 'rgba(244,232,208,0.25)',
                          }}
                        >
                          {connected ? detail : 'not connected'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Brand Radar */}
              {nvProfile.brand_radar && nvProfile.brand_radar.length > 0 && (
                <div style={{marginBottom: '28px'}}>
                  <SectionLabel>BRAND RADAR</SectionLabel>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                    {nvProfile.brand_radar.map((brand, i) => (
                      <motion.span
                        key={brand}
                        initial={{opacity: 0, scale: 0.9}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{delay: i * 0.04}}
                        style={{
                          fontFamily: 'var(--font-label)',
                          fontSize: '8px',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: TEAL,
                          border: `1px solid ${TEAL}33`,
                          background: `${TEAL}08`,
                          padding: '5px 12px',
                        }}
                      >
                        {brand}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Style Tags */}
              {nvProfile.style_tags && nvProfile.style_tags.length > 0 && (
                <div style={{marginBottom: '36px'}}>
                  <SectionLabel>STYLE TAGS</SectionLabel>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                    {nvProfile.style_tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontStyle: 'italic',
                          fontSize: '12px',
                          color: 'rgba(244,232,208,0.55)',
                          border: '1px solid rgba(201,169,97,0.15)',
                          padding: '4px 12px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Profile button */}
              <div style={{textAlign: 'center', marginBottom: '16px'}}>
                <button
                  onClick={() => {
                    // Pre-fill and go back to connect state
                    setAnswers(nvProfile.answers as Answers);
                    setCurrentQ(0);
                    setScanChecks(new Array(SCAN_LINES.length).fill(false));
                    setPageState('connect');
                  }}
                  style={{
                    background: 'none',
                    border: `1px solid ${TEAL}44`,
                    color: `${TEAL}99`,
                    fontFamily: 'var(--font-label)',
                    fontSize: '8px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    padding: '10px 28px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = TEAL;
                    e.currentTarget.style.color = TEAL;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${TEAL}44`;
                    e.currentTarget.style.color = `${TEAL}99`;
                  }}
                >
                  UPDATE PROFILE
                </button>
              </div>

              {/* Return to lobby */}
              <div style={{textAlign: 'center', marginTop: '32px'}}>
                <Link
                  href="/lobby"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: 'rgba(244,232,208,0.2)',
                    textDecoration: 'none',
                    letterSpacing: '0.05em',
                  }}
                >
                  ← return to lobby
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
