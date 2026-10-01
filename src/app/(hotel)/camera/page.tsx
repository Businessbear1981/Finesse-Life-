'use client';

import Link from 'next/link';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate} from '@/components/hotel/room-plate';

export default function CameraPage() {
  return (
    <RoomPlate
      roomId="camera"
      lede={{
        finesse: 'Point, and the reticle finds the piece — then asks before anything is catalogued or shared.',
        carpe_diem: 'Point, and the reticle finds the object — then asks before anything is catalogued or routed.',
      }}
      emptyCopy="Nothing scanned yet. Your photos stay private until you confirm what happens to them."
      actionConsequence="upload with consent, identify with a confidence score, and catalogue only after you review."
      scene={({accent, reduce, state}) => {
        const resolved = state === 'confirmed';
        return (
          <svg viewBox="0 0 1600 900" className="absolute inset-0 h-full w-full" role="img" aria-label="Dark viewfinder with a calibrated brass reticle">
            <rect width="1600" height="900" fill="#050304" />
            <rect x="100" y="80" width="1400" height="740" fill="none" stroke="#C9A961" strokeOpacity="0.25" />
            {[[100, 80], [1500, 80], [100, 820], [1500, 820]].map(([x, y]) => (
              <path key={`${x}${y}`} d={`M${x + (x > 800 ? -60 : 60)} ${y} H${x} V${y + (y > 450 ? -60 : 60)}`} stroke="#E8C87A" strokeWidth="3" fill="none" />
            ))}
            <motion.g
              initial={false}
              animate={{scale: resolved ? 1 : 1.25, opacity: resolved ? 1 : 0.55, rotate: resolved || reduce ? 0 : 8}}
              transition={{duration: reduce ? 0 : 1}}
              style={{transformOrigin: '800px 450px'}}
            >
              <circle cx="800" cy="450" r="170" fill="none" stroke={resolved ? accent : '#C9A961'} strokeWidth="2" />
              <circle cx="800" cy="450" r="6" fill={resolved ? accent : '#C9A961'} />
              {[0, 90, 180, 270].map((a) => (
                <line key={a} x1={800 + 190 * Math.cos((a * Math.PI) / 180)} y1={450 + 190 * Math.sin((a * Math.PI) / 180)}
                  x2={800 + 230 * Math.cos((a * Math.PI) / 180)} y2={450 + 230 * Math.sin((a * Math.PI) / 180)} stroke="#E8C87A" strokeWidth="3" />
              ))}
            </motion.g>
            <text x="140" y="790" fill="#C9A961" fillOpacity="0.7" fontSize="18" letterSpacing="6">
              {resolved ? 'SAMPLE · CONFIDENCE SHOWN ONLY FROM REAL MODEL OUTPUT' : 'AWAITING MODEL OUTPUT — NEVER GUESSES SILENTLY'}
            </text>
          </svg>
        );
      }}
      preview={({accent, act, acted}) => (
        <div className="space-y-3">
          <p className="font-body text-sm text-cream/80">
            Today, photo intake runs through <Link href="/nightvision" className="underline decoration-brass/50">NightVision</Link> and the
            {' '}<Link href="/stylist" className="underline decoration-brass/50">Stylist</Link>. The Camera will unify them with consent, retention and deletion controls.
          </p>
          <PlateAction label="Scan the rest of the closet" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
