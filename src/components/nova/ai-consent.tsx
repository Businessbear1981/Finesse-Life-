'use client';

// One-time AI disclosure + consent before the first use of any AI feature (Apple 5.1.2(i), Google Play AI policy).
// Stored server-side (POST /api/account/consents {kind} → member_consents) and cached in localStorage so the sheet
// shows once. Declining sends nothing.
//
// The server enforces it too: every AI route answers 403 {error:'consent_required', kind} without the member's
// consent (src/lib/ai-consent-gate.ts). <AIConsentHost/> (mounted once in app/providers.tsx) is the one place that
// answers both:
//   • ensureAiConsent(kind) / useAiGate() — call before a Nova button sends anything (asks first if needed);
//   • any same-origin /api/ request that comes back 403 consent_required — the host shows the sheet and, once the
//     member agrees, sends the same request again and hands its answer to the caller. "Not now" returns the 403.

import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import {AI_PROCESSOR, type ConsentKind} from '@/lib/consents';
import './request-card.css';

export type AIKind = Extract<ConsentKind, 'ai_processing' | 'photo_ai'>;

const LOCAL_KEY = (kind: ConsentKind) => `finesse_consent_${kind}`;

function readLocal(kind: ConsentKind) {
  try { return window.localStorage.getItem(LOCAL_KEY(kind)) !== null; } catch { return false; }
}
function writeLocal(kind: ConsentKind) {
  try { window.localStorage.setItem(LOCAL_KEY(kind), new Date().toISOString()); } catch { /* storage blocked */ }
}

/** Plain words when the member said "Not now" (or the house refused for want of consent). */
export const CONSENT_DECLINED_TEXT = 'Nova needs your OK before it can help with this. Nothing was sent.';

/** True when a JSON reply is the server's consent refusal. */
export const isConsentRefusal = (status: number, body: {error?: unknown} | null | undefined) => status === 403 && body?.error === 'consent_required';

async function postConsent(kind: AIKind): Promise<number> {
  try {
    const res = await fetch('/api/account/consents', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({kind, platform: 'web'})});
    return res.status;
  } catch { return 0; }
}

const saveError = (status: number) => status === 401
  ? 'Sign in first — your agreement is kept with your account. Nothing was sent.'
  : 'Your agreement couldn’t be saved just now. Nothing was sent — try again.';

// ─── The host (one per app) ─────────────────────────────────────────────────────────────────────────────

type Asker = (kind: AIKind) => Promise<boolean>;
let asker: Asker | null = null;

/** Ask through the mounted host; false when there is none. */
export function askForConsent(kind: AIKind): Promise<boolean> {
  return asker ? asker(kind) : Promise.resolve(false);
}

/** Has this member agreed to `kind`? This browser's record first, then the server. */
export async function hasAiConsent(kind: AIKind): Promise<boolean> {
  if (readLocal(kind)) return true;
  try {
    const res = await fetch('/api/account/consents', {cache: 'no-store'});
    if (!res.ok) return false;
    const d = (await res.json()) as {consents?: Array<{kind: string}>};
    const kinds = new Set((d.consents ?? []).map((c) => c.kind));
    (['ai_processing', 'photo_ai'] as const).forEach((k) => { if (kinds.has(k)) writeLocal(k); });
    return kinds.has(kind);
  } catch { return false; }
}

/** Resolves true once the member has agreed to everything `kind` needs (a photo read needs ai_processing too). */
export async function ensureAiConsent(kind: AIKind = 'ai_processing'): Promise<boolean> {
  const needed: AIKind[] = kind === 'photo_ai' ? ['ai_processing', 'photo_ai'] : ['ai_processing'];
  for (const k of needed) {
    if (!(await hasAiConsent(k)) && !(await askForConsent(k))) return false;
  }
  return true;
}

/** `gate(run, kind?)` runs `run` once the member has agreed. For Nova buttons. */
export function useAiGate() {
  return useCallback((run: () => void, kind: AIKind = 'ai_processing') => {
    void ensureAiConsent(kind).then((ok) => { if (ok) run(); });
  }, []);
}

function sameOriginApi(input: RequestInfo | URL): boolean {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const u = new URL(raw, window.location.href);
    return u.origin === window.location.origin && u.pathname.startsWith('/api/') && u.pathname !== '/api/account/consents';
  } catch { return false; }
}

/** Mount once (app/providers.tsx). Shows the sheet for every ask and every consent_required refusal. */
export function AIConsentHost() {
  const [open, setOpen] = useState<AIKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{kind: AIKind; resolve: (ok: boolean) => void} | null>(null);

  useEffect(() => {
    const ask: Asker = (kind) => new Promise<boolean>((resolve) => {
      pending.current?.resolve(false); // a newer ask replaces an unanswered one
      pending.current = {kind, resolve};
      setError(null); setOpen(kind);
    });
    asker = ask;

    // Any same-origin API call refused for want of consent → ask, then send the same request once more.
    const original = window.fetch;
    const patched: typeof window.fetch = async (input, init) => {
      const again = input instanceof Request ? input.clone() : input;
      let res = await original(input, init);
      for (let i = 0; i < 2 && res.status === 403 && sameOriginApi(input); i += 1) {
        const body = (await res.clone().json().catch(() => null)) as {error?: unknown; kind?: unknown} | null;
        if (!isConsentRefusal(res.status, body)) break;
        const kind: AIKind = body?.kind === 'photo_ai' ? 'photo_ai' : 'ai_processing';
        if (!(await ask(kind))) break;
        res = await original(again instanceof Request ? again.clone() : again, init);
      }
      return res;
    };
    window.fetch = patched;
    return () => {
      if (asker === ask) asker = null;
      if (window.fetch === patched) window.fetch = original;
    };
  }, []);

  const settle = useCallback((ok: boolean) => {
    const p = pending.current; pending.current = null;
    setOpen(null);
    p?.resolve(ok);
  }, []);
  const accept = async () => {
    if (!open) return;
    setBusy(true); setError(null);
    const status = await postConsent(open);
    setBusy(false);
    if (status < 200 || status >= 300) { setError(saveError(status)); return; }
    writeLocal(open);
    settle(true);
  };
  const decline = useCallback(() => settle(false), [settle]);

  return <AIConsentSheet open={!!open} kind={open ?? 'ai_processing'} busy={busy} error={error} onAccept={() => void accept()} onDecline={decline} />;
}

// ─── Per-component hook (the Concierge renders its own sheet) ───────────────────────────────────────────

/** `ensure(run)` runs `run` once the member has agreed, asking first if needed. Render <AIConsentSheet {...sheet} />. */
export function useAiConsent(kind: AIKind = 'ai_processing') {
  const [given, setGiven] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = useRef<(() => void) | null>(null);

  useEffect(() => {
    let alive = true;
    if (readLocal(kind)) return; // cached on this browser — ensure() checks it directly
    void hasAiConsent(kind).then((has) => { if (alive) setGiven(has); });
    return () => { alive = false; };
  }, [kind]);

  const ensure = useCallback((run: () => void) => {
    if (given || readLocal(kind)) { run(); return; }
    next.current = run; setError(null); setOpen(true);
  }, [given, kind]);

  const accept = async () => {
    setBusy(true); setError(null);
    const status = await postConsent(kind);
    setBusy(false);
    if (status < 200 || status >= 300) { setError(saveError(status)); return; }
    writeLocal(kind); setGiven(true); setOpen(false);
    const run = next.current; next.current = null;
    run?.();
  };
  const decline = () => { next.current = null; setOpen(false); };

  return {ensure, given, sheet: {open, kind, busy, error, onAccept: () => void accept(), onDecline: decline}};
}

export type AIConsentSheetProps = {open: boolean; kind?: AIKind; busy?: boolean; error?: string | null; onAccept: () => void; onDecline: () => void};

const COPY: Record<AIKind, {title: string; lines: string[]; agree: string}> = {
  ai_processing: {
    title: 'Nova is an AI.',
    lines: [
      `Nova is an AI concierge powered by ${AI_PROCESSOR}. It is not a person.`,
      'What you type — and the details from your rooms Nova needs to answer — is sent to Anthropic, through our AI gateway (Vercel), to write each reply.',
      'Don’t share sensitive information: passwords, card or bank numbers, health details.',
      'Replies can be wrong. Nothing is booked or bought unless you confirm it and a partner confirms it.',
    ],
    agree: 'I understand — continue',
  },
  photo_ai: {
    title: 'Nova will look at this photo.',
    lines: [
      `To read a photo, Finesse sends it to ${AI_PROCESSOR}, through our AI gateway, which describes it for Nova. Only the photo you choose is sent, and only when you ask.`,
      'Avoid photos that show other people’s faces, documents or anything private.',
      'The read can be wrong — you review it before anything is saved.',
    ],
    agree: 'Agree and read the photo',
  },
};

export function AIConsentSheet({open, kind = 'ai_processing', busy, error, onAccept, onDecline}: AIConsentSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDecline(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDecline]);
  if (!open) return null;
  const c = COPY[kind];
  return (
    <div className="nr-scrim" onClick={onDecline}>
      <section className="nr-sheet" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title" onClick={(e) => e.stopPropagation()}>
        <p className="nr-eyebrow" style={{color: 'var(--nr-accent)'}}>Before you start</p>
        <h2 id="ai-consent-title" className="nr-sheet-title" style={{marginTop: 8}}>{c.title}</h2>
        <ul style={{margin: '14px 0 0', paddingLeft: 18, display: 'grid', gap: 8, fontSize: 14.5, lineHeight: 1.55}}>
          {c.lines.map((l) => <li key={l}>{l}</li>)}
        </ul>
        <p className="nr-fine" style={{fontSize: 13}}><Link href="/privacy#ai" style={{color: 'var(--nr-accent)'}}>How your data is used (Privacy policy)</Link></p>
        {error && <p className="nr-err" role="alert">{error}</p>}
        <div className="nr-acts" style={{flexDirection: 'column'}}>
          <button type="button" className="nr-btn nr-btn-solid" style={{minHeight: 48}} disabled={busy} onClick={onAccept} autoFocus>
            {busy ? 'One moment…' : c.agree}
          </button>
          <button type="button" className="nr-btn" style={{minHeight: 48}} onClick={onDecline}>Not now — nothing is sent</button>
        </div>
      </section>
    </div>
  );
}
