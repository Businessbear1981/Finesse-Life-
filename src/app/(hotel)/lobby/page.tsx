'use client';

import {useEffect, useState, useRef, useCallback} from 'react';
import {motion, AnimatePresence, useAnimation} from 'framer-motion';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';
import {Crown, Edit3, Bell} from 'lucide-react';
import {NovaIntelligencePanel} from '@/components/nova-intelligence-panel';

/* ─── Types ─── */
interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  vibe: string | null;
  bio: string | null;
  city: string | null;
  interests: string[] | null;
  check_in: string | null;
}
interface FloorMember {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  vibe: string | null;
  city: string | null;
  interests: string[] | null;
  check_in: string | null;
  compat?: number;
}

/* ─── Constants ─── */
const VIBE_COLORS: Record<string, string> = {
  magical: '#C9A961', warm: '#FFA96B', electric: '#FF4D7D',
  peaceful: '#7DC9A9', wild: '#E8C87A', chill: '#69C9D0',
};

// Display label → DB value mapping
const CHECKIN_MAP: Record<string, string> = {
  'Tonight Out': 'out_tonight',
  'Date Night':  'date_night',
  'Work Mode':   'working',
  'Traveling':   'traveling',
  'Low Key':     'low_key',
  'Shopping':    'shopping',
};
const CHECKIN_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CHECKIN_MAP).map(([k, v]) => [v, k])
);
const CHECKIN_TAGS = Object.keys(CHECKIN_MAP);
const PENTHOUSE_PIN = '7777';

/* ─── Compat scoring (deterministic, matches Lounge) ─── */
function compatScore(
  member: FloorMember,
  myVibe: string | null,
  myCity?: string | null,
  myInterests?: string[] | null,
): number {
  const idHash = member.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let score = 42 + (idHash % 20);
  if (member.vibe && member.vibe === myVibe) score += 22;
  if (member.vibe) score += 5;
  if (myCity && member.city && member.city === myCity) score += 10;
  if (myInterests?.length && member.interests?.length) {
    const overlap = myInterests.filter(i => member.interests?.includes(i)).length;
    score += Math.min(overlap * 4, 12);
  }
  if (member.check_in) score += 3;
  return Math.min(score, 99);
}

/* ─── Scene backgrounds ─── */
function Scene({masc}: {masc: boolean}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `url(/scenes/${masc ? 'lobby-carpe' : 'lobby-finesse'}.jpg)`,
          backgroundSize: 'cover', backgroundPosition: 'center top',
        }}
      />
      <div className="absolute inset-0" style={{background: 'rgba(10,4,6,0.88)'}} />
      <div className="absolute inset-0"
        style={{background: `radial-gradient(ellipse 120% 60% at 50% 0%, ${masc ? 'rgba(255,169,107,0.06)' : 'rgba(255,184,200,0.07)'} 0%, transparent 60%)`}}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[350px]"
        style={{
          background: `radial-gradient(ellipse at top, ${masc ? 'rgba(255,169,107,0.09)' : 'rgba(255,184,200,0.10)'} 0%, transparent 65%)`,
          animation: 'chandelier-pulse 4s ease-in-out infinite',
        }}
      />
    </div>
  );
}

/* ─── Penthouse Elevator Lock ─── */
function PenthouseElevator() {
  const [digits, setDigits]       = useState<string[]>([]);
  const [assembled, setAssembled] = useState(0);
  const [error, setError]         = useState(false);
  const [opening, setOpening]     = useState(false);
  const [open, setOpen]           = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shakeCtrl = useAnimation();

  const reset = useCallback(() => {
    setDigits([]); setAssembled(0); setError(false); setOpening(false); setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (opening || error) return;
    const prevLen = digits.length;
    const newLen  = val.length;
    if (newLen <= prevLen) { setDigits(val.split('')); setAssembled(newLen); return; }
    if (newLen > 4) return;
    const newDigit = val[newLen - 1];
    const expected = PENTHOUSE_PIN[newLen - 1];
    if (newDigit !== expected) {
      setError(true);
      shakeCtrl.start({x: [0, -10, 10, -7, 7, 0], transition: {duration: 0.45}});
      setTimeout(reset, 1200);
      return;
    }
    setDigits(val.split(''));
    setAssembled(newLen);
    if (newLen === 4) {
      setTimeout(() => { setOpening(true); setTimeout(() => setOpen(true), 1400); }, 300);
    }
  }, [digits, opening, error, shakeCtrl, reset]);

  if (open) {
    return (
      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="text-center py-4">
        <Link href="/vip"
          className="inline-block px-8 py-3 border font-label text-[10px] tracking-[0.3em] uppercase transition-all"
          style={{
            borderColor: 'rgba(255,169,107,0.5)',
            background: 'rgba(255,169,107,0.08)',
            color: '#FFA96B',
            boxShadow: '0 0 20px rgba(255,169,107,0.15)',
          }}
        >
          Penthouse — Enter
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div animate={shakeCtrl} className="relative"
      onClick={() => inputRef.current?.focus()}
    >
      <input ref={inputRef} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={4}
        value={digits.join('')} onChange={handleInput}
        className="absolute opacity-0 w-0 h-0" autoComplete="off"
      />

      <div className="relative mx-auto w-full max-w-[280px] h-[90px] border overflow-hidden"
        style={{
          borderColor: 'rgba(201,169,97,0.2)',
          background: 'linear-gradient(to bottom, #1a0e10, #0A0406)',
        }}
      >
        <AnimatePresence>
          {!opening && (
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-brass/20 -translate-x-1/2 z-10" />
          )}
        </AnimatePresence>
        {opening && (
          <>
            <motion.div className="absolute inset-0 overflow-hidden" style={{clipPath: 'inset(0 50% 0 0)'}}>
              <motion.div className="w-full h-full" animate={{x: '-100%'}} transition={{duration: 1.2, ease: [0.4, 0, 0.2, 1]}}>
                <div className="w-full h-full"
                  style={{background: 'linear-gradient(to right, #1a0e10, #2a1520)', borderRight: '1px solid rgba(201,169,97,0.3)'}} />
              </motion.div>
            </motion.div>
            <motion.div className="absolute inset-0 overflow-hidden" style={{clipPath: 'inset(0 0 0 50%)'}}>
              <motion.div className="w-full h-full" animate={{x: '100%'}} transition={{duration: 1.2, ease: [0.4, 0, 0.2, 1]}}>
                <div className="w-full h-full"
                  style={{background: 'linear-gradient(to left, #1a0e10, #2a1520)', borderLeft: '1px solid rgba(201,169,97,0.3)'}} />
              </motion.div>
            </motion.div>
          </>
        )}

        {[15, 45, 75].map(y => (
          <div key={y} className="absolute left-0 right-0 h-px"
            style={{top: `${y}%`, background: `linear-gradient(to right, transparent, rgba(201,169,97,${0.08 + assembled * 0.06}), transparent)`}}
          />
        ))}

        {[{t: '10%', l: '4%'}, {t: '10%', r: '4%'}, {b: '10%', l: '4%'}, {b: '10%', r: '4%'}].map((pos, i) => (
          <motion.div key={i} className="absolute w-[6px] h-[6px] rounded-sm"
            style={{
              top: (pos as any).t, bottom: (pos as any).b,
              left: (pos as any).l, right: (pos as any).r,
              background: 'linear-gradient(135deg, #E8C87A, #C9A961, #6B5028)',
            }}
            animate={{scale: assembled > i ? 0.4 : 1, opacity: assembled > i ? 0 : 0.7}}
            transition={{duration: 0.4}}
          />
        ))}

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {['P', '3', '2', '1', 'L'].map((fl, i) => (
            <div key={fl} className="font-label text-[6px] tracking-wider text-center w-4"
              style={{
                color: (i === 0 && assembled === 4) ? '#FFA96B'
                  : assembled >= 4 - i ? 'rgba(201,169,97,0.6)' : 'rgba(201,169,97,0.1)',
                textShadow: (i === 0 && assembled === 4) ? '0 0 6px rgba(255,169,107,0.6)' : 'none',
              }}
            >{fl}</div>
          ))}
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
            animate={{rotate: assembled * 22.5}}
            transition={{duration: 0.45, ease: 'easeOut'}}
            style={{
              borderColor: `rgba(201,169,97,${0.15 + assembled * 0.15})`,
              background: 'rgba(10,4,6,0.8)',
              boxShadow: assembled >= 4 ? '0 0 20px rgba(255,169,107,0.3)' : 'none',
            }}
          >
            <Crown size={16} strokeWidth={1.5}
              style={{color: assembled >= 4 ? '#FFA96B' : 'rgba(201,169,97,0.3)'}}
            />
          </motion.div>
        </div>

        <motion.div className="absolute inset-0 pointer-events-none"
          style={{background: 'radial-gradient(ellipse at center, rgba(255,169,107,0.4) 0%, transparent 65%)'}}
          animate={{opacity: opening ? 1 : 0}} transition={{duration: 0.9}}
        />
      </div>

      <div className="flex gap-2 justify-center mt-3">
        {Array.from({length: 4}).map((_, i) => (
          <motion.div key={i}
            className="w-8 h-8 border flex items-center justify-center"
            style={{
              borderColor: error ? '#FF4D7D' : digits[i] ? 'rgba(201,169,97,0.5)' : 'rgba(201,169,97,0.1)',
              background: digits[i] ? 'rgba(201,169,97,0.06)' : 'transparent',
            }}
            animate={error ? {x: [0, -4, 4, -2, 2, 0]} : {}}
            transition={{duration: 0.3}}
          >
            {digits[i]
              ? <span className="font-display text-sm" style={{color: '#E8C87A'}}>{digits[i]}</span>
              : <span className="w-1 h-1 rotate-45 border border-brass/15" />
            }
          </motion.div>
        ))}
      </div>
      {error && (
        <p className="text-center mt-2 font-body text-xs italic" style={{color: 'rgba(244,224,160,0.5)'}}>
          Access denied
        </p>
      )}
    </motion.div>
  );
}

/* ─── Floor member tile ─── */
function FloorTile({member, accentColor}: {member: FloorMember; accentColor: string}) {
  const vibeColor  = VIBE_COLORS[member.vibe ?? ''] ?? '#C9A961';
  const initials   = (member.display_name ?? member.username ?? '?').slice(0, 2).toUpperCase();
  const checkInLabel = member.check_in ? CHECKIN_REVERSE[member.check_in] : null;
  return (
    <Link href="/lounge"
      className="flex items-center gap-2 p-2 border transition-all duration-300 group"
      style={{borderColor: 'rgba(201,169,97,0.05)', background: 'rgba(10,4,6,0.4)'}}
    >
      <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{borderColor: `${vibeColor}40`}}
      >
        {member.avatar_url
          ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="font-display text-[10px]" style={{color: vibeColor}}>{initials}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-xs truncate" style={{color: 'rgba(244,232,208,0.65)'}}>
          {member.display_name ?? member.username}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {member.vibe && (
            <p className="font-label text-[7px] tracking-[0.2em] uppercase" style={{color: `${vibeColor}80`}}>
              {member.vibe}
            </p>
          )}
          {checkInLabel && (
            <p className="font-label text-[7px] tracking-[0.15em] uppercase" style={{color: `${accentColor}50`}}>
              · {checkInLabel}
            </p>
          )}
        </div>
      </div>
      {/* Compat score */}
      {member.compat !== undefined && (
        <div className="flex flex-col items-center flex-shrink-0">
          <span className="font-display text-sm leading-none" style={{color: vibeColor}}>
            {member.compat}
          </span>
          <span className="font-label text-[6px] tracking-wider" style={{color: `${vibeColor}50`}}>
            MATCH
          </span>
        </div>
      )}
    </Link>
  );
}

/* ─── Main ─── */
export default function LobbyPage() {
  const [masc, setMasc]                   = useState(false);
  const [profile, setProfile]             = useState<Profile | null>(null);
  const [userId, setUserId]               = useState<string | null>(null);
  const [floor, setFloor]                 = useState<FloorMember[]>([]);
  const [checkin, setCheckin]             = useState<string | null>(null); // display label
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [novaMsg, setNovaMsg]             = useState('');
  const [novaInput, setNovaInput]         = useState('');
  const [novaSending, setNovaSending]     = useState(false);
  const [hour]                            = useState(() => new Date().getHours());

  useEffect(() => {
    const gender = localStorage.getItem('finesse_gender');
    const isMasc = gender === 'masculine';
    setMasc(isMasc);
    setNovaMsg(isMasc
      ? 'The card room opens at nine. Shall I hold a seat?'
      : 'Your usual table is available. What can I arrange?'
    );

    const supabase = createClient();
    supabase.auth.getUser().then(async ({data}) => {
      if (!data.user) return;
      const uid = data.user.id;
      setUserId(uid);

      // Load own full profile (city + interests needed for compat scoring)
      const {data: prof} = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, vibe, bio, city, interests, check_in')
        .eq('id', uid)
        .single();

      if (prof) {
        setProfile(prof as Profile);
        // Restore persisted check-in to display label
        if (prof.check_in) {
          setCheckin(CHECKIN_REVERSE[prof.check_in] ?? null);
        }
      }

      // Load floor: fetch more than 3 so we can surface the best matches
      const {data: members} = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, vibe, city, interests, check_in')
        .neq('id', uid)
        .limit(8);

      if (members) {
        const scored = (members as FloorMember[]).map(m => ({
          ...m,
          compat: compatScore(m, prof?.vibe ?? null, prof?.city, prof?.interests),
        }));
        scored.sort((a, b) => (b.compat ?? 0) - (a.compat ?? 0));
        setFloor(scored.slice(0, 3));
      }
    });
  }, []);

  // Persist check-in tag to Supabase profiles.check_in
  const handleCheckin = useCallback(async (tag: string) => {
    if (!userId || checkinSaving) return;
    const next = checkin === tag ? null : tag;
    setCheckin(next);
    const dbVal = next ? CHECKIN_MAP[next] : null;
    setCheckinSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('profiles').update({check_in: dbVal}).eq('id', userId);
    } catch {
      // silent — local state already reflects the intent
    }
    setCheckinSaving(false);
  }, [checkin, userId, checkinSaving]);

  const sendNova = useCallback(async () => {
    if (!novaInput.trim() || novaSending) return;
    const text = novaInput.trim();
    setNovaInput('');
    setNovaSending(true);
    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: text,
          system: masc
            ? 'You are Nova, concierge at Carpe Diem. Understated authority. One or two sentences.'
            : 'You are Nova, concierge at Finesse. Warm and elegant. One or two sentences.',
        }),
      });
      const data = await res.json() as {text?: string};
      setNovaMsg(data.text ?? 'Leave it with me.');
    } catch {
      setNovaMsg(masc ? 'Consider it handled.' : 'Leave it with me.');
    }
    setNovaSending(false);
  }, [novaInput, novaSending, masc]);

  const accentColor = masc ? '#FFA96B' : '#FFB8C8';
  const vibeColor   = VIBE_COLORS[profile?.vibe ?? ''] ?? '#C9A961';
  const initials    = (profile?.display_name ?? profile?.username ?? '?').slice(0, 2).toUpperCase();
  const greet       = hour < 12 ? (masc ? 'Good morning, sir.' : 'Good morning.')
                    : hour < 17 ? 'Good afternoon.'
                    : hour < 21 ? (masc ? 'Good evening, sir.' : 'Good evening.')
                    : (masc ? 'Late night, sir.' : 'The night is yours.');

  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 0.8}}
      className="min-h-screen relative"
    >
      <Scene masc={masc} />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── Profile Card ── */}
        <motion.div initial={{opacity: 0, y: -12}} animate={{opacity: 1, y: 0}} transition={{delay: 0.15}}>
          <div className="border relative overflow-hidden"
            style={{borderColor: 'rgba(201,169,97,0.15)', background: 'rgba(10,4,6,0.7)', backdropFilter: 'blur(8px)'}}
          >
            <div className="h-px w-full"
              style={{background: `linear-gradient(to right, transparent, ${accentColor}30, transparent)`}} />

            <div className="p-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{borderColor: `${vibeColor}60`, boxShadow: `0 0 20px ${vibeColor}20`}}
              >
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="font-display text-xl" style={{color: vibeColor}}>{initials}</span>
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-label text-[8px] tracking-[0.4em] uppercase mb-0.5"
                  style={{color: `${accentColor}60`}}>
                  {greet}
                </p>
                <p className="font-display text-2xl italic truncate" style={{color: '#E8C87A'}}>
                  {profile?.display_name ?? profile?.username ?? 'Member'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {profile?.vibe && (
                    <span className="inline-block px-2 py-0.5 font-label text-[7px] tracking-[0.2em] uppercase"
                      style={{background: `${vibeColor}15`, color: `${vibeColor}cc`, border: `1px solid ${vibeColor}30`}}
                    >
                      {profile.vibe}
                    </span>
                  )}
                  {profile?.city && (
                    <span className="font-label text-[7px] tracking-[0.15em] uppercase"
                      style={{color: `${accentColor}40`}}>
                      {profile.city}
                    </span>
                  )}
                </div>
              </div>

              <Link href="/profile"
                className="flex-shrink-0 w-9 h-9 border flex items-center justify-center transition-all duration-300"
                style={{borderColor: 'rgba(201,169,97,0.15)', background: 'rgba(10,4,6,0.5)'}}
              >
                <Edit3 size={14} strokeWidth={1.5} style={{color: 'rgba(201,169,97,0.4)'}} />
              </Link>
            </div>

            {profile?.bio && (
              <p className="px-5 pb-4 font-body text-xs italic"
                style={{color: 'rgba(244,232,208,0.25)'}}>
                {profile.bio}
              </p>
            )}

            <div className="h-px w-full"
              style={{background: `linear-gradient(to right, transparent, ${accentColor}15, transparent)`}} />
          </div>
        </motion.div>

        {/* ── Check-In ── */}
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.25}}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-label text-[8px] tracking-[0.45em] uppercase"
              style={{color: 'rgba(201,169,97,0.3)'}}>
              Tonight&apos;s Move
            </p>
            {checkinSaving && (
              <span className="font-label text-[7px] tracking-widest uppercase"
                style={{color: `${accentColor}40`}}>
                saving…
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {CHECKIN_TAGS.map(tag => (
              <button key={tag} onClick={() => handleCheckin(tag)}
                className="px-3 py-1.5 border font-label text-[8px] tracking-[0.2em] uppercase transition-all duration-300"
                style={{
                  borderColor: checkin === tag ? `${accentColor}60` : 'rgba(201,169,97,0.1)',
                  background:  checkin === tag ? `${accentColor}10` : 'transparent',
                  color:       checkin === tag ? accentColor : 'rgba(244,232,208,0.25)',
                  boxShadow:   checkin === tag ? `0 0 10px ${accentColor}15` : 'none',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── The Floor ── */}
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.35}}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-label text-[8px] tracking-[0.45em] uppercase"
              style={{color: 'rgba(201,169,97,0.3)'}}>
              The Floor
            </p>
            <Link href="/lounge"
              className="font-label text-[7px] tracking-[0.25em] uppercase transition-colors"
              style={{color: 'rgba(201,169,97,0.2)'}}
            >
              View all →
            </Link>
          </div>
          <div className="space-y-1">
            {floor.length > 0
              ? floor.map(m => <FloorTile key={m.id} member={m} accentColor={accentColor} />)
              : <p className="font-body text-xs italic py-3 text-center"
                  style={{color: 'rgba(244,232,208,0.15)'}}>
                  The lounge is quiet tonight.
                </p>
            }
          </div>
        </motion.div>

        {/* ── Penthouse Elevator ── */}
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.45}}>
          <p className="font-label text-[8px] tracking-[0.45em] uppercase mb-3"
            style={{color: 'rgba(255,169,107,0.3)'}}>
            The Penthouse
          </p>
          <PenthouseElevator />
        </motion.div>

        {/* ── Nova Intelligence Panel ── */}
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.50}}>
          <NovaIntelligencePanel />
        </motion.div>

        {/* ── Nova at the Desk ── */}
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.60}}>
          <div className="border p-4"
            style={{borderColor: 'rgba(201,169,97,0.08)', background: 'rgba(10,4,6,0.55)'}}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"
                style={{boxShadow: '0 0 6px rgba(74,222,128,0.6)'}} />
              <span className="font-label text-[8px] tracking-[0.35em] uppercase"
                style={{color: 'rgba(201,169,97,0.4)'}}>
                Nova · at the desk
              </span>
            </div>
            <p className="font-body text-sm italic mb-3"
              style={{color: 'rgba(244,232,208,0.55)'}}>
              &ldquo;{novaMsg}&rdquo;
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={novaInput}
                onChange={e => setNovaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendNova()}
                placeholder="Ask Nova anything..."
                className="flex-1 px-3 py-2 bg-transparent font-body text-xs outline-none"
                style={{border: '1px solid rgba(201,169,97,0.12)', color: 'rgba(244,232,208,0.7)'}}
              />
              <button onClick={sendNova} disabled={novaSending}
                className="px-3 py-2 border transition-all duration-300"
                style={{
                  borderColor: 'rgba(201,169,97,0.2)',
                  background: novaSending ? 'transparent' : 'rgba(201,169,97,0.06)',
                  color: 'rgba(201,169,97,0.5)',
                }}
              >
                <Bell size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </motion.div>

      </div>

      <style jsx>{`
        @keyframes chandelier-pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
