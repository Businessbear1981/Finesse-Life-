'use client';

import {useId, type CSSProperties} from 'react';
import {motion, useReducedMotion} from 'framer-motion';
import {CARD_FINISHES, type CardFinish} from '@/lib/card-finishes';
import {GuillocheBand, GuillocheRosette} from './ornaments';
import {brushedUri, sparkleUri} from './textures';

/* Physical material per finish. Ink colours come from lib/card-finishes (shared with mobile). */
const MATERIAL: Record<CardFinish, {base: string; layers: string[]; foil: string; foilShadow: string; engraveLip: string; edge: string; rosette: string}> = {
  nano_black: {
    base: 'radial-gradient(130% 150% at 18% -10%, #2a2a2f 0%, #111114 38%, #060607 72%, #020203 100%)',
    layers: [
      'linear-gradient(118deg, rgb(255 255 255 / 0%) 28%, rgb(255 255 255 / 7%) 42%, rgb(255 255 255 / 0%) 56%)',
    ],
    foil: 'linear-gradient(180deg, #fff3c9 0%, #f0d48e 30%, #b98f45 52%, #8c6828 58%, #e9c97f 80%, #fbe7b0 100%)',
    foilShadow: 'drop-shadow(0 0.5px 0 rgb(0 0 0 / 90%))',
    engraveLip: 'rgb(0 0 0 / 90%)',
    edge: 'inset 0 0 0 1px rgb(255 255 255 / 12%), inset 0 1px 0 rgb(255 255 255 / 22%), inset 0 -1px 0 rgb(0 0 0 / 80%)',
    rosette: '#d4c49a',
  },
  platinum: {
    base: 'linear-gradient(100deg, #8f939a 0%, #e4e6e9 16%, #aeb2b8 31%, #f7f7f6 49%, #a6aab1 67%, #dcdee2 84%, #868a91 100%)',
    layers: [
      'linear-gradient(125deg, rgb(255 255 255 / 0%) 32%, rgb(255 255 255 / 55%) 44%, rgb(255 255 255 / 0%) 54%)',
      'radial-gradient(90% 120% at 100% 100%, rgb(40 44 52 / 30%) 0%, rgb(40 44 52 / 0%) 60%)',
    ],
    foil: 'linear-gradient(180deg, #4a4c52 0%, #0b0b0d 45%, #2c2d31 60%, #050506 100%)',
    foilShadow: 'drop-shadow(0 0.6px 0 rgb(255 255 255 / 70%))',
    engraveLip: 'rgb(255 255 255 / 70%)',
    edge: 'inset 0 0 0 1px rgb(255 255 255 / 55%), inset 0 1px 0 rgb(255 255 255 / 90%), inset 0 -1px 0 rgb(40 44 52 / 60%)',
    rosette: '#2a2d33',
  },
  rose_gold: {
    base: 'linear-gradient(100deg, #a8665f 0%, #efc3b0 16%, #c3877b 31%, #f9dccc 49%, #b67a6e 67%, #ebbca8 84%, #93564f 100%)',
    layers: [
      'linear-gradient(125deg, rgb(255 245 238 / 0%) 32%, rgb(255 245 238 / 55%) 44%, rgb(255 245 238 / 0%) 54%)',
      'radial-gradient(90% 120% at 100% 100%, rgb(80 24 28 / 28%) 0%, rgb(80 24 28 / 0%) 60%)',
    ],
    foil: 'linear-gradient(180deg, #8a4440 0%, #3d1215 45%, #6e2c2b 62%, #2a0b0d 100%)',
    foilShadow: 'drop-shadow(0 0.6px 0 rgb(255 236 226 / 70%))',
    engraveLip: 'rgb(255 236 226 / 65%)',
    edge: 'inset 0 0 0 1px rgb(255 236 226 / 50%), inset 0 1px 0 rgb(255 245 238 / 90%), inset 0 -1px 0 rgb(80 24 28 / 55%)',
    rosette: '#4a1a1c',
  },
};

/** EMV chip with real contact geometry. */
export function EmvChip({style}: {style?: CSSProperties}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden viewBox="0 0 52 40" style={style}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbe8b4" />
          <stop offset="0.35" stopColor="#d7b46a" />
          <stop offset="0.6" stopColor="#f0d595" />
          <stop offset="1" stopColor="#9b7634" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.48" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.62" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="51" height="39" rx="6.5" fill={`url(#${id}g)`} stroke="#7a5a26" strokeWidth="0.8" />
      <g fill="none" stroke="#6e5121" strokeWidth="0.9" strokeLinecap="round">
        <rect x="17" y="9" width="18" height="22" rx="3.2" />
        <path d="M1 13.6H17M1 26.4H17M35 13.6H51M35 26.4H51M26 1V9M26 31V39M17 20H11M35 20H41" />
      </g>
      <rect x="0.5" y="0.5" width="51" height="39" rx="6.5" fill={`url(#${id}s)`} />
    </svg>
  );
}

function Contactless({color, style}: {color: string; style?: CSSProperties}) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" style={style}>
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
        <path d="M7 8.5a5 5 0 0 1 0 7" />
        <path d="M10.5 6a8.5 8.5 0 0 1 0 12" />
        <path d="M14 3.5a12 12 0 0 1 0 17" />
      </g>
    </svg>
  );
}

const cq = (n: number) => `${n}cqw`;

/**
 * FinesseCard — the member's Vault card as a physical object.
 * Anodised/brushed metal per finish, foil-stamped wordmark, EMV chip, engraved number,
 * metal edge highlight. The front/back copy is the honest preview copy from the Vault.
 */
export function FinesseCard({
  finish,
  brand = 'FINESSE',
  holder = 'MEMBER',
  flipped = false,
  onFlip,
  accent = '#C9A961',
  width = '100%',
  className,
}: {
  finish: CardFinish;
  brand?: string;
  holder?: string;
  flipped?: boolean;
  onFlip?: () => void;
  accent?: string;
  width?: string | number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const f = CARD_FINISHES[finish];
  const m = MATERIAL[finish];
  const metal = finish !== 'nano_black';

  const face: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: cq(4.6),
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    backgroundImage: [...m.layers, m.base].join(','),
    boxShadow: `${m.edge}, 0 ${cq(5)} ${cq(9)} -${cq(3)} rgb(0 0 0 / 85%), 0 0 ${cq(12)} ${accent}1f`,
  };
  const engraved = (soft = false): CSSProperties => ({
    color: soft ? f.inkSoft : f.ink,
    textShadow: `0 ${metal ? '1px' : '-1px'} 0 ${m.engraveLip}`,
  });
  const foil: CSSProperties = {
    backgroundImage: m.foil,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    filter: m.foilShadow,
    textShadow: 'none',
  };

  const texture = (
    <>
      {metal ? (
        <span aria-hidden className="absolute inset-0" style={{backgroundImage: brushedUri(0.6), backgroundSize: '100% 100%', mixBlendMode: 'overlay', opacity: 0.85}} />
      ) : (
        <span aria-hidden className="absolute inset-0" style={{backgroundImage: sparkleUri(0.5), backgroundSize: '140px 140px', mixBlendMode: 'screen', opacity: 0.75}} />
      )}
      <GuillocheRosette className="absolute" style={{right: cq(-16), top: cq(-10), width: cq(72), height: cq(72), opacity: metal ? 0.16 : 0.11}} color={m.rosette} strokeWidth={0.28} />
    </>
  );

  return (
    <div className={className} style={{width, containerType: 'inline-size'}}>
      <button
        type="button"
        onClick={onFlip}
        aria-pressed={flipped}
        aria-label={`${f.label} ${brand} card preview — ${flipped ? 'showing back' : 'showing front'}. Tap to flip.`}
        title="Tap to flip"
        className="relative block w-full cursor-pointer select-none rounded-[4.6cqw] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brass-200)]"
        style={{aspectRatio: '1.586', perspective: 1200}}
      >
        <motion.div
          animate={{rotateY: flipped ? 180 : 0}}
          transition={reduce ? {duration: 0} : {duration: 0.9, type: 'spring', stiffness: 70, damping: 14}}
          style={{width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative'}}
        >
          {/* FRONT */}
          <div style={face}>
            {texture}
            {/* wordmark — foil stamped */}
            <div className="absolute font-label font-bold uppercase" style={{left: cq(7), top: cq(7.5), fontSize: cq(5.6), letterSpacing: '0.38em', lineHeight: 1, ...foil}}>
              {brand}
            </div>
            <div className="absolute font-display italic" style={{right: cq(7), top: cq(6.6), fontSize: cq(4.2), lineHeight: 1, ...engraved(true)}}>
              {f.label}
            </div>
            {/* chip + contactless */}
            <EmvChip style={{position: 'absolute', left: cq(7.5), top: cq(25), width: cq(13.5), height: cq(10.4), filter: 'drop-shadow(0 0.5px 0.5px rgb(0 0 0 / 50%))'}} />
            <Contactless color={f.inkSoft} style={{position: 'absolute', left: cq(23.5), top: cq(26.6), width: cq(7), height: cq(7)}} />
            {/* engraved number (masked — no card is issued yet) */}
            <div className="absolute font-label font-semibold" style={{left: cq(7.5), bottom: cq(22), fontSize: cq(5.4), letterSpacing: '0.16em', lineHeight: 1, whiteSpace: 'nowrap', ...engraved()}}>
              ••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••
            </div>
            <div className="absolute flex items-end justify-between" style={{left: cq(7.5), right: cq(7), bottom: cq(7)}}>
              <div className="min-w-0">
                <div className="font-label uppercase" style={{fontSize: cq(2.2), letterSpacing: '0.3em', marginBottom: cq(0.8), ...engraved(true)}}>CARD HOLDER</div>
                <div className="truncate font-label font-semibold uppercase" style={{fontSize: cq(3.7), letterSpacing: '0.16em', maxWidth: cq(56), ...engraved()}}>{holder}</div>
              </div>
              <div className="text-right">
                <div className="font-label uppercase" style={{fontSize: cq(2.2), letterSpacing: '0.3em', marginBottom: cq(0.8), ...engraved(true)}}>EXPIRES</div>
                <div className="font-label font-semibold" style={{fontSize: cq(3.7), letterSpacing: '0.12em', ...engraved()}}>••/••</div>
              </div>
            </div>
          </div>

          {/* BACK */}
          <div style={{...face, transform: 'rotateY(180deg)'}}>
            {texture}
            <div className="absolute inset-x-0" style={{top: cq(8), height: cq(13), background: 'linear-gradient(180deg, #121113 0%, #232126 45%, #0b0a0c 100%)', boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 12%)'}} />
            <div className="absolute flex items-center overflow-hidden" style={{left: cq(7), right: cq(7), top: cq(27), height: cq(9.5), background: '#f2ead8', boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 25%)'}}>
              <GuillocheBand className="absolute inset-0 h-full w-full" color="#b9a274" strokeWidth={0.5} />
              <span className="relative ml-auto mr-[3cqw] bg-[#f2ead8] px-[1.5cqw] font-label font-semibold" style={{fontSize: cq(3), color: '#1e140c', letterSpacing: '0.12em'}}>
                CVV: ***
              </span>
            </div>
            <div className="absolute inset-x-0 text-center font-label uppercase" style={{top: cq(44), fontSize: cq(2.7), letterSpacing: '0.3em', padding: `0 ${cq(6)}`, ...engraved(true)}}>
              <span style={engraved()}>12% CASHBACK ON ALL FINESSE PURCHASES</span>
            </div>
            <div className="absolute inset-x-0 text-center font-label uppercase" style={{bottom: cq(6), fontSize: cq(2.3), letterSpacing: '0.28em', ...engraved(true)}}>
              finesselife.vip &middot; CARD PREVIEW
            </div>
          </div>
        </motion.div>
      </button>
    </div>
  );
}
