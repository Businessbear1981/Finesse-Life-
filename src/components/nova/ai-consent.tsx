'use client';

// One-time AI disclosure + consent before the first message to Nova (Apple 5.1.2(i), Google Play AI policy).
// Stored server-side (POST /api/account/consents {kind:'ai_processing'} → member_consents) and cached in
// localStorage so the sheet shows once. Declining sends nothing.

import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import {AI_PROCESSOR, type ConsentKind} from '@/lib/consents';
import './request-card.css';

const LOCAL_KEY = (kind: ConsentKind) => `finesse_consent_${kind}`;

function readLocal(kind: ConsentKind) {
  try { return window.localStorage.getItem(LOCAL_KEY(kind)) !== null; } catch { return false; }
}
function writeLocal(kind: ConsentKind) {
  try { window.localStorage.setItem(LOCAL_KEY(kind), new Date().toISOString()); } catch { /* storage blocked */ }
}

/** `ensure(run)` runs `run` once the member has agreed, asking first if needed. Render <AIConsentSheet {...sheet} />. */
export function useAiConsent(kind: Extract<ConsentKind, 'ai_processing' | 'photo_ai'> = 'ai_processing') {
  const [given, setGiven] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = useRef<(() => void) | null>(null);

  useEffect(() => {
    let alive = true;
    if (readLocal(kind)) return; // cached on this browser — ensure() checks it directly
    fetch('/api/account/consents', {cache: 'no-store'})
      .then((r) => (r.ok ? r.json() : null))
      .then((d: {consents?: Array<{kind: string}>} | null) => {
        if (!alive) return;
        const has = !!d?.consents?.some((c) => c.kind === kind);
        if (has) writeLocal(kind);
        setGiven(has);
      })
      .catch(() => { if (alive) setGiven(false); });
    return () => { alive = false; };
  }, [kind]);

  const ensure = useCallback((run: () => void) => {
    if (given || readLocal(kind)) { run(); return; }
    next.current = run; setError(null); setOpen(true);
  }, [given, kind]);

  const accept = async () => {
    setBusy(true); setError(null);
    let status = 0;
    try {
      const res = await fetch('/api/account/consents', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({kind, platform: 'web'})});
      status = res.status;
    } catch { status = 0; }
    setBusy(false);
    if (status < 200 || status >= 300) {
      setError(status === 401 ? 'Sign in first — your agreement is kept with your account. Nothing was sent.' : 'Your agreement couldn’t be saved just now. Nothing was sent — try again.');
      return;
    }
    writeLocal(kind); setGiven(true); setOpen(false);
    const run = next.current; next.current = null;
    run?.();
  };
  const decline = () => { next.current = null; setOpen(false); };

  return {ensure, given, sheet: {open, busy, error, onAccept: () => void accept(), onDecline: decline}};
}

export type AIConsentSheetProps = {open: boolean; busy?: boolean; error?: string | null; onAccept: () => void; onDecline: () => void};

export function AIConsentSheet({open, busy, error, onAccept, onDecline}: AIConsentSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDecline(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDecline]);
  if (!open) return null;
  return (
    <div className="nr-scrim" onClick={onDecline}>
      <section className="nr-sheet" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title" onClick={(e) => e.stopPropagation()}>
        <p className="nr-eyebrow" style={{color: 'var(--nr-accent)'}}>Before you start</p>
        <h2 id="ai-consent-title" className="nr-sheet-title" style={{marginTop: 8}}>Nova is an AI.</h2>
        <ul style={{margin: '14px 0 0', paddingLeft: 18, display: 'grid', gap: 8, fontSize: 14.5, lineHeight: 1.55}}>
          <li>Nova is an AI concierge powered by {AI_PROCESSOR}. It is not a person.</li>
          <li>What you type — and the details from your rooms Nova needs to answer — is sent to Anthropic, through our AI gateway (Vercel), to write each reply.</li>
          <li>Don’t share sensitive information: passwords, card or bank numbers, health details.</li>
          <li>Replies can be wrong. Nothing is booked or bought unless you confirm it and a partner confirms it.</li>
        </ul>
        <p className="nr-fine" style={{fontSize: 13}}><Link href="/privacy#ai" style={{color: 'var(--nr-accent)'}}>How your data is used (Privacy policy)</Link></p>
        {error && <p className="nr-err" role="alert">{error}</p>}
        <div className="nr-acts" style={{flexDirection: 'column'}}>
          <button type="button" className="nr-btn nr-btn-solid" style={{minHeight: 48}} disabled={busy} onClick={onAccept} autoFocus>
            {busy ? 'One moment…' : 'I understand — continue'}
          </button>
          <button type="button" className="nr-btn" style={{minHeight: 48}} onClick={onDecline}>Not now — nothing is sent</button>
        </div>
      </section>
    </div>
  );
}
