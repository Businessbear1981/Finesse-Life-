import type {CSSProperties, ElementType, ReactNode} from 'react';
import {Divider} from './ornaments';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

/** Small signage caps — wayfinding, labels, ledger headings. */
export function Eyebrow({children, className, style, tone = 'soft'}: {children: ReactNode; className?: string; style?: CSSProperties; tone?: 'soft' | 'gilt' | 'ink'}) {
  return (
    <p
      className={cx(
        'font-label text-[10px] uppercase tracking-[0.42em]',
        tone === 'gilt' && 'ct-gilt',
        tone === 'soft' && 'text-[var(--ct-text-soft)]',
        tone === 'ink' && 'text-[var(--ivory-ink-soft)]',
        className,
      )}
      style={style}
    >
      {children}
    </p>
  );
}

/** Gold-leaf lettering. */
export function GiltText({as: Tag = 'span', children, className, style}: {as?: ElementType; children: ReactNode; className?: string; style?: CSSProperties}) {
  return (
    <Tag className={cx('ct-gilt', className)} style={style}>
      {children}
    </Tag>
  );
}

/**
 * EngravedHeading — the sign over a door. High-contrast caps, wide tracking, gold leaf,
 * an eyebrow above, an optional script line below and a gilded rule.
 */
export function EngravedHeading({
  eyebrow,
  title,
  script,
  as: Tag = 'h1',
  align = 'center',
  size = 'lg',
  rule = true,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  script?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  align?: 'center' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rule?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: 'text-[15px] tracking-[0.3em]',
    md: 'text-[22px] tracking-[0.26em] sm:text-[26px]',
    lg: 'text-[30px] tracking-[0.2em] sm:text-[40px] sm:tracking-[0.24em]',
    xl: 'text-[34px] tracking-[0.18em] sm:text-[56px] sm:tracking-[0.22em]',
  }[size];
  return (
    <div className={cx(align === 'center' ? 'text-center' : 'text-left', className)}>
      {eyebrow && <Eyebrow className={cx('mb-3', align === 'center' && 'mx-auto')}>{eyebrow}</Eyebrow>}
      <Tag className={cx('ct-gilt font-label font-semibold uppercase leading-[1.05]', sizes)} style={{paddingLeft: align === 'center' ? '0.2em' : undefined}}>
        {title}
      </Tag>
      {script && <p className="mt-2 font-display text-[17px] italic text-[var(--ct-text-soft)] sm:text-[19px]">{script}</p>}
      {rule && <Divider className={cx('mt-4', align === 'center' ? 'mx-auto max-w-[260px]' : 'max-w-[220px]')} />}
    </div>
  );
}
