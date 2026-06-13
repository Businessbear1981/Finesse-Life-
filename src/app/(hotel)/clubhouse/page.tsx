'use client';

import {useState, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';

type Gender = 'masculine' | 'feminine';

/* ─── Partner deep-links ─── */
const PARTNERS_MASC = [
  {
    id: 'draftkings',
    name: 'DraftKings',
    tag: 'Sportsbook',
    desc: 'Props, parlays, live betting',
    color: '#00D448',
    url: 'https://www.draftkings.com',
    logo: '🏆',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Fantasy',
    tag: 'Fantasy Sports',
    desc: 'Your leagues, draft board, waiver wire',
    color: '#7B0099',
    url: 'https://football.fantasysports.yahoo.com',
    logo: '🏈',
  },
  {
    id: 'bovada',
    name: 'Bovada',
    tag: 'Betting',
    desc: 'Lines, futures, casino action',
    color: '#B8191A',
    url: 'https://www.bovada.lv',
    logo: '🎰',
  },
  {
    id: 'celebrity-crush',
    name: 'Celebrity Crush',
    tag: 'Coming Soon',
    desc: 'Pop culture prediction markets — bet on the culture',
    color: '#FFA96B',
    url: '#',
    logo: '⭐',
    comingSoon: true,
  },
];

/* Top downloaded mobile games by category for women */
const PARTNERS_FEM = [
  {
    id: 'words',
    name: 'Words With Friends',
    tag: 'Word Game',
    desc: 'Challenge friends, play live',
    color: '#4CAF50',
    url: 'https://apps.apple.com/app/words-with-friends-2/id1196764367',
    logo: '📝',
  },
  {
    id: 'candy',
    name: 'Candy Crush',
    tag: '#1 Casual',
    desc: '12B+ downloads. You know it.',
    color: '#FF69B4',
    url: 'https://apps.apple.com/app/candy-crush-saga/id553834731',
    logo: '🍬',
  },
  {
    id: 'wordle',
    name: 'NYT Games',
    tag: 'Puzzle',
    desc: 'Wordle, Connections, Mini Crossword',
    color: '#6FAE3C',
    url: 'https://apps.apple.com/app/nyt-games-word-games-sudoku/id307569751',
    logo: '🟩',
  },
  {
    id: 'roblox',
    name: 'Roblox',
    tag: 'Social Gaming',
    desc: 'Hang, create, play — top 5 women 18-35',
    color: '#E60026',
    url: 'https://apps.apple.com/app/roblox/id431946152',
    logo: '🎮',
  },
  {
    id: 'celebrity-crush',
    name: 'Celebrity Crush',
    tag: 'Coming Soon',
    desc: 'Pop culture prediction markets — bet on the culture',
    color: '#FFA96B',
    url: '#',
    logo: '⭐',
    comingSoon: true,
  },
];

interface SportEvent {
  id: string;
  league: string;
  matchup: string;
  time: string;
  status: 'live' | 'upcoming' | 'final';
  score?: string;
}

interface FantasyPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  points: number;
  projection: number;
}

const DEMO_EVENTS: SportEvent[] = [
  {id: '1', league: 'NBA', matchup: 'Lakers vs Celtics',  time: '9:30 PM',       status: 'live',     score: '98 - 102'},
  {id: '2', league: 'NFL', matchup: 'Cowboys vs Eagles',  time: '8:15 PM',       status: 'live',     score: '17 - 21'},
  {id: '3', league: 'MLB', matchup: 'Yankees vs Dodgers', time: 'Tomorrow 7PM',  status: 'upcoming'},
  {id: '4', league: 'UFC', matchup: 'Main Card',          time: 'Saturday 10PM', status: 'upcoming'},
  {id: '5', league: 'NBA', matchup: 'Warriors vs Heat',   time: 'Yesterday',     status: 'final',    score: '112 - 108'},
];

const DEMO_FANTASY: FantasyPlayer[] = [
  {id: 'f1', name: "Jalen Hurts",        position: 'QB', team: 'PHI', points: 24.8, projection: 22.5},
  {id: 'f2', name: 'Saquon Barkley',     position: 'RB', team: 'PHI', points: 18.2, projection: 16.0},
  {id: 'f3', name: "Ja'Marr Chase",      position: 'WR', team: 'CIN', points: 22.4, projection: 18.8},
  {id: 'f4', name: 'Travis Kelce',       position: 'TE', team: 'KC',  points: 14.6, projection: 12.0},
  {id: 'f5', name: 'Amon-Ra St. Brown',  position: 'WR', team: 'DET', points: 16.8, projection: 15.2},
];

const STATUS_COLORS = {
  live:     {label: 'LIVE',     color: '#FF4D7D', pulse: true},
  upcoming: {label: 'UPCOMING', color: '#C9A961', pulse: false},
  final:    {label: 'FINAL',    color: 'rgba(244,232,208,0.2)', pulse: false},
};

function PartnerTile({p}: {p: typeof PARTNERS_MASC[number]}) {
  return (
    <motion.a
      href={p.comingSoon ? undefined : p.url}
      target={p.comingSoon ? undefined : '_blank'}
      rel="noopener noreferrer"
      initial={{opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      className="flex items-center gap-4 p-4 border transition-all duration-300 group"
      style={{
        borderColor: p.comingSoon ? 'rgba(244,232,208,0.05)' : `${p.color}25`,
        background: p.comingSoon ? 'rgba(10,4,6,0.3)' : 'rgba(10,4,6,0.5)',
        cursor: p.comingSoon ? 'default' : 'pointer',
        opacity: p.comingSoon ? 0.6 : 1,
      }}
    >
      <div className="text-3xl w-10 text-center">{p.logo}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-display text-base tracking-wide" style={{color: 'rgba(244,232,208,0.85)'}}>{p.name}</span>
          <span className="font-label text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 border"
            style={{color: p.color, borderColor: `${p.color}30`}}
          >{p.tag}</span>
        </div>
        <p className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.3)'}}>{p.desc}</p>
      </div>
      {!p.comingSoon && (
        <div className="font-label text-[8px] tracking-[0.2em] uppercase transition-colors"
          style={{color: `${p.color}80`}}
        >open →</div>
      )}
    </motion.a>
  );
}

export default function GameRoomPage() {
  const [gender, setGender] = useState<Gender | null>(null);
  const [tab, setTab] = useState<'platforms' | 'scores' | 'fantasy'>('platforms');

  useEffect(() => {
    const stored = localStorage.getItem('finesse_gender');
    setGender(stored === 'masculine' ? 'masculine' : 'feminine');
  }, []);

  const isMasc    = gender === 'masculine';
  const accent    = isMasc ? '#00FF88' : '#FF4D7D';
  const partners  = isMasc ? PARTNERS_MASC : PARTNERS_FEM;
  const mascTabs  = ['platforms', 'scores', 'fantasy'] as const;
  const femTabs   = ['platforms'] as const;
  const tabs      = isMasc ? mascTabs : femTabs;

  if (gender === null) return null;

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="min-h-screen relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{background: `radial-gradient(ellipse at center, ${accent}08 0%, transparent 65%)`}}
        />
      </div>

      <header className="text-center pt-12 pb-4 relative z-10">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <span className="text-4xl mb-4 inline-block">🎮</span>
          <h1 className="font-display text-4xl tracking-[0.2em]" style={{color: accent}}>
            game room
          </h1>
          <p className="font-label text-[10px] tracking-[0.5em] uppercase mt-2" style={{color: 'rgba(244,232,208,0.2)'}}>
            {isMasc ? 'fantasy · sportsbook · betting · culture' : 'mobile games · social · celebrity crush'}
          </p>
        </motion.div>
      </header>

      {/* Tabs — men only get extra tabs */}
      <div className="max-w-4xl mx-auto px-4 mb-8 relative z-10">
        <div className="flex justify-center gap-2">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t as typeof tab)}
              className="px-4 py-2 text-[10px] font-label tracking-[0.2em] uppercase transition-all duration-300"
              style={{
                background: tab === t ? accent : 'transparent',
                color: tab === t ? '#0A0406' : 'rgba(244,232,208,0.25)',
                border: tab === t ? 'none' : '1px solid rgba(244,232,208,0.08)',
              }}
            >{t === 'platforms' ? (isMasc ? 'sportsbooks' : 'games') : t}</button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10 pb-12">
        <AnimatePresence mode="wait">

          {/* ═══ PARTNER PLATFORMS ═══ */}
          {tab === 'platforms' && (
            <motion.div key="platforms" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1" style={{background: `${accent}25`}} />
                <span className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `${accent}60`}}>
                  {isMasc ? 'partner platforms' : 'top games'}
                </span>
                <div className="h-px flex-1" style={{background: `${accent}25`}} />
              </div>
              <div className="space-y-3">
                {partners.map((p, i) => (
                  <motion.div key={p.id} transition={{delay: i * 0.06}}>
                    <PartnerTile p={p} />
                  </motion.div>
                ))}
              </div>
              <p className="text-center font-body text-[10px] italic mt-8" style={{color: 'rgba(244,232,208,0.15)'}}>
                {isMasc
                  ? 'DraftKings & Bovada open in their native apps. Yahoo Fantasy syncs your leagues.'
                  : 'Tapping opens the App Store. Celebrity Crush drops soon.'}
              </p>
            </motion.div>
          )}

          {/* ═══ SCORES (men only) ═══ */}
          {tab === 'scores' && isMasc && (
            <motion.div key="scores" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-brass/20" />
                <span className="font-label text-[9px] tracking-[0.4em] text-brass/40 uppercase">live scores</span>
                <div className="h-px flex-1 bg-brass/20" />
              </div>
              {/* DraftKings CTA banner */}
              <a href="https://www.draftkings.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 mb-4 border transition-all"
                style={{borderColor: 'rgba(0,212,72,0.25)', background: 'rgba(0,212,72,0.06)'}}
              >
                <span className="font-label text-[9px] tracking-[0.2em] uppercase" style={{color: 'rgba(0,212,72,0.7)'}}>
                  🏆 bet live on DraftKings
                </span>
                <span className="font-label text-[8px] tracking-[0.15em] uppercase" style={{color: 'rgba(0,212,72,0.4)'}}>open →</span>
              </a>
              <div className="space-y-3">
                {DEMO_EVENTS.map((ev, i) => {
                  const sc = STATUS_COLORS[ev.status];
                  return (
                    <motion.div key={ev.id} initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{delay: i * 0.05}}
                      className="p-4 border border-cream/6 bg-ink/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-label text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 border"
                          style={{color: sc.color, borderColor: `${sc.color}30`}}
                        >{ev.league}</span>
                        <div>
                          <p className="font-display text-base tracking-wide" style={{color: 'rgba(244,232,208,0.8)'}}>{ev.matchup}</p>
                          <p className="font-mono text-[10px] mt-0.5" style={{color: 'rgba(244,232,208,0.25)'}}>{ev.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {ev.score && <span className="font-mono text-lg text-brass">{ev.score}</span>}
                        <span className={`w-2 h-2 rounded-full ${sc.pulse ? 'animate-pulse' : ''}`}
                          style={{background: sc.color, boxShadow: sc.pulse ? `0 0 6px ${sc.color}60` : 'none'}}
                        />
                        <span className="font-label text-[7px] tracking-[0.15em] uppercase" style={{color: sc.color}}>{sc.label}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ FANTASY (men only) ═══ */}
          {tab === 'fantasy' && isMasc && (
            <motion.div key="fantasy" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-brass/20" />
                <span className="font-label text-[9px] tracking-[0.4em] text-brass/40 uppercase">my roster</span>
                <div className="h-px flex-1 bg-brass/20" />
              </div>
              {/* Yahoo Fantasy CTA */}
              <a href="https://football.fantasysports.yahoo.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 mb-4 border transition-all"
                style={{borderColor: 'rgba(123,0,153,0.3)', background: 'rgba(123,0,153,0.07)'}}
              >
                <span className="font-label text-[9px] tracking-[0.2em] uppercase" style={{color: 'rgba(200,100,255,0.7)'}}>
                  🏈 sync Yahoo Fantasy leagues
                </span>
                <span className="font-label text-[8px] tracking-[0.15em] uppercase" style={{color: 'rgba(200,100,255,0.4)'}}>connect →</span>
              </a>
              <div className="space-y-2">
                {DEMO_FANTASY.map((player, i) => {
                  const beating = player.points > player.projection;
                  return (
                    <motion.div key={player.id} initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{delay: i * 0.05}}
                      className="p-4 border border-cream/6 bg-ink/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-[10px] text-brass/40 w-6">{player.position}</span>
                        <div>
                          <p className="font-display text-base tracking-wide" style={{color: 'rgba(244,232,208,0.8)'}}>{player.name}</p>
                          <p className="font-label text-[8px] tracking-[0.15em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>{player.team}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono text-lg" style={{color: beating ? '#00FF88' : '#FF4D7D'}}>{player.points}</p>
                          <p className="font-mono text-[9px]" style={{color: 'rgba(244,232,208,0.2)'}}>proj: {player.projection}</p>
                        </div>
                        <span className="w-2 h-2 rounded-full"
                          style={{background: beating ? '#00FF88' : '#FF4D7D40', boxShadow: beating ? '0 0 6px #00FF8860' : 'none'}}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-4 text-center">
                <p className="font-mono text-sm text-brass">
                  Total: {DEMO_FANTASY.reduce((s, p) => s + p.points, 0).toFixed(1)} pts
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm transition-colors" style={{color: 'rgba(244,232,208,0.2)'}}>
          return to the lobby
        </Link>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
