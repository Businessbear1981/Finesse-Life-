import type {CSSProperties, ElementType, ReactNode} from 'react';

/**
 * FoilSheen — a slow highlight that sweeps across its child every few seconds,
 * like lamplight crossing gold foil. Disabled under prefers-reduced-motion (globals.css).
 */
export function FoilSheen({as: Tag = 'span', children, delay = 1.2, className, style}: {as?: ElementType; children: ReactNode; delay?: number; className?: string; style?: CSSProperties}) {
  return (
    <Tag className={['ct-sheen', className].filter(Boolean).join(' ')} style={{['--ct-sheen-delay' as string]: `${delay}s`, ...style}}>
      {children}
    </Tag>
  );
}
