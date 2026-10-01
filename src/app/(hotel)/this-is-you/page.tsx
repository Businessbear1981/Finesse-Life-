'use client';

import {useState} from 'react';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate} from '@/components/hotel/room-plate';

type Lens = 'public' | 'private';

export default function ThisIsYouPage() {
  const [lens, setLens] = useState<Lens>('public');
  return (
    <RoomPlate
      roomId="this-is-you"
      lede={{
        finesse: 'The double-sided mirror: what the hotel sees, and what only you do. You decide which way it turns.',
        carpe_diem: 'The double-sided mirror: your public record, and the private one. You decide which way it turns.',
      }}
      emptyCopy="Nothing is projected yet. Choose what the Lounge may see."
      actionConsequence="save your visibility choices server-side; hidden fields are never sent to other members' screens."
      scene={({accent, reduce}) => (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#1d0d12_0%,#080406_70%)]" style={{perspective: 1200}}>
          {[12, 30, 70, 88].map((x) => (
            <div key={x} aria-hidden="true" className="absolute top-[18%] h-[50%] w-[10%] border border-brass/20" style={{left: `${x - 5}%`}} />
          ))}
          <motion.div
            className="relative h-[72%] w-[34%] min-w-[180px]"
            style={{transformStyle: 'preserve-3d'}}
            animate={{rotateY: lens === 'public' ? 0 : 180}}
            transition={{duration: reduce ? 0 : 1.1, ease: [0.65, 0, 0.35, 1]}}
          >
            {(['public', 'private'] as const).map((face) => (
              <div key={face} className="absolute inset-0 flex flex-col items-center justify-center rounded-t-full border-2 border-brass/60"
                style={{backfaceVisibility: 'hidden', transform: face === 'private' ? 'rotateY(180deg)' : undefined,
                  background: face === 'public' ? `linear-gradient(180deg, ${accent}33, #120609)` : 'linear-gradient(180deg,#2a2016,#080406)'}}>
                <span className="font-label text-[10px] uppercase tracking-[0.5em] text-brass-highlight">{face === 'public' ? 'Public Stage' : 'Private'}</span>
                <span className="mt-2 font-display text-2xl italic text-cream/80">{face === 'public' ? 'As the Lounge sees you' : 'As only you see you'}</span>
              </div>
            ))}
          </motion.div>
        </div>
      )}
      preview={({accent, act, acted}) => (
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Mirror audience" className="flex gap-2">
            {(['public', 'private'] as const).map((l) => (
              <button key={l} role="radio" aria-checked={lens === l} type="button" onClick={() => setLens(l)}
                className="min-h-11 flex-1 border px-3 font-label text-[10px] uppercase tracking-[0.3em]"
                style={{borderColor: lens === l ? accent : 'rgba(201,169,97,0.25)', color: lens === l ? '#F4E8D0' : 'rgba(244,232,208,0.6)'}}>
                {l === 'public' ? 'Members see' : 'Only I see'}
              </button>
            ))}
          </div>
          <ul className="grid gap-2 font-body text-sm text-cream/80 sm:grid-cols-2">
            {(lens === 'public'
              ? ['Display name and portrait', 'Vibe line', 'Lounge posts you chose to share']
              : ['Spend, preferences and Style DNA', 'Traffic to your profile (yours alone)', 'Backstage details — only by explicit VIP grant']
            ).map((x) => <li key={x} className="border border-brass/10 p-3">{x}</li>)}
          </ul>
          <p className="font-body text-xs italic text-cream/55">No hidden score is ever shown to anyone — not even as a band. Export and deletion live here once wired.</p>
          <PlateAction label="Edit what others see" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
