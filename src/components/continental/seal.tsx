import {useId, type CSSProperties, type ReactNode} from 'react';
import {BevelFilter} from './emboss';

/** Deterministic irregular wax blob outline. */
function blobPath(seed: number): string {
  let d = '';
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 44 + 2.6 * Math.sin(t * 5 + seed) + 1.6 * Math.sin(t * 9 + seed * 2.1) + 1.1 * Math.cos(t * 13 + seed * 0.7);
    d += `${i === 0 ? 'M' : 'L'}${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`;
  }
  return `${d}Z`;
}

const BLOBS = [blobPath(1.3), blobPath(2.9), blobPath(4.4)];

/**
 * Seal — pressed sealing wax with a stamped impression.
 * `mark` is a monogram letter (Playfair italic) or 'sigil' for the eye-and-pyramid hallmark.
 */
export function Seal({
  size = 72,
  mark = 'F',
  wax = 'oxblood',
  variant = 0,
  className,
  style,
  title,
}: {
  size?: number;
  mark?: ReactNode | 'sigil';
  wax?: 'oxblood' | 'black' | 'gold';
  variant?: 0 | 1 | 2;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const id = useId().replace(/:/g, '');
  const palette = {
    oxblood: ['#b33a4e', '#7a1c2c', '#3d0812', '#ffc9c0'],
    black: ['#3a3438', '#16121a', '#050406', '#d9d2dc'],
    gold: ['#f6dc8c', '#c39a3c', '#6f4c14', '#fff4cf'],
  }[wax];
  return (
    <svg
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{overflow: 'visible', filter: 'drop-shadow(0 4px 5px rgb(0 0 0 / 65%))', ...style}}
    >
      <defs>
        <radialGradient id={`${id}w`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor={palette[0]} />
          <stop offset="0.55" stopColor={palette[1]} />
          <stop offset="1" stopColor={palette[2]} />
        </radialGradient>
        <radialGradient id={`${id}well`} cx="60%" cy="65%" r="65%">
          <stop offset="0" stopColor={palette[1]} />
          <stop offset="1" stopColor={palette[2]} />
        </radialGradient>
        <BevelFilter id={`${id}b`} blur={3.2} scale={4} specular={1.05} exponent={24} color={palette[3]} strength={0.55} />
        <BevelFilter id={`${id}m`} blur={0.7} scale={2.4} specular={0.9} exponent={16} color={palette[3]} strength={0.7} />
      </defs>
      <path d={BLOBS[variant]} fill={`url(#${id}w)`} filter={`url(#${id}b)`} />
      {/* stamp well */}
      <circle cx="50" cy="50" r="31" fill={`url(#${id}well)`} />
      <circle cx="50" cy="50" r="31" fill="none" stroke={palette[2]} strokeWidth="1.6" opacity="0.8" />
      <circle cx="50" cy="50" r="30.2" fill="none" stroke={palette[3]} strokeWidth="0.5" opacity="0.35" strokeDasharray="30 60" transform="rotate(30 50 50)" />
      <g filter={`url(#${id}m)`} fill={palette[1]} stroke={palette[1]}>
        <circle cx="50" cy="50" r="26.5" fill="none" strokeWidth="0.9" />
        {Array.from({length: 36}).map((_, i) => {
          const a = (i / 36) * Math.PI * 2;
          return <circle key={i} cx={(50 + 28.6 * Math.cos(a)).toFixed(2)} cy={(50 + 28.6 * Math.sin(a)).toFixed(2)} r="0.7" stroke="none" />;
        })}
        {mark === 'sigil' ? (
          <g fill="none" strokeWidth="1.6" strokeLinejoin="miter">
            <path d="M50 30L66 60H34Z" />
            <path d="M42 46Q50 39.5 58 46Q50 52.5 42 46Z" strokeWidth="1.3" />
            <circle cx="50" cy="46" r="2.2" stroke="none" />
            <path d="M37 54.5h26" strokeWidth="0.8" />
          </g>
        ) : (
          <text x="50" y="61" textAnchor="middle" stroke="none" style={{fontFamily: 'var(--font-playfair), Playfair Display, serif', fontStyle: 'italic', fontSize: 30, fontWeight: 600}}>
            {mark}
          </text>
        )}
      </g>
    </svg>
  );
}
