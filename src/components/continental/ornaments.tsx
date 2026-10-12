import {useId, type CSSProperties, type ReactNode} from 'react';
import {rosettePath, wavePaths} from './textures';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

/* ─── Shared brass gradient for SVG strokes/fills ────────────────────────── */
export function BrassGradientDefs({id, angle = 90}: {id: string; angle?: number}) {
  return (
    <linearGradient id={id} gradientTransform={`rotate(${angle} 0.5 0.5)`}>
      <stop offset="0" stopColor="#8a6a2e" />
      <stop offset="0.28" stopColor="#f3dc9c" />
      <stop offset="0.5" stopColor="#b8924a" />
      <stop offset="0.72" stopColor="#ecd08e" />
      <stop offset="1" stopColor="#7a5a26" />
    </linearGradient>
  );
}

/* ─── Corner bracket — stepped deco corner ───────────────────────────────── */
export function CornerBracket({size = 22, className, style}: {size?: number; className?: string; style?: CSSProperties}) {
  const id = useId();
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className={className} style={style}>
      <defs><BrassGradientDefs id={id} angle={45} /></defs>
      <path d="M1 23V7h3V4h3V1h16" fill="none" stroke={`url(#${id})`} strokeWidth="1.2" />
      <path d="M5 23V11h3V8h3V5h12" fill="none" stroke={`url(#${id})`} strokeWidth="0.6" opacity="0.7" />
      <rect x="1" y="1" width="2.4" height="2.4" transform="rotate(45 2.2 2.2)" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * DecoFrame — hairline double keyline with stepped brass corners.
 * Wrap any content; it adds no background of its own.
 */
export function DecoFrame({
  children,
  className,
  style,
  corners = true,
  tone = 'brass',
  inset = 4,
  as: Tag = 'div',
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  corners?: boolean;
  tone?: 'brass' | 'ivory' | 'dim';
  inset?: number;
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
}) {
  const line = tone === 'ivory' ? 'rgb(30 20 12 / 40%)' : tone === 'dim' ? 'rgb(201 169 97 / 22%)' : 'rgb(201 169 97 / 50%)';
  const line2 = tone === 'ivory' ? 'rgb(30 20 12 / 22%)' : tone === 'dim' ? 'rgb(201 169 97 / 12%)' : 'rgb(201 169 97 / 24%)';
  return (
    <Tag className={cx('relative', className)} style={{border: `1px solid ${line}`, ...style}}>
      <span aria-hidden className="pointer-events-none absolute" style={{inset, border: `1px solid ${line2}`}} />
      {corners && (
        <>
          <CornerBracket className="pointer-events-none absolute -left-[3px] -top-[3px]" />
          <CornerBracket className="pointer-events-none absolute -right-[3px] -top-[3px]" style={{transform: 'scaleX(-1)'}} />
          <CornerBracket className="pointer-events-none absolute -bottom-[3px] -left-[3px]" style={{transform: 'scaleY(-1)'}} />
          <CornerBracket className="pointer-events-none absolute -bottom-[3px] -right-[3px]" style={{transform: 'scale(-1,-1)'}} />
        </>
      )}
      <div className="relative">{children}</div>
    </Tag>
  );
}

/* ─── Divider — gilded rule with a centre lozenge ───────────────────────── */
export function Divider({label, className, tone = 'brass'}: {label?: string; className?: string; tone?: 'brass' | 'ink'}) {
  const id = useId();
  const ink = tone === 'ink';
  const stroke = ink ? 'var(--ivory-ink-soft)' : `url(#${id})`;
  return (
    <div className={cx('flex items-center gap-3', className)} role={label ? undefined : 'separator'}>
      <svg aria-hidden className="h-3 flex-1" viewBox="0 0 100 12" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id}>
            <stop offset="0" stopColor="#c9a961" stopOpacity="0" />
            <stop offset="0.6" stopColor="#c9a961" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f0d48e" />
          </linearGradient>
        </defs>
        <line x1="0" y1="6" x2="100" y2="6" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="40" y1="9" x2="100" y2="9" stroke={stroke} strokeWidth="0.6" opacity="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <DividerLozenge ink={ink} />
      {label && (
        <>
          <span className={cx('whitespace-nowrap font-label text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.42em]', ink ? 'text-[var(--ivory-ink-soft)]' : 'text-[var(--ct-text-soft)]')}>{label}</span>
          <DividerLozenge ink={ink} />
        </>
      )}
      <svg aria-hidden className="h-3 flex-1 -scale-x-100" viewBox="0 0 100 12" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${id}r`}>
            <stop offset="0" stopColor="#c9a961" stopOpacity="0" />
            <stop offset="0.6" stopColor="#c9a961" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f0d48e" />
          </linearGradient>
        </defs>
        <line x1="0" y1="6" x2="100" y2="6" stroke={ink ? stroke : `url(#${id}r)`} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="40" y1="9" x2="100" y2="9" stroke={ink ? stroke : `url(#${id}r)`} strokeWidth="0.6" opacity="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function DividerLozenge({ink}: {ink: boolean}) {
  const id = useId();
  return (
    <svg aria-hidden width="26" height="12" viewBox="0 0 26 12" className="shrink-0">
      <defs><BrassGradientDefs id={id} angle={90} /></defs>
      <path d="M13 0L19 6L13 12L7 6Z" fill={ink ? 'var(--ivory-ink-soft)' : `url(#${id})`} />
      <path d="M13 3L16 6L13 9L10 6Z" fill={ink ? 'var(--ivory)' : '#1a1206'} opacity="0.9" />
      <circle cx="3" cy="6" r="1.2" fill={ink ? 'var(--ivory-ink-soft)' : `url(#${id})`} />
      <circle cx="23" cy="6" r="1.2" fill={ink ? 'var(--ivory-ink-soft)' : `url(#${id})`} />
    </svg>
  );
}

/* ─── Sunburst — deco rays fanning from a point ─────────────────────────── */
export function Sunburst({
  rays = 36,
  className,
  style,
  origin = 'center',
  opacity = 0.5,
}: {
  rays?: number;
  className?: string;
  style?: CSSProperties;
  origin?: 'center' | 'bottom';
  opacity?: number;
}) {
  const id = useId();
  const cy = origin === 'bottom' ? 100 : 50;
  const span = origin === 'bottom' ? Math.PI : Math.PI * 2;
  const start = origin === 'bottom' ? Math.PI : 0;
  const wedges = [];
  for (let i = 0; i < rays; i++) {
    const a0 = start + (i / rays) * span;
    const a1 = start + ((i + 0.42) / rays) * span;
    const R = 150;
    const p = (a: number) => `${(50 + R * Math.cos(a)).toFixed(2)} ${(cy + R * Math.sin(a)).toFixed(2)}`;
    wedges.push(<path key={i} d={`M50 ${cy}L${p(a0)}L${p(a1)}Z`} />);
  }
  return (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} style={{opacity, ...style}}>
      <defs>
        <radialGradient id={id} cx="50" cy={cy} r="75" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3dc9c" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#c9a961" stopOpacity="0.16" />
          <stop offset="1" stopColor="#c9a961" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill={`url(#${id})`}>{wedges}</g>
    </svg>
  );
}

/* ─── Stepped fan — concentric deco arcs (for arches, headers) ──────────── */
export function SteppedFan({className, style, steps = 6}: {className?: string; style?: CSSProperties; steps?: number}) {
  const id = useId();
  return (
    <svg aria-hidden viewBox="0 0 200 100" className={className} style={style}>
      <defs><BrassGradientDefs id={id} angle={0} /></defs>
      {Array.from({length: steps}).map((_, i) => {
        const r = 96 - i * (80 / steps);
        return <path key={i} d={`M${100 - r} 100A${r} ${r} 0 0 1 ${100 + r} 100`} fill="none" stroke={`url(#${id})`} strokeWidth={i === 0 ? 1.4 : 0.7} opacity={1 - i * 0.12} />;
      })}
      {Array.from({length: 13}).map((_, i) => {
        const a = Math.PI + (i / 12) * Math.PI;
        const r0 = 96 - (steps - 1) * (80 / steps);
        return (
          <line key={`r${i}`} x1={(100 + r0 * Math.cos(a)).toFixed(2)} y1={(100 + r0 * Math.sin(a)).toFixed(2)} x2={(100 + 96 * Math.cos(a)).toFixed(2)} y2={(100 + 96 * Math.sin(a)).toFixed(2)} stroke={`url(#${id})`} strokeWidth="0.5" opacity="0.6" />
        );
      })}
    </svg>
  );
}

/* ─── Guilloché — banknote rosette or band ───────────────────────────────── */
const ROSETTES = Array.from({length: 7}).map((_, i) => rosettePath(46 - i * 4.2, 18 + (i % 3) * 6, 0.24 + i * 0.03, 1, i * 0.5));

export function GuillocheRosette({className, style, color = '#c9a961', strokeWidth = 0.35}: {className?: string; style?: CSSProperties; color?: string; strokeWidth?: number}) {
  return (
    <svg aria-hidden viewBox="-50 -50 100 100" className={className} style={style}>
      <g fill="none" stroke={color} strokeWidth={strokeWidth}>
        {ROSETTES.map((d, i) => (
          <path key={i} d={d} opacity={0.85 - i * 0.08} transform={`rotate(${i * 7})`} />
        ))}
      </g>
    </svg>
  );
}

const BAND = wavePaths(400, 24, 7, 22);
export function GuillocheBand({className, style, color = '#c9a961', strokeWidth = 0.45}: {className?: string; style?: CSSProperties; color?: string; strokeWidth?: number}) {
  return (
    <svg aria-hidden viewBox="0 0 400 24" preserveAspectRatio="none" className={className} style={style}>
      <g fill="none" stroke={color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke">
        {BAND.map((d, i) => (
          <path key={i} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}

/** Generic named export for the design system list. */
export function Guilloche({variant = 'rosette', ...p}: {variant?: 'rosette' | 'band'; className?: string; style?: CSSProperties; color?: string; strokeWidth?: number}) {
  return variant === 'band' ? <GuillocheBand {...p} /> : <GuillocheRosette {...p} />;
}

/* ─── Chevron inlay strip ────────────────────────────────────────────────── */
export function ChevronInlay({className, style}: {className?: string; style?: CSSProperties}) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        height: 10,
        backgroundImage:
          'linear-gradient(135deg, transparent 37%, rgb(201 169 97 / 70%) 37%, rgb(240 212 142 / 85%) 45%, transparent 45%), linear-gradient(225deg, transparent 37%, rgb(201 169 97 / 70%) 37%, rgb(240 212 142 / 85%) 45%, transparent 45%)',
        backgroundSize: '14px 10px',
        backgroundRepeat: 'repeat-x',
        opacity: 0.75,
        ...style,
      }}
    />
  );
}

/**
 * Sigil — the house hallmark: an eye within a stepped pyramid inside a ring.
 * Use sparingly (one per screen at most), small, as a maker's mark.
 */
export function Sigil({size = 28, className, style, tone = 'brass'}: {size?: number; className?: string; style?: CSSProperties; tone?: 'brass' | 'ink' | 'wax'}) {
  const id = useId();
  const fill = tone === 'ink' ? 'var(--ivory-ink-soft)' : tone === 'wax' ? 'rgb(255 214 200 / 55%)' : `url(#${id})`;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 40 40" className={className} style={style}>
      <defs><BrassGradientDefs id={id} angle={60} /></defs>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke={fill} strokeWidth="0.9" />
      <circle cx="20" cy="20" r="16.4" fill="none" stroke={fill} strokeWidth="0.4" strokeDasharray="0.6 1.4" />
      {/* stepped pyramid */}
      <path d="M20 7.5L31 30H9Z" fill="none" stroke={fill} strokeWidth="1" strokeLinejoin="miter" />
      <path d="M11.6 25h16.8M13.8 20.5h12.4" stroke={fill} strokeWidth="0.45" />
      {/* eye */}
      <path d="M14.6 17.2Q20 12.6 25.4 17.2Q20 21.8 14.6 17.2Z" fill="none" stroke={fill} strokeWidth="0.8" />
      <circle cx="20" cy="17.2" r="1.6" fill={fill} />
      {/* rays */}
      {[-50, -30, -10, 10, 30, 50].map((a) => (
        <line key={a} x1="20" y1="10.6" x2={(20 + 4.2 * Math.sin((a * Math.PI) / 180)).toFixed(2)} y2={(10.6 - 4.2 * Math.cos((a * Math.PI) / 180)).toFixed(2)} stroke={fill} strokeWidth="0.4" />
      ))}
    </svg>
  );
}
