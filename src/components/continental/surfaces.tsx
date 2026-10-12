import type {CSSProperties, ElementType, ReactNode} from 'react';
import {brushedUri, cloudUri, grainUri, marbleUri, paperUri, sparkleUri, velvetUri} from './textures';

type SurfaceProps = {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Record<string, unknown>;

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');
/** `relative` unless the caller already positions the element (absolute/fixed/sticky). */
const pos = (className?: string) => (/\b(absolute|fixed|sticky)\b/.test(className ?? '') ? '' : 'relative');

/** Piano-black lacquer: deep warm black, a soft reflection band, a whisper of sparkle. */
export function LacquerSurface({as: Tag = 'div', className, style, children, sparkle = false, ...rest}: SurfaceProps & {sparkle?: boolean}) {
  return (
    <Tag
      className={cx(pos(className), 'isolate', className)}
      style={{
        backgroundColor: 'var(--lacquer)',
        backgroundImage: [
          sparkle ? sparkleUri(0.35) : null,
          'linear-gradient(162deg, rgb(255 255 255 / 5%) 0%, rgb(255 255 255 / 0%) 22%, rgb(255 255 255 / 0%) 60%, rgb(255 240 210 / 4%) 74%, rgb(255 255 255 / 0%) 86%)',
          'radial-gradient(120% 80% at 50% -10%, #1a1418 0%, var(--lacquer) 60%)',
        ].filter(Boolean).join(','),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Nero Marquina: black marble with white veins and cloudy depth. */
export function MarbleSurface({as: Tag = 'div', className, style, children, seed = 7, veinOpacity = 0.55, ...rest}: SurfaceProps & {seed?: number; veinOpacity?: number}) {
  return (
    <Tag className={cx(pos(className), 'isolate overflow-hidden', className)} style={{backgroundColor: 'var(--marble-ground)', ...style}} {...rest}>
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{backgroundImage: cloudUri(seed), backgroundSize: 'cover', opacity: 0.22}} />
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{backgroundImage: marbleUri(seed), backgroundSize: 'cover', backgroundPosition: 'center', opacity: veinOpacity}} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{background: 'linear-gradient(125deg, rgb(255 255 255 / 7%) 0%, rgb(255 255 255 / 0%) 30%, rgb(0 0 0 / 0%) 65%, rgb(0 0 0 / 45%) 100%)'}}
      />
      {children}
    </Tag>
  );
}

/**
 * Oxblood velvet. `channel` adds banquette channel-tufting (vertical pleats).
 * Velvet catches light at the crushed edges — highlights sit at the rims, not the centre.
 */
export function VelvetSurface({as: Tag = 'div', className, style, children, channel = false, ...rest}: SurfaceProps & {channel?: boolean}) {
  return (
    <Tag
      className={cx(pos(className), 'isolate overflow-hidden', className)}
      style={{
        backgroundColor: 'var(--oxblood-800)',
        backgroundImage: [
          velvetUri(),
          channel
            ? 'repeating-linear-gradient(90deg, rgb(0 0 0 / 60%) 0px, rgb(0 0 0 / 0%) 7px, rgb(214 120 140 / 16%) 20px, rgb(0 0 0 / 0%) 33px, rgb(0 0 0 / 60%) 40px)'
            : null,
          'radial-gradient(140% 90% at 50% 120%, rgb(0 0 0 / 0%) 30%, rgb(0 0 0 / 55%) 100%)',
          'radial-gradient(90% 70% at 30% 0%, #8c2238 0%, rgb(140 34 56 / 0%) 70%)',
          'linear-gradient(180deg, #5c1124 0%, #3b0915 100%)',
        ].filter(Boolean).join(','),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Ivory cotton card stock (calling cards, notecards). */
export function PaperSurface({as: Tag = 'div', className, style, children, ...rest}: SurfaceProps) {
  return (
    <Tag
      className={cx(pos(className), 'isolate', className)}
      style={{
        backgroundColor: 'var(--ivory)',
        backgroundImage: [
          paperUri(),
          'radial-gradient(120% 90% at 30% 10%, #fbf4e3 0%, rgb(251 244 227 / 0%) 60%)',
          'linear-gradient(180deg, #f6eedb 0%, #ece0c5 100%)',
        ].join(','),
        color: 'var(--ivory-ink)',
        boxShadow: '0 1px 0 rgb(255 255 255 / 60%) inset, 0 -1px 0 rgb(120 90 50 / 25%) inset, 0 14px 28px -12px rgb(0 0 0 / 85%), 0 3px 6px rgb(0 0 0 / 50%)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Brushed brass sheet — use for plates and plaques that need more area than <Plate>. */
export function BrassSurface({as: Tag = 'div', className, style, children, ...rest}: SurfaceProps) {
  return (
    <Tag className={cx('ct-brass relative isolate overflow-hidden', className)} style={style} {...rest}>
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{backgroundImage: brushedUri(0.5), backgroundSize: '100% 100%', mixBlendMode: 'overlay', opacity: 0.6}} />
      {children}
    </Tag>
  );
}

/** Smoked mirror: dark glass with a cool reflection and grain. */
export function SmokedMirror({as: Tag = 'div', className, style, children, ...rest}: SurfaceProps) {
  return (
    <Tag
      className={cx(pos(className), 'isolate', className)}
      style={{
        backgroundColor: '#0d0d10',
        backgroundImage: [
          grainUri(0.05),
          'linear-gradient(118deg, rgb(255 255 255 / 0%) 20%, rgb(220 225 235 / 7%) 36%, rgb(255 255 255 / 0%) 48%)',
          'radial-gradient(100% 100% at 50% 0%, #1b1a20 0%, #0b0a0d 80%)',
        ].join(','),
        boxShadow: 'inset 0 0 0 1px rgb(201 169 97 / 22%), inset 0 0 40px rgb(0 0 0 / 70%)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
