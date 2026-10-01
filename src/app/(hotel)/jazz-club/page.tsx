'use client';

import {motion} from 'framer-motion';
import {PlateAction, RoomPlate} from '@/components/hotel/room-plate';

export default function JazzClubPage() {
  return (
    <RoomPlate
      roomId="jazz-club"
      lede={{
        finesse: 'Down the back stair: one lamp, a trio, and the members who stayed for the second set.',
        carpe_diem: 'Down the back stair: one lamp, a trio, and the table that never empties.',
      }}
      emptyCopy="No set tonight. The lamp wakes only when a live room genuinely starts."
      actionConsequence="join a live audio room with captions; tips and tickets will show their price and recipient before you pay."
      scene={({accent, reduce, state}) => {
        const live = state === 'confirmed';
        return (
          <svg viewBox="0 0 1600 900" className="absolute inset-0 h-full w-full" role="img" aria-label="Basement jazz club, green-black walls, a single brass lamp over a trio">
            <rect width="1600" height="900" fill="#050806" />
            {Array.from({length: 24}).map((_, i) => <rect key={i} x={i * 70} y="0" width="2" height="900" fill="#0f1a12" />)}
            <motion.polygon
              points="800,120 520,760 1080,760"
              fill={accent}
              initial={false}
              animate={{opacity: live ? 0.22 : 0.06}}
              transition={{duration: reduce ? 0 : 1.6}}
            />
            <line x1="800" y1="0" x2="800" y2="110" stroke="#C9A961" />
            <path d="M770 110 h60 l-10 18 h-40z" fill="#C9A961" />
            {/* Trio silhouettes */}
            <g fill="#0a0a0a" stroke="#C9A961" strokeOpacity="0.35">
              <rect x="640" y="560" width="120" height="200" rx="40" />
              <ellipse cx="800" cy="700" rx="70" ry="60" />
              <rect x="880" y="520" width="40" height="240" rx="14" />
            </g>
            <rect x="420" y="760" width="760" height="12" fill="#C9A961" fillOpacity="0.4" />
            {live && !reduce && [0, 1, 2].map((i) => (
              <motion.circle key={i} cx="800" cy="300" r="40" fill="none" stroke={accent} initial={{r: 40, opacity: 0.6}} animate={{r: 260, opacity: 0}} transition={{duration: 3, repeat: Infinity, delay: i}} />
            ))}
          </svg>
        );
      }}
      preview={({accent, act, acted}) => (
        <div className="space-y-3">
          <ul className="font-body text-sm text-cream/80">
            <li>9:30 pm — Set one (sample programme)</li>
            <li>11:00 pm — Set two · replay held 7 days</li>
          </ul>
          <p className="font-body text-xs italic text-cream/55">Tips go to the performers named on the programme; licensing and replay terms appear before payment.</p>
          <PlateAction label="Join tonight's room" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
