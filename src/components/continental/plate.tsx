import type {CSSProperties, ReactNode} from 'react';
import {brushedUri} from './textures';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

/** Slotted screw head — angle varies so a row of them doesn't look stamped. */
export function Screw({size = 7, angle = 35, className, style}: {size?: number; angle?: number; className?: string; style?: CSSProperties}) {
  return (
    <span
      aria-hidden
      className={cx('inline-block rounded-full', !className?.includes('absolute') && 'relative', className)}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 35% 30%, #fff1c4 0%, #c9a45a 38%, #6b4f22 100%)',
        boxShadow: '0 0 0 0.5px rgb(40 25 5 / 80%), 0 1px 1px rgb(0 0 0 / 60%), inset 0 -1px 1px rgb(0 0 0 / 35%)',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: '12%',
          right: '12%',
          top: '50%',
          height: Math.max(1, size * 0.14),
          marginTop: -Math.max(1, size * 0.07),
          background: 'rgb(50 32 8 / 85%)',
          boxShadow: '0 0.5px 0 rgb(255 240 200 / 40%)',
          transform: `rotate(${angle}deg)`,
        }}
      />
    </span>
  );
}

type Finish = 'brass' | 'nickel' | 'enamel';

const FINISH: Record<Finish, {bg: string; ink: string; lip: string; edge: string}> = {
  brass: {
    bg: 'linear-gradient(110deg, rgb(255 250 228 / 0%) 26%, rgb(255 250 228 / 48%) 42%, rgb(255 250 228 / 0%) 56%), linear-gradient(172deg, #f0d69c 0%, #d3b16a 22%, #b08b45 50%, #caa75f 72%, #94722f 100%)',
    ink: 'var(--brass-ink)',
    lip: 'rgb(255 241 200 / 62%)',
    edge: '#5b4219',
  },
  nickel: {
    bg: 'linear-gradient(110deg, rgb(255 255 255 / 0%) 26%, rgb(255 255 255 / 55%) 42%, rgb(255 255 255 / 0%) 56%), linear-gradient(172deg, #eceef0 0%, #b9bdc3 30%, #8f949b 52%, #c5c9ce 76%, #7b8087 100%)',
    ink: '#1b1d21',
    lip: 'rgb(255 255 255 / 65%)',
    edge: '#3c4046',
  },
  enamel: {
    bg: 'linear-gradient(110deg, rgb(255 255 255 / 0%) 30%, rgb(255 255 255 / 9%) 44%, rgb(255 255 255 / 0%) 56%), linear-gradient(180deg, #1b161d 0%, #0b080c 100%)',
    ink: 'transparent',
    lip: 'transparent',
    edge: '#8a6a2e',
  },
};

/**
 * Plate — an engraved hotel room plate. Brushed metal, bevelled edge, stepped corners,
 * four slotted screws. `number` is engraved large; `label` sits beneath in signage caps.
 */
export function Plate({
  number,
  label,
  sub,
  finish = 'brass',
  size = 'md',
  screws = true,
  className,
  style,
  children,
}: {
  number?: ReactNode;
  label?: ReactNode;
  sub?: ReactNode;
  finish?: Finish;
  size?: 'sm' | 'md' | 'lg';
  screws?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const f = FINISH[finish];
  const step = size === 'sm' ? 5 : size === 'lg' ? 12 : 8;
  const clip = `polygon(${step}px 0, calc(100% - ${step}px) 0, 100% ${step}px, 100% calc(100% - ${step}px), calc(100% - ${step}px) 100%, ${step}px 100%, 0 calc(100% - ${step}px), 0 ${step}px)`;
  const pad = size === 'sm' ? 'px-3 py-1.5' : size === 'lg' ? 'px-8 py-5' : 'px-5 py-3';
  const numSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-5xl' : 'text-3xl';
  const enamel = finish === 'enamel';
  return (
    <div className={cx('relative inline-block', className)} style={{filter: 'drop-shadow(0 6px 10px rgb(0 0 0 / 65%)) drop-shadow(0 1px 0 rgb(0 0 0 / 80%))', ...style}}>
      {/* edge (the plate's thickness) */}
      <div style={{clipPath: clip, background: f.edge, padding: 1}}>
        <div
          className={cx('relative isolate overflow-hidden text-center', pad)}
          style={{
            clipPath: clip,
            backgroundImage: f.bg,
            boxShadow: enamel
              ? 'inset 0 0 0 1px rgb(201 169 97 / 70%), inset 0 0 0 3px #0b080c, inset 0 0 0 4px rgb(201 169 97 / 35%)'
              : `inset 0 1px 0 ${f.lip}, inset 0 -1px 0 rgb(0 0 0 / 35%), inset 0 0 0 3px rgb(255 255 255 / 4%), inset 0 0 0 4px rgb(0 0 0 / 14%)`,
          }}
        >
          {!enamel && (
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{backgroundImage: brushedUri(0.5), backgroundSize: '100% 100%', mixBlendMode: 'overlay', opacity: 0.7}} />
          )}
          {screws && size !== 'sm' && (
            <>
              <Screw className="absolute left-2 top-2" angle={20} size={size === 'lg' ? 8 : 6} />
              <Screw className="absolute right-2 top-2" angle={110} size={size === 'lg' ? 8 : 6} />
              <Screw className="absolute bottom-2 left-2" angle={70} size={size === 'lg' ? 8 : 6} />
              <Screw className="absolute bottom-2 right-2" angle={155} size={size === 'lg' ? 8 : 6} />
            </>
          )}
          {number !== undefined && (
            <div
              className={cx('font-label font-semibold leading-none tracking-[0.12em]', numSize, enamel && 'ct-gilt')}
              style={enamel ? undefined : {color: f.ink, textShadow: `0 1px 0 ${f.lip}, 0 -1px 0 rgb(0 0 0 / 25%)`}}
            >
              {number}
            </div>
          )}
          {label && (
            <div
              className={cx('font-label uppercase leading-tight', size === 'sm' ? 'text-[8px] tracking-[0.3em]' : 'text-[9px] tracking-[0.42em]', number !== undefined && 'mt-1.5', enamel && 'ct-gilt')}
              style={enamel ? undefined : {color: f.ink, textShadow: `0 1px 0 ${f.lip}`}}
            >
              {label}
            </div>
          )}
          {sub && (
            <div className="mt-1 font-body text-[11px] italic leading-tight" style={{color: enamel ? 'var(--ct-text-soft)' : f.ink, opacity: 0.85}}>
              {sub}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Nameplate — a slim engraved brass bar for member names. */
export function Nameplate({name, finish = 'brass', className}: {name: string; finish?: Finish; className?: string}) {
  const f = FINISH[finish];
  return (
    <div className={cx('relative inline-flex max-w-full', className)} style={{filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 70%))'}}>
      <div
        className="relative isolate flex min-w-0 items-center gap-2 overflow-hidden px-2.5 py-1"
        style={{
          backgroundImage: f.bg,
          clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 4px 100%, 0 50%)',
          boxShadow: `inset 0 1px 0 ${f.lip}, inset 0 -1px 0 rgb(0 0 0 / 35%)`,
        }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{backgroundImage: brushedUri(0.5), backgroundSize: '100% 100%', mixBlendMode: 'overlay', opacity: 0.7}} />
        <span className="truncate font-label text-[9.5px] font-semibold uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.2em]" style={{color: f.ink, textShadow: `0 1px 0 ${f.lip}`}}>
          {name}
        </span>
      </div>
    </div>
  );
}
