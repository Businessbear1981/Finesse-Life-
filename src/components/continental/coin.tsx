import {useId, type CSSProperties, type ReactNode} from 'react';
import {BevelFilter} from './emboss';

/**
 * Coin — a struck gold house marker. Reeded edge, beaded ring, legend around the rim,
 * value (or the sigil) in high relief at the centre, lamp-lit specular highlight.
 */
export function Coin({
  size = 120,
  value = '12%',
  legend = 'FINESSE · HOUSE MARKER · MMXXVI ·',
  caption,
  face = 'value',
  className,
  style,
  title,
}: {
  size?: number;
  value?: ReactNode;
  legend?: string;
  caption?: string;
  face?: 'value' | 'sigil';
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const id = useId().replace(/:/g, '');
  const reeds = Array.from({length: 120});
  return (
    <svg
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{filter: 'drop-shadow(0 6px 8px rgb(0 0 0 / 70%)) drop-shadow(0 1px 1px rgb(0 0 0 / 90%))', overflow: 'visible', ...style}}
    >
      <defs>
        <radialGradient id={`${id}rim`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#fff2bf" />
          <stop offset="0.35" stopColor="#e9c25c" />
          <stop offset="0.7" stopColor="#b98a2a" />
          <stop offset="1" stopColor="#6e4c12" />
        </radialGradient>
        <radialGradient id={`${id}field`} cx="60%" cy="66%" r="70%">
          <stop offset="0" stopColor="#f2cf6e" />
          <stop offset="0.55" stopColor="#c99a37" />
          <stop offset="1" stopColor="#8e6519" />
        </radialGradient>
        <linearGradient id={`${id}relief`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6cf" />
          <stop offset="0.5" stopColor="#e2b955" />
          <stop offset="1" stopColor="#a87a22" />
        </linearGradient>
        <radialGradient id={`${id}spec`} cx="32%" cy="26%" r="34%">
          <stop offset="0" stopColor="#fffbe8" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fffbe8" stopOpacity="0" />
        </radialGradient>
        <path id={`${id}legend`} d="M50 50m-32.6 0a32.6 32.6 0 1 1 65.2 0a32.6 32.6 0 1 1 -65.2 0" />
        <BevelFilter id={`${id}bevel`} blur={0.9} scale={2.2} strength={0.6} />
        <BevelFilter id={`${id}relief-f`} blur={0.5} scale={2.6} strength={0.9} exponent={14} />
      </defs>

      {/* reeded edge */}
      <circle cx="50" cy="50" r="49.5" fill="#5e400e" />
      <g stroke="#f7dc8e" strokeWidth="0.9" opacity="0.6">
        {reeds.map((_, i) => {
          const a = (i / reeds.length) * Math.PI * 2;
          return (
            <line key={i} x1={(50 + 47.2 * Math.cos(a)).toFixed(2)} y1={(50 + 47.2 * Math.sin(a)).toFixed(2)} x2={(50 + 49.4 * Math.cos(a)).toFixed(2)} y2={(50 + 49.4 * Math.sin(a)).toFixed(2)} />
          );
        })}
      </g>
      {/* raised rim */}
      <circle cx="50" cy="50" r="47" fill={`url(#${id}rim)`} filter={`url(#${id}bevel)`} />
      {/* recessed field */}
      <circle cx="50" cy="50" r="41.5" fill={`url(#${id}field)`} />
      <circle cx="50" cy="50" r="41.5" fill="none" stroke="#5e400e" strokeWidth="0.8" opacity="0.7" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#fff0b8" strokeWidth="0.35" opacity="0.5" strokeDasharray="40 30" transform="rotate(200 50 50)" />
      {/* beaded ring */}
      <g fill={`url(#${id}relief)`}>
        {Array.from({length: 60}).map((_, i) => {
          const a = (i / 60) * Math.PI * 2;
          return <circle key={i} cx={(50 + 39 * Math.cos(a)).toFixed(2)} cy={(50 + 39 * Math.sin(a)).toFixed(2)} r="0.75" />;
        })}
      </g>
      {/* legend */}
      <text
        fill="#5a3c0c"
        style={{fontFamily: 'var(--font-cinzel), Cinzel, serif', fontSize: 5, letterSpacing: 1.55, fontWeight: 700}}
      >
        <textPath href={`#${id}legend`} startOffset="0">{legend}</textPath>
      </text>
      <text
        fill="#fff1c0"
        opacity="0.5"
        transform="translate(-0.25 -0.35)"
        style={{fontFamily: 'var(--font-cinzel), Cinzel, serif', fontSize: 5, letterSpacing: 1.55, fontWeight: 700}}
      >
        <textPath href={`#${id}legend`} startOffset="0">{legend}</textPath>
      </text>
      <circle cx="50" cy="50" r="28.5" fill="none" stroke="#6b4a12" strokeWidth="0.5" opacity="0.8" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#fff0b8" strokeWidth="0.3" opacity="0.45" />

      {/* centre relief */}
      {face === 'value' ? (
        <g filter={`url(#${id}relief-f)`}>
          <text
            x="50"
            y={caption ? 54 : 57.5}
            textAnchor="middle"
            fill={`url(#${id}relief)`}
            style={{fontFamily: 'var(--font-cinzel), Cinzel, serif', fontSize: 19, fontWeight: 700, letterSpacing: -0.4}}
          >
            {value}
          </text>
          {caption && (
            <text x="50" y="63.5" textAnchor="middle" fill={`url(#${id}relief)`} style={{fontFamily: 'var(--font-cinzel), Cinzel, serif', fontSize: 4.6, fontWeight: 700, letterSpacing: 1.4}}>
              {caption}
            </text>
          )}
        </g>
      ) : (
        <g filter={`url(#${id}relief-f)`} fill="none" stroke={`url(#${id}relief)`} strokeLinejoin="miter">
          <path d="M50 30L67 62H33Z" strokeWidth="2.2" />
          <path d="M37.5 55h25M41.5 48h17" strokeWidth="0.9" />
          <path d="M42.5 42Q50 35.5 57.5 42Q50 48.5 42.5 42Z" strokeWidth="1.5" />
          <circle cx="50" cy="42" r="2.3" fill={`url(#${id}relief)`} stroke="none" />
        </g>
      )}
      {/* lamp highlight */}
      <circle cx="50" cy="50" r="47" fill={`url(#${id}spec)`} style={{mixBlendMode: 'screen'}} />
    </svg>
  );
}
