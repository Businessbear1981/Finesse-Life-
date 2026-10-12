import {useId, type CSSProperties} from 'react';
import {BrassGradientDefs} from './ornaments';

/**
 * Lamp — a deco table lamp (stepped fan shade on a brass stem) casting a warm pool.
 * Purely decorative. The glow breathes slowly; still under reduced motion.
 */
export function Lamp({size = 56, glow = 1, className, style}: {size?: number; glow?: number; className?: string; style?: CSSProperties}) {
  const id = useId().replace(/:/g, '');
  return (
    <div aria-hidden className={[className?.includes('absolute') ? '' : 'relative', className].filter(Boolean).join(' ')} style={{width: size, height: size * 1.4, ...style}}>
      <div
        className="ct-lamp-flicker pointer-events-none absolute"
        style={{
          left: '50%',
          top: '28%',
          width: size * 5,
          height: size * 4,
          transform: 'translate(-50%, -40%)',
          background: `radial-gradient(closest-side, rgb(255 190 120 / ${0.3 * glow}) 0%, rgb(255 169 107 / ${0.12 * glow}) 45%, rgb(255 169 107 / 0) 100%)`,
          mixBlendMode: 'screen',
        }}
      />
      <svg viewBox="0 0 40 56" width={size} height={size * 1.4} className="relative">
        <defs>
          <BrassGradientDefs id={`${id}b`} angle={0} />
          <linearGradient id={`${id}shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe1a8" />
            <stop offset="0.6" stopColor="#f2b56a" />
            <stop offset="1" stopColor="#c7783a" />
          </linearGradient>
          <radialGradient id={`${id}bulb`} cx="50%" cy="100%" r="80%">
            <stop offset="0" stopColor="#fff4d6" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffb870" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* stepped fan shade */}
        <path d="M6 22L12 8h16l6 14Z" fill={`url(#${id}shade)`} />
        <path d="M6 22L12 8h16l6 14Z" fill="none" stroke={`url(#${id}b)`} strokeWidth="0.9" />
        <path d="M9 17h22M10.8 12.6h18.4" stroke="#9a6a2e" strokeWidth="0.45" opacity="0.7" />
        <path d="M20 8v14M15 8l-3.4 14M25 8l3.4 14" stroke="#b07a3a" strokeWidth="0.35" opacity="0.6" />
        <ellipse cx="20" cy="22.5" rx="14" ry="1.6" fill={`url(#${id}bulb)`} />
        {/* stem */}
        <rect x="19" y="22" width="2" height="22" fill={`url(#${id}b)`} />
        <path d="M17 31h6l-1 2h-4Z" fill={`url(#${id}b)`} />
        {/* stepped base */}
        <path d="M13 50h14l-2-4h-10Z" fill={`url(#${id}b)`} />
        <rect x="10" y="50" width="20" height="2.4" fill={`url(#${id}b)`} />
        <rect x="8" y="52.4" width="24" height="2.2" fill="#6b5028" />
      </svg>
    </div>
  );
}
