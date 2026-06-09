'use client';

import {useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';

interface MemberPresence {
  id: string;
  initials: string;
  name: string;
  mood: string;
  arrived: string;
}

interface ActivityItem {
  id: string;
  initials: string;
  text: string;
  time: string;
}

const DEMO_PRESENT: MemberPresence[] = [
  {id: '1', initials: 'KR', name: 'Kira', mood: 'electric', arrived: '11:20 PM'},
  {id: '2', initials: 'JM', name: 'Julian', mood: 'warm', arrived: '10:45 PM'},
  {id: '3', initials: 'AV', name: 'Ava', mood: 'magical', arrived: '10:30 PM'},
  {id: '4', initials: 'DS', name: 'Dante', mood: 'wild', arrived: '9:55 PM'},
];

const DEMO_ACTIVITY: ActivityItem[] = [
  {id: '1', initials: 'KR', text: 'pinned a moment at the rooftop', time: '11:38 PM'},
  {id: '2', initials: 'AV', text: 'completed a journey — long night', time: '11:15 PM'},
  {id: '3', initials: 'JM', text: 'added Le Labo to the wardrobe wishlist', time: '10:52 PM'},
  {id: '4', initials: 'DS', text: 'broadcast from the switchboard', time: '10:30 PM'},
  {id: '5', initials: 'KR', text: 'earned $45.00 booking cashback', time: '10:12 PM'},
];

const MOOD_COLORS: Record<string, string> = {
  magical: '#C9A961',
  warm: '#FFA96B',
  electric: '#FF4D7D',
  peaceful: '#7DC9A9',
  wild: '#E8C87A',
};

export default function LoungePage() {
  const [tab, setTab] = useState<'floor' | 'feed'>('floor');

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Jazz club ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/4 w-[300px] h-[300px]"
          style={{background: 'radial-gradient(circle, rgba(255,169,107,0.08) 0%, transparent 60%)'}}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[250px] h-[250px]"
          style={{background: 'radial-gradient(circle, rgba(255,77,125,0.05) 0%, transparent 60%)'}}
        />
        <div
          className="absolute bottom-1/4 left-1/3 w-[200px] h-[200px] animate-chandelier-pulse"
          style={{background: 'radial-gradient(circle, rgba(201,169,97,0.06) 0%, transparent 60%)'}}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-6 relative z-10">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <span className="text-4xl mb-4 inline-block">🎷</span>
          <h1 className="font-display text-4xl text-lamp tracking-[0.2em]">the lounge</h1>
          <p className="font-label text-[10px] tracking-[0.5em] text-cream/20 uppercase mt-2">social</p>
        </motion.div>
      </header>

      <div className="max-w-3xl mx-auto px-4 relative z-10">
        {/* Tab toggle */}
        <div className="flex justify-center gap-4 mb-10">
          {(['floor', 'feed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 font-label text-[10px] tracking-[0.3em] uppercase transition-all duration-300 ${
                tab === t ? 'text-ink bg-lamp' : 'text-cream/30 border border-cream/8 hover:border-lamp/30'
              }`}
            >
              {t === 'floor' ? "who's here" : 'activity'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'floor' ? (
            <motion.div
              key="floor"
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -10}}
              transition={{duration: 0.3}}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-lamp/15" />
                <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/40 uppercase">
                  tonight — {DEMO_PRESENT.length} here
                </h2>
                <div className="h-px flex-1 bg-lamp/15" />
              </div>

              <div className="grid grid-cols-2 gap-5">
                {DEMO_PRESENT.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{opacity: 0, y: 15}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.3 + i * 0.08}}
                    className="brass-border p-6 bg-ink/50 backdrop-blur-sm hover:bg-oxblood/15 transition-all duration-500"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center border text-sm font-label tracking-wider"
                        style={{
                          borderColor: `${MOOD_COLORS[member.mood] || '#C9A961'}60`,
                          color: MOOD_COLORS[member.mood] || '#C9A961',
                          boxShadow: `0 0 20px ${MOOD_COLORS[member.mood] || '#C9A961'}15`,
                        }}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <p className="font-display text-lg text-cream/80 tracking-wide">{member.name}</p>
                        <p
                          className="font-label text-[9px] tracking-[0.3em] uppercase"
                          style={{color: `${MOOD_COLORS[member.mood]}80`}}
                        >
                          {member.mood}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-[10px] text-cream/15 mt-3">arrived {member.arrived}</p>
                  </motion.div>
                ))}
              </div>

              <motion.p
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.8}}
                className="text-center mt-10 font-body text-xs text-cream/15 italic"
              >
                the music is low. the company is right.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="feed"
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -10}}
              transition={{duration: 0.3}}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-lamp/15" />
                <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/40 uppercase">tonight&apos;s activity</h2>
                <div className="h-px flex-1 bg-lamp/15" />
              </div>

              <div className="space-y-3">
                {DEMO_ACTIVITY.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{opacity: 0, x: -10}}
                    animate={{opacity: 1, x: 0}}
                    transition={{delay: 0.3 + i * 0.06}}
                    className="flex items-start gap-4 px-4 py-3 border border-cream/5 bg-ink/40 hover:bg-oxblood/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full border border-brass/20 flex items-center justify-center shrink-0">
                      <span className="font-label text-[8px] tracking-wider text-brass/60">{item.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-cream/50 italic">{item.text}</p>
                    </div>
                    <span className="font-mono text-[10px] text-cream/15 whitespace-nowrap shrink-0">{item.time}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center py-12 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">
          return to the lobby
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-oxblood/10 to-transparent pointer-events-none" />
    </motion.div>
  );
}
