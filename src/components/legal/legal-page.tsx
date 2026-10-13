import Link from 'next/link';
import type {ReactNode} from 'react';
import {AHDisplay, AHEyebrow, AHRoom, AHTopBar} from '@/components/after-hours';
import './legal.css';

// Shared shell for the public legal / help pages: /privacy, /terms, /support, /account/delete-info, /reset-password.
// Every one of these must stay in the public list in src/lib/supabase/middleware.ts.

export const SUPPORT_EMAIL = 'support@finesselife.vip';
export const LEGAL_UPDATED = '2026-10-12';

export type TocItem = {id: string; label: string};

export function LegalPage({eyebrow, title, intro, meta, note, toc, children}: {
  eyebrow: string; title: ReactNode; intro?: ReactNode; meta?: ReactNode; note?: ReactNode; toc?: TocItem[]; children: ReactNode;
}) {
  return (
    <AHRoom>
      <AHTopBar right={<Link href="/" className="ah-pill ah-pill-ghost" style={{minHeight: 44, fontSize: 13}}>Finesse home</Link>} />
      <main style={{maxWidth: 720, margin: '0 auto', paddingBottom: 60}}>
        <AHEyebrow>{eyebrow}</AHEyebrow>
        <AHDisplay size="m" style={{marginTop: 10}}>{title}</AHDisplay>
        {meta ? <p className="lg-meta">{meta}</p> : null}
        {intro ? <div className="lg-sec" style={{marginTop: 18}}>{intro}</div> : null}
        {note ? <div className="lg-note" role="note">{note}</div> : null}
        {toc && toc.length > 0 ? (
          <nav aria-label="On this page">
            <ul className="lg-toc">
              {toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.label}</a></li>)}
            </ul>
          </nav>
        ) : null}
        <div className="lg-body">{children}</div>
        <LegalFooter />
      </main>
    </AHRoom>
  );
}

export function Section({id, title, children}: {id: string; title: ReactNode; children: ReactNode}) {
  return (
    <section id={id} className="lg-sec" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      {children}
    </section>
  );
}

export function SupportEmail() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}

export function LegalFooter() {
  return (
    <nav className="lg-foot" aria-label="Legal and help">
      <Link href="/privacy">Privacy policy</Link>
      <Link href="/terms">Terms of membership</Link>
      <Link href="/support">Support</Link>
      <Link href="/account/delete-info">Delete your account</Link>
    </nav>
  );
}
