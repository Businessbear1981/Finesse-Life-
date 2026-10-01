'use client';

import {motion} from 'framer-motion';
import {PlateAction, RoomPlate} from '@/components/hotel/room-plate';

const STAGES = ['Proposal', 'Hold', 'Confirmed'] as const;

export default function BallroomPage() {
  return (
    <RoomPlate
      roomId="ballroom"
      lede={{
        finesse: 'One evening, composed: the table, the look, the gift and the route — under one chandelier.',
        carpe_diem: 'One night, composed: the table, the car, the suit and the timing — under one chandelier.',
      }}
      emptyCopy="No evenings composed yet. Ask Nova for a date, a dinner or an occasion."
      actionConsequence="ask partners for holds, then wait for your approval before anything is confirmed."
      scene={({accent, reduce}) => (
        <svg viewBox="0 0 1600 900" className="absolute inset-0 h-full w-full" role="img" aria-label="Double-height ballroom with laid tables under a chandelier grid">
          <defs>
            <radialGradient id="pool" cx="50%" cy="0%" r="80%"><stop offset="0" stopColor={accent} stopOpacity="0.35" /><stop offset="1" stopColor="#080406" stopOpacity="0" /></radialGradient>
            <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#17090D" /><stop offset="1" stopColor="#080406" /></linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#floor)" />
          {/* Arched windows */}
          {[160, 480, 800, 1120, 1440].map((x) => (
            <path key={x} d={`M${x - 90} 600 V220 A90 90 0 0 1 ${x + 90} 220 V600`} fill="none" stroke="#C9A961" strokeOpacity="0.25" strokeWidth="2" />
          ))}
          <rect width="1600" height="900" fill="url(#pool)" />
          {/* Chandelier grid */}
          {[400, 800, 1200].map((x, i) => (
            <motion.g key={x} initial={false} animate={reduce ? {} : {opacity: [0.6, 1, 0.6]}} transition={{duration: 5, repeat: Infinity, delay: i * 1.3}}>
              <line x1={x} y1="0" x2={x} y2="90" stroke="#C9A961" strokeOpacity="0.6" />
              {[-60, -30, 0, 30, 60].map((dx) => <line key={dx} x1={x} y1="90" x2={x + dx} y2="150" stroke="#E8C87A" strokeOpacity="0.5" />)}
              {[-60, -30, 0, 30, 60].map((dx) => <circle key={dx} cx={x + dx} cy="156" r="5" fill="#F4E8D0" />)}
            </motion.g>
          ))}
          {/* Tables */}
          {[[320, 640], [800, 690], [1280, 640], [560, 780], [1040, 780]].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <ellipse cx={x} cy={y} rx="110" ry="28" fill="#F4E8D0" fillOpacity="0.08" stroke="#C9A961" strokeOpacity="0.5" />
              <line x1={x - 10} y1={y - 26} x2={x - 10} y2={y - 60} stroke="#E8C87A" strokeOpacity="0.7" />
              <circle cx={x - 10} cy={y - 64} r="4" fill={accent} />
            </g>
          ))}
          <text x="800" y="860" textAnchor="middle" fill="#C9A961" fillOpacity="0.6" fontSize="18" letterSpacing="12">THE BALLROOM</text>
        </svg>
      )}
      preview={({accent, act, acted}) => (
        <div className="space-y-4">
          <ol className="flex gap-2" aria-label="Evening stages">
            {STAGES.map((s, i) => (
              <li key={s} className="flex-1 border px-3 py-2 text-center font-label text-[9px] uppercase tracking-[0.3em]"
                style={{borderColor: (acted ? i <= 1 : i === 0) ? accent : 'rgba(201,169,97,0.2)', color: (acted ? i <= 1 : i === 0) ? '#F4E8D0' : 'rgba(244,232,208,0.45)'}}>
                {s}
              </li>
            ))}
          </ol>
          <dl className="grid gap-2 font-body text-sm sm:grid-cols-4">
            {[['Table', 'Sample bistro, 8:30 pm'], ['Look', 'From your Closet'], ['Gift', 'Registry wish #1'], ['Route', 'Car at 8:05 pm']].map(([k, v]) => (
              <div key={k} className="border border-brass/10 p-3"><dt className="font-label text-[9px] uppercase tracking-[0.3em] text-brass/70">{k}</dt><dd className="mt-1 text-cream/80">{v}</dd></div>
            ))}
          </dl>
          <PlateAction label="Compose an evening" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
