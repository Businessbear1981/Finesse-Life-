import {useId, type CSSProperties, type ReactNode} from 'react';
import {BrassGradientDefs, GuillocheRosette, Sunburst} from './ornaments';
import {MarbleSurface} from './surfaces';
import {brushedUri} from './textures';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

/* Spun (lathe-turned) metal: a conic gradient reads as circular brushing. */
const SPUN_STEEL =
  'conic-gradient(from 12deg, #26272b, #5d6068 7%, #222327 15%, #44464d 26%, #1b1c1f 37%, #6a6d75 50%, #232428 61%, #474950 72%, #1c1d20 84%, #575a61 93%, #26272b)';
const SPUN_BRASS =
  'conic-gradient(from 20deg, #8a6a2e, #f2d99a 8%, #9c7a39 18%, #d9b871 30%, #7a5a26 42%, #f7e3ab 54%, #a1803f 66%, #dcbc75 78%, #7f5f29 90%, #8a6a2e)';

const BOLTS = Array.from({length: 14}, (_, i) => (i / 14) * 360 + 360 / 28);
const RIVETS = Array.from({length: 24}, (_, i) => (i / 24) * Math.PI * 2);
const SPOKES = [0, 72, 144, 216, 288];
const DIAL_TICKS = Array.from({length: 50}, (_, i) => i);

type DoorState = 'opening' | 'open' | 'closed';

/**
 * VaultDoor — the Vault's flagship scene. A spun-steel circular door with a brass bezel,
 * five-spoke wheel, combination dial and fourteen locking bolts, hung in a marble wall.
 *
 *  opening  — on mount: dial spins, wheel turns, bolts retract, door swings out (~4.5s).
 *  open     — static open end state (used for reduced motion automatically via CSS).
 *  closed   — static, locked (signed-out / locked views).
 *
 * `children` is the reveal: shown in front of the open aperture (the card on its tray).
 */
export function VaultDoor({state = 'opening', children, className, style, plate = 'No. 06'}: {state?: DoorState; children?: ReactNode; className?: string; style?: CSSProperties; plate?: string}) {
  const id = useId().replace(/:/g, '');
  const animate = state === 'opening';
  const closed = state === 'closed';
  const anim = (cls: string) => (animate ? cls : undefined);

  return (
    <div
      className={cx(
        'relative w-full select-none',
        // Aperture geometry (percent of stage width). Mobile: shifted right so the open door has room.
        '[--ap-l:25cqw] [--ap-w:62cqw] sm:[--ap-l:32cqw] sm:[--ap-w:42cqw]',
        // The viewer stands a little left of the hinge so the swung door shows its face (wheel, dial, bolts).
        '[perspective:1100px] [perspective-origin:-60%_40%] sm:[perspective:1900px] sm:[perspective-origin:-25%_40%]',
        closed ? 'aspect-[1/0.86] sm:aspect-[16/9.5]' : 'aspect-[1/1.14] sm:aspect-[16/10.5]',
        className,
      )}
      style={{containerType: 'inline-size', ['--ap-t' as string]: 'calc(var(--ap-w) * 0.2)', ...style}}
    >
      {/* ── The wall: Nero Marquina with a brass-banded deco sunburst ───────── */}
      <MarbleSurface
        className="absolute inset-0 overflow-hidden"
        seed={19}
        veinOpacity={0.4}
        style={{maskImage: 'radial-gradient(closest-side at 50% 46%, #000 62%, transparent 100%)', WebkitMaskImage: 'radial-gradient(closest-side at 50% 46%, #000 62%, transparent 100%)'}}
      >
        <Sunburst
          rays={44}
          className="absolute"
          style={{left: 'calc(var(--ap-l) - 40%)', top: 'calc(var(--ap-t) - 40cqw)', width: 'calc(var(--ap-w) + 80%)', aspectRatio: '1'}}
          opacity={0.32}
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[38%]" style={{background: 'linear-gradient(180deg, rgb(8 6 10 / 0%) 0%, rgb(8 6 10 / 85%) 70%, #08060a 100%)'}} />
      </MarbleSurface>

      {/* ── Frame: stepped spun-brass bezel set into the wall ───────────────── */}
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          left: 'calc(var(--ap-l) - var(--ap-w) * 0.085)',
          top: 'calc(var(--ap-t) - var(--ap-w) * 0.085 * 1)',
          width: 'calc(var(--ap-w) * 1.17)',
          aspectRatio: '1',
          background: SPUN_BRASS,
          boxShadow: '0 0 0 1px #3a2a0e, 0 18px 40px -8px rgb(0 0 0 / 90%), inset 0 0 0 2px rgb(255 240 200 / 35%)',
        }}
      >
        <div className="absolute inset-[3.2%] rounded-full" style={{background: '#16110a', boxShadow: 'inset 0 2px 3px rgb(0 0 0 / 90%), 0 1px 0 rgb(255 240 200 / 40%)'}} />
        <div className="absolute inset-[4.4%] rounded-full" style={{background: SPUN_BRASS, filter: 'brightness(0.85)'}} />
      </div>

      {/* ── Aperture interior: deposit-box wall receding into warm light ───── */}
      <div
        aria-hidden
        className="absolute overflow-hidden rounded-full"
        style={{
          left: 'var(--ap-l)',
          top: 'var(--ap-t)',
          width: 'var(--ap-w)',
          aspectRatio: '1',
          background: 'radial-gradient(circle at 50% 45%, #2a2016 0%, #120d09 55%, #050304 100%)',
          boxShadow: 'inset 0 0 0 2px #050304, inset 0 10px 30px rgb(0 0 0 / 90%)',
        }}
      >
        {/* box wall */}
        <div
          className="absolute inset-[16%]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(0 0 0 / 70%) 1px, transparent 1px), linear-gradient(90deg, rgb(0 0 0 / 70%) 1px, transparent 1px), linear-gradient(180deg, #6d5126 0%, #3d2c13 100%)',
            backgroundSize: '18% 13%, 18% 13%, 100% 100%',
            boxShadow: '0 0 0 6px #0c0806, 0 0 40px 20px rgb(0 0 0 / 80%)',
            opacity: 0.85,
          }}
        />
        {/* tunnel rings */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute rounded-full" style={{inset: `${5 + i * 4}%`, boxShadow: `inset 0 0 0 1px rgb(201 169 97 / ${0.18 - i * 0.05}), inset 0 0 24px rgb(0 0 0 / 80%)`}} />
        ))}
        {/* interior light comes on as the door opens */}
        <div className={cx('absolute inset-0', anim('ct-vault-glow'))} style={{opacity: closed ? 0 : 1, background: 'radial-gradient(circle at 50% 18%, rgb(255 205 140 / 45%) 0%, rgb(255 169 107 / 12%) 40%, transparent 70%)'}} />
      </div>

      {/* ── Hinge barrels ───────────────────────────────────────────────────── */}
      {[22, 66].map((t) => (
        <div
          key={t}
          aria-hidden
          className="absolute rounded-[2px]"
          style={{
            left: 'calc(var(--ap-l) - var(--ap-w) * 0.075)',
            top: `calc(var(--ap-t) + var(--ap-w) * ${t / 100})`,
            width: 'calc(var(--ap-w) * 0.06)',
            height: 'calc(var(--ap-w) * 0.13)',
            background: 'linear-gradient(90deg, #5b4219 0%, #f2d99a 35%, #b08b45 60%, #4a3514 100%)',
            boxShadow: '0 4px 8px rgb(0 0 0 / 70%)',
          }}
        />
      ))}

      {/* ── The door ────────────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className={cx('pointer-events-none absolute', anim('ct-vault-swing'))}
        style={{
          left: 'calc(var(--ap-l) - var(--ap-w) * 0.035)',
          top: 'calc(var(--ap-t) - var(--ap-w) * 0.035)',
          width: 'calc(var(--ap-w) * 1.07)',
          aspectRatio: '1',
          transformOrigin: '0% 50%',
          transformStyle: 'preserve-3d',
          transform: closed ? 'rotateY(0deg)' : 'rotateY(var(--ct-door-open, -92deg))',
        }}
      >
        {/* thickness: stacked discs give the door its massive edge when it swings */}
        {Array.from({length: 14}).map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{
              transform: `translateZ(${-1 - i * 2}px)`,
              background: i < 3 ? '#a8843f' : i > 10 ? '#55575d' : `linear-gradient(180deg, #8a8d94 0%, #3c3e44 45%, #1c1d21 100%)`,
            }}
          />
        ))}

        {/* back face — the bolt-work you only see once it's open */}
        <div className="absolute inset-0 rounded-full" style={{transform: 'translateZ(-29px) rotateY(180deg)', backfaceVisibility: 'hidden', background: SPUN_STEEL, filter: 'brightness(0.7)'}}>
          <svg viewBox="-110 -110 220 220" className="absolute inset-0 h-full w-full">
            <defs><BrassGradientDefs id={`${id}bb`} /></defs>
            <circle r="96" fill="none" stroke="#0b0b0c" strokeWidth="6" />
            {[0, 60, 120].map((a) => (
              <rect key={a} x="-92" y="-5" width="184" height="10" rx="2" fill={`url(#${id}bb)`} transform={`rotate(${a})`} opacity="0.85" />
            ))}
            <circle r="24" fill="#1a1a1d" stroke={`url(#${id}bb)`} strokeWidth="3" />
            {Array.from({length: 16}).map((_, i) => (
              <rect key={i} x="-2.5" y="-30" width="5" height="7" fill={`url(#${id}bb)`} transform={`rotate(${i * 22.5})`} />
            ))}
            <rect x="-26" y="40" width="52" height="16" fill={`url(#${id}bb)`} />
            <text y="51" textAnchor="middle" fill="#2c1f0b" style={{fontFamily: 'var(--font-cinzel), Cinzel, serif', fontSize: 7, letterSpacing: 1.5, fontWeight: 700}}>
              TIME LOCK
            </text>
          </svg>
        </div>

        {/* front face */}
        <div className="absolute inset-0 rounded-full" style={{backfaceVisibility: 'hidden', transform: 'translateZ(0)'}}>
          {/* spun steel disc */}
          <div className="absolute inset-[4%] rounded-full" style={{background: SPUN_STEEL, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 70%), inset 0 0 30px rgb(0 0 0 / 70%)'}} />
          {/* brass bezel */}
          <div className="absolute inset-0 rounded-full" style={{background: SPUN_BRASS, WebkitMask: 'radial-gradient(circle, transparent 59.5%, #000 60%)', mask: 'radial-gradient(circle, transparent 59.5%, #000 60%)', boxShadow: 'inset 0 0 0 1px rgb(60 40 10 / 80%)'}} />
          <svg viewBox="-110 -110 220 220" className="absolute inset-0 h-full w-full" style={{overflow: 'visible'}}>
            <defs>
              <BrassGradientDefs id={`${id}b`} />
              <BrassGradientDefs id={`${id}bv`} angle={0} />
              <linearGradient id={`${id}bolt`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f6f6f4" />
                <stop offset="0.45" stopColor="#a7aab0" />
                <stop offset="1" stopColor="#4c4f55" />
              </linearGradient>
              <radialGradient id={`${id}knob`} cx="35%" cy="30%" r="70%">
                <stop offset="0" stopColor="#fff3c6" />
                <stop offset="0.5" stopColor="#c9a45a" />
                <stop offset="1" stopColor="#5b4219" />
              </radialGradient>
              <radialGradient id={`${id}dial`} cx="40%" cy="35%" r="70%">
                <stop offset="0" stopColor="#2a2630" />
                <stop offset="1" stopColor="#060507" />
              </radialGradient>
              <path id={`${id}arc`} d="M-52 0a52 52 0 0 1 104 0" />
            </defs>

            {/* locking bolts — extend past the rim into the frame, retract under the bezel */}
            {BOLTS.map((a) => (
              <g key={a} transform={`rotate(${a})`}>
                <rect
                  className={anim('ct-vault-bolt')}
                  x="86"
                  y="-4.2"
                  width="25"
                  height="8.4"
                  rx="2"
                  fill={`url(#${id}bolt)`}
                  stroke="#2a2b2f"
                  strokeWidth="0.6"
                  style={{['--ct-bolt-travel' as string]: '-16px', transform: closed ? 'translateX(0)' : 'translateX(-16px)'}}
                />
              </g>
            ))}
            {/* bezel detail drawn above the bolts (they slide under it) */}
            <circle r="104" fill="none" stroke="#3a2a0e" strokeWidth="1" />
            <circle r="97" fill="none" stroke="rgb(255 240 200 / 0.5)" strokeWidth="0.5" />
            <circle r="67" fill="none" stroke="#3a2a0e" strokeWidth="1.2" />
            {RIVETS.map((a, i) => (
              <circle key={i} cx={(82 * Math.cos(a)).toFixed(2)} cy={(82 * Math.sin(a)).toFixed(2)} r="2.6" fill={`url(#${id}knob)`} stroke="#3a2a0e" strokeWidth="0.4" />
            ))}
            {/* engraved legend in the steel */}
            <text fill="rgb(232 226 210 / 0.55)" style={{fontFamily: 'var(--font-cinzel), Cinzel, serif', fontSize: 7.5, letterSpacing: 3.2, fontWeight: 600}}>
              <textPath href={`#${id}arc`} startOffset="50%" textAnchor="middle">THE FINESSE VAULT</textPath>
            </text>
            {/* maker's plate */}
            <g transform="translate(0 48)">
              <rect x="-24" y="-7" width="48" height="13" fill={`url(#${id}b)`} stroke="#3a2a0e" strokeWidth="0.5" />
              <text y="2" textAnchor="middle" fill="#2c1f0b" style={{fontFamily: 'var(--font-cinzel), Cinzel, serif', fontSize: 6.5, letterSpacing: 1.6, fontWeight: 700}}>
                {plate}
              </text>
            </g>

            {/* five-spoke wheel */}
            <g className={anim('ct-vault-wheel')} style={{transformBox: 'fill-box', transformOrigin: 'center'}}>
              <circle r="70" fill="none" stroke="none" />
              {SPOKES.map((a) => (
                <g key={a} transform={`rotate(${a})`}>
                  <rect x="-3.2" y="-58" width="6.4" height="40" rx="1.5" fill={`url(#${id}bv)`} stroke="#3a2a0e" strokeWidth="0.5" />
                  <circle cy="-60" r="7.5" fill={`url(#${id}knob)`} stroke="#3a2a0e" strokeWidth="0.6" />
                  <circle cx="-2.4" cy="-62.4" r="2.2" fill="#fffbe8" opacity="0.65" />
                </g>
              ))}
              <circle r="24" fill={`url(#${id}knob)`} stroke="#3a2a0e" strokeWidth="0.8" />
              <circle r="20" fill="none" stroke="rgb(60 40 10 / 0.6)" strokeWidth="0.6" />
            </g>

            {/* combination dial */}
            <g className={anim('ct-vault-dial')} style={{transformBox: 'fill-box', transformOrigin: 'center'}}>
              <circle r="17" fill={`url(#${id}dial)`} stroke="#c9a961" strokeWidth="0.8" />
              {DIAL_TICKS.map((t) => (
                <line key={t} x1="0" y1={t % 5 === 0 ? -16 : -16} x2="0" y2={t % 5 === 0 ? -12.6 : -14.4} stroke="#efe4cc" strokeWidth={t % 5 === 0 ? 0.7 : 0.35} transform={`rotate(${t * 7.2})`} />
              ))}
              {[0, 20, 40, 60, 80].map((n, i) => (
                <text key={n} x="0" y="-8.2" textAnchor="middle" fill="#efe4cc" transform={`rotate(${i * 72})`} style={{fontFamily: 'var(--font-cinzel), Cinzel, serif', fontSize: 3.6, fontWeight: 700}}>
                  {n}
                </text>
              ))}
              <circle r="5.2" fill={`url(#${id}knob)`} stroke="#3a2a0e" strokeWidth="0.4" />
            </g>
            {/* index mark (fixed) */}
            <path d="M0 -19.5l-1.8 -3h3.6Z" fill="#f2d99a" />
          </svg>
          {/* faint guilloché in the steel + lamp sheen */}
          <GuillocheRosette className="absolute inset-[22%] h-[56%] w-[56%] opacity-[0.16]" color="#d8dbe0" strokeWidth={0.25} />
          <div className="absolute inset-0 rounded-full" style={{background: 'radial-gradient(circle at 32% 24%, rgb(255 250 235 / 22%) 0%, rgb(255 250 235 / 0%) 38%)', mixBlendMode: 'screen'}} />
          <div className="absolute inset-[4%] rounded-full opacity-40" style={{backgroundImage: brushedUri(0.4), mixBlendMode: 'overlay'}} />
        </div>
      </div>

      {/* ── Reveal (card on its tray) ───────────────────────────────────────── */}
      {children && !closed && (
        <div className={cx('absolute inset-x-0 bottom-[3%] flex justify-center sm:left-[12%]', anim('ct-vault-reveal'))}>{children}</div>
      )}
    </div>
  );
}
