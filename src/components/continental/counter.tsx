import type {CSSProperties} from 'react';
import {Screw} from './plate';
import {brushedUri} from './textures';

/**
 * BrassCounter — a mechanical counter: ivory numerals on drums behind lacquer windows,
 * set in a brushed brass housing. Punctuation is engraved straight into the brass.
 * `label` is read by screen readers in place of the per-digit drums.
 */
export function BrassCounter({value, label, size = 26, className, style}: {value: string; label: string; size?: number; className?: string; style?: CSSProperties}) {
  const chars = value.split('');
  return (
    <div
      role="img"
      aria-label={label}
      className={['relative isolate inline-flex items-center overflow-hidden', className].filter(Boolean).join(' ')}
      style={{
        padding: `${size * 0.32}px ${size * 0.55}px`,
        gap: size * 0.1,
        backgroundImage: 'linear-gradient(110deg, rgb(255 250 228 / 0%) 30%, rgb(255 250 228 / 40%) 45%, rgb(255 250 228 / 0%) 58%), linear-gradient(180deg, #ecd197 0%, #c9a65f 35%, #a8843f 65%, #8a6a2e 100%)',
        boxShadow: 'inset 0 1px 0 rgb(255 246 214 / 75%), inset 0 -1px 0 rgb(58 38 10 / 70%), 0 1px 0 rgb(0 0 0 / 70%), 0 8px 18px -6px rgb(0 0 0 / 80%)',
        borderRadius: 3,
        ...style,
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{backgroundImage: brushedUri(0.5), backgroundSize: '100% 100%', mixBlendMode: 'overlay', opacity: 0.6}} />
      <Screw size={5} angle={30} className="absolute left-1 top-1/2 -translate-y-1/2" />
      <Screw size={5} angle={120} className="absolute right-1 top-1/2 -translate-y-1/2" />
      {chars.map((c, i) =>
        /\d/.test(c) ? (
          <span
            aria-hidden
            key={i}
            className="relative inline-flex items-center justify-center font-label font-semibold"
            style={{
              width: size * 0.78,
              height: size * 1.3,
              fontSize: size,
              lineHeight: 1,
              color: '#f2e8d2',
              background: 'linear-gradient(180deg, #050405 0%, #1e1a1f 22%, #2a252b 50%, #1e1a1f 78%, #050405 100%)',
              boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 90%), 0 1px 0 rgb(255 240 200 / 55%), inset 0 2px 3px rgb(0 0 0 / 80%)',
              borderRadius: 1.5,
              textShadow: '0 1px 1px rgb(0 0 0 / 90%)',
            }}
          >
            {c}
            <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px" style={{background: 'rgb(0 0 0 / 45%)'}} />
          </span>
        ) : (
          <span
            aria-hidden
            key={i}
            className="font-label font-semibold"
            style={{fontSize: size * 0.8, color: 'var(--brass-ink)', textShadow: '0 1px 0 rgb(255 241 200 / 60%)', margin: `0 ${size * 0.02}px`}}
          >
            {c}
          </span>
        ),
      )}
    </div>
  );
}
