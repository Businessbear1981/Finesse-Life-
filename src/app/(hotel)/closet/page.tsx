'use client';

import {motion} from 'framer-motion';
import {PlateAction, RoomPlate} from '@/components/hotel/room-plate';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ClosetPage() {
  return (
    <RoomPlate
      roomId="closet"
      lede={{
        finesse: 'Seven looks, all from pieces you already own. The one thing missing stays on its own hook.',
        carpe_diem: 'Seven fits, all from what is already in the closet. The one missing piece hangs apart.',
      }}
      emptyCopy="The rail is bare. Scan your closet with The Camera to fill it."
      actionConsequence="lock the week's rotation; a missing piece only becomes a Bag or Stylist suggestion if you ask."
      scene={({accent, reduce}) => (
        <div className="absolute inset-0 overflow-hidden" style={{background: 'linear-gradient(180deg,#2a170c 0%,#140a06 60%,#080406 100%)'}}>
          <div aria-hidden="true" className="absolute inset-x-[8%] top-[6%] h-[3%] rounded bg-gradient-to-r from-brass-shadow via-brass-highlight to-brass-shadow" />
          <motion.div
            className="absolute inset-x-[10%] top-[10%] flex h-[70%] justify-between"
            animate={reduce ? {} : {x: ['0%', '-2%', '0%']}}
            transition={{duration: 9, repeat: Infinity, ease: 'easeInOut'}}
          >
            {WEEK.map((d, i) => (
              <div key={d} className="flex w-[12%] flex-col items-center">
                <div className="h-6 w-px bg-brass/70" />
                <div className="h-full w-full rounded-t-[40%] border border-brass/30"
                  style={{background: `linear-gradient(180deg, ${i % 2 ? accent + '40' : '#3a2a1c'}, #120a08)`}} />
                <span className="mt-2 font-label text-[9px] uppercase tracking-[0.3em] text-cream/70">{d}</span>
              </div>
            ))}
          </motion.div>
          <div className="absolute bottom-[6%] right-[4%] w-[16%] border border-dashed p-2 text-center font-label text-[8px] uppercase tracking-[0.25em] text-cream/70" style={{borderColor: accent}}>
            Missing piece
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{background: 'radial-gradient(ellipse at 50% 0%, rgba(244,232,208,0.18), transparent 60%)'}} />
        </div>
      )}
      preview={({accent, act, acted}) => (
        <div className="space-y-4">
          <ol className="grid grid-cols-7 gap-1" aria-label="Weekly rotation, sample">
            {WEEK.map((d) => (
              <li key={d} className="border border-brass/15 p-2 text-center">
                <span className="block font-label text-[8px] uppercase tracking-[0.2em] text-brass/70">{d}</span>
                <span className="mt-1 block font-body text-[11px] text-cream/75">Owned</span>
              </li>
            ))}
          </ol>
          <p className="font-body text-xs italic text-cream/55">Owned pieces never generate an affiliate event just by appearing here.</p>
          <PlateAction label="Approve the week" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
