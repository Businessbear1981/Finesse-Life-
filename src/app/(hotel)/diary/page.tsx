'use client';

import {useState} from 'react';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate} from '@/components/hotel/room-plate';

type ItemState = 'done' | 'moved' | 'held' | 'needs_you' | 'approved';
const ITEMS: {t: string; what: string; s: ItemState}[] = [
  {t: '09:00', what: 'Salon — blow-out', s: 'done'},
  {t: '11:30', what: 'Tailor fitting', s: 'moved'},
  {t: '13:00', what: 'Lunch table for two', s: 'done'},
  {t: '16:00', what: 'Registry gift wrapped', s: 'done'},
  {t: '20:00', what: 'Ballroom evening — approve the hold', s: 'needs_you'},
];
const LABEL: Record<ItemState, string> = {done: 'Done', moved: 'Moved', held: 'Held', needs_you: 'Needs you', approved: 'Approved'};

export default function DiaryPage() {
  const [items, setItems] = useState(ITEMS);
  return (
    <RoomPlate
      roomId="diary"
      lede={{
        finesse: 'Four things handled. One that needs you. The day, on a single page.',
        carpe_diem: 'Four things handled. One decision left. The day, on a single page.',
      }}
      emptyCopy="A blank page. Nothing needs you today."
      actionConsequence="approve the held item with the partner; moved and held items stay visibly distinct until then."
      scene={({accent, reduce}) => (
        <div className="absolute inset-0 flex items-center justify-center" style={{background: 'radial-gradient(ellipse at 50% 30%, #3a1f12 0%, #120806 70%)'}}>
          <div className="relative flex h-[78%] w-[78%] max-w-[760px]" style={{perspective: 1400}}>
            <div className="h-full w-1/2 rounded-l-md border border-brass/30 bg-[#efe2c6] p-[4%] shadow-2xl">
              <p className="font-label text-[10px] uppercase tracking-[0.4em] text-[#6B5028]">Today</p>
              {items.slice(0, 4).map((i) => (
                <p key={i.t} className="mt-2 border-b border-[#6B5028]/20 pb-1 font-body text-[13px] text-[#2a170c]">
                  {i.t} · {i.what} <span className="italic text-[#6B5028]">— {LABEL[i.s]}</span>
                </p>
              ))}
            </div>
            <motion.div
              className="h-full w-1/2 origin-left rounded-r-md border border-brass/30 bg-[#f4e8d0] p-[4%] shadow-2xl"
              initial={reduce ? false : {rotateY: -60}}
              animate={{rotateY: 0}}
              transition={{duration: 1.2, ease: [0.16, 1, 0.3, 1]}}
            >
              <p className="font-label text-[10px] uppercase tracking-[0.4em]" style={{color: accent}}>One thing</p>
              <p className="mt-3 font-display text-xl italic text-[#2a170c]">{items[4].what}</p>
              <p className="mt-1 font-body text-sm italic text-[#6B5028]">{LABEL[items[4].s]}</p>
            </motion.div>
          </div>
        </div>
      )}
      preview={({accent, act, acted}) => (
        <div className="space-y-3">
          <ul className="space-y-1 font-body text-sm text-cream/80">
            {items.map((i) => <li key={i.t}>{i.t} — {i.what} <span className="italic text-cream/55">({LABEL[i.s]})</span></li>)}
          </ul>
          <PlateAction
            label="Approve one item"
            accent={accent}
            done={acted}
            onClick={() => { setItems((xs) => xs.map((x) => (x.s === 'needs_you' ? {...x, s: 'approved'} : x))); act(); }}
          />
        </div>
      )}
    />
  );
}
