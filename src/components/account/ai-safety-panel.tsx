'use client';

// "AI & safety" on /account (Apple 1.2 + 5.1.2(i), Google Play UGC / AI-generated content / Data safety):
//   · who processes Nova's prompts and photos (Anthropic, through Vercel AI Gateway — src/lib/ai.ts)
//   · each consent the member gave, with Withdraw (DELETE /api/account/consents?kind=…)
//   · the member's own reports and where each stands (GET /api/moderation/reports)
//   · members they blocked, with Unblock (GET /api/moderation/blocks, DELETE /api/moderation/block)
// The app's twin is mobile/src/components/account/SafetyPanel.tsx.
import Link from 'next/link';
import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {AI_PROCESSOR, type Consent, type ConsentKind} from '@/lib/consents';
import {REPORT_REASON_LABELS, type ReportKind} from '@/lib/moderation';
import {readBlocks, readMyReports, safetyFailure, unblockMember, type MyReport} from '@/lib/moderation-client';

const CONSENT_COPY: Record<ConsentKind, {title: string; body: string; after: string}> = {
  ai_processing: {
    title: 'Nova may send what I type to the AI provider',
    body: `What you type to Nova goes to ${AI_PROCESSOR} to write the reply.`,
    after: 'Withdrawn. Nova won’t send anything until you agree again — she’ll ask before your next message.',
  },
  photo_ai: {
    title: 'Nova may send photos I choose to the AI provider',
    body: `Photos you ask Nova or the Camera to read go to ${AI_PROCESSOR}.`,
    after: 'Withdrawn. No photo goes to the AI provider until you agree again.',
  },
  // A confirmation, not a permission to process anything — shown, not withdrawable (delete the account instead).
  age_18: {
    title: 'I confirmed I am 18 or older',
    body: 'Recorded when you first signed in to the app.',
    after: '',
  },
};

const KIND_NOUN: Record<ReportKind, string> = {
  post: 'Lounge post', vip_post: 'VIP post', profile: 'Profile', listing: 'Exchange listing', club_table: 'Game Room table',
  outing: 'Outing', look: 'Wardrobe look', nova_reply: 'Nova reply',
};

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
};

function Block({title, children}: {title: string; children: ReactNode}) {
  return (
    <div className="pt-4 mt-4" style={{borderTop: '1px solid rgba(201,169,97,0.08)'}}>
      <h3 className="font-label text-[8px] tracking-[0.3em] uppercase mb-2" style={{color: 'rgba(201,169,97,0.45)'}}>{title}</h3>
      {children}
    </div>
  );
}

const muted = {color: 'rgba(244,232,208,0.55)'};
const btn = 'shrink-0 min-h-[44px] px-4 font-label text-[9px] tracking-[0.25em] uppercase disabled:opacity-30';

type Load<T> = {state: 'loading'} | {state: 'error'; text: string} | {state: 'ok'; data: T};

export function AiSafetyPanel() {
  const [consents, setConsents] = useState<Load<Consent[]>>({state: 'loading'});
  const [reports, setReports] = useState<Load<MyReport[]>>({state: 'loading'});
  const [blocks, setBlocks] = useState<Load<Array<{member_id: string; name: string; blocked_at: string}>>>({state: 'loading'});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ok: boolean; text: string} | null>(null);

  const loadConsents = useCallback(async () => {
    try {
      const res = await fetch('/api/account/consents', {cache: 'no-store'});
      const body = (await res.json().catch(() => ({}))) as {consents?: Consent[]};
      setConsents(res.ok ? {state: 'ok', data: body.consents ?? []} : {state: 'error', text: 'Your consents couldn’t load just now.'});
    } catch {
      setConsents({state: 'error', text: 'The house line is down.'});
    }
  }, []);
  const loadReports = useCallback(async () => {
    const r = await readMyReports();
    setReports(r.ok ? {state: 'ok', data: r.body.reports ?? []} : {state: 'error', text: safetyFailure(r, '')});
  }, []);
  const loadBlocks = useCallback(async () => {
    const r = await readBlocks();
    setBlocks(r.ok ? {state: 'ok', data: r.body.blocks ?? []} : {state: 'error', text: safetyFailure(r, '')});
  }, []);
  useEffect(() => {
    // Loads after mount (each setter runs once its request answers).
    void Promise.resolve().then(() => Promise.all([loadConsents(), loadReports(), loadBlocks()]));
  }, [loadConsents, loadReports, loadBlocks]);

  const withdraw = async (kind: ConsentKind) => {
    setBusy(`c:${kind}`); setNote(null);
    try {
      const res = await fetch(`/api/account/consents?kind=${encodeURIComponent(kind)}`, {method: 'DELETE'});
      if (!res.ok) { setNote({ok: false, text: 'That couldn’t be withdrawn just now. Nothing was changed.'}); return; }
      try { window.localStorage.removeItem(`finesse_consent_${kind}`); } catch { /* storage blocked */ }
      setNote({ok: true, text: CONSENT_COPY[kind].after});
      await loadConsents();
    } catch {
      setNote({ok: false, text: 'The house line is down. Nothing was changed.'});
    } finally {
      setBusy(null);
    }
  };
  const unblock = async (id: string, name: string) => {
    setBusy(`b:${id}`); setNote(null);
    const r = await unblockMember(id);
    setBusy(null);
    if (!r.ok) { setNote({ok: false, text: safetyFailure(r)}); return; }
    setNote({ok: true, text: `${name} is unblocked. You’ll see each other’s posts, looks, listings and profile again.`});
    await loadBlocks();
  };

  return (
    <section className="w-full px-5 py-5 mb-6" style={{border: '1px solid rgba(201,169,97,0.1)', background: 'rgba(10,4,6,0.6)'}} aria-labelledby="ai-safety-title">
      <h2 id="ai-safety-title" className="font-label text-[9px] tracking-[0.35em] uppercase mb-3" style={{color: 'rgba(201,169,97,0.5)'}}>AI &amp; safety</h2>

      <p className="font-body text-sm leading-relaxed" style={muted}>
        Nova is an AI concierge powered by <strong style={{color: '#F4E8D0'}}>Anthropic’s Claude</strong>. What you type — and any photo you
        ask Nova or the Camera to read — is sent to Anthropic through our AI gateway (Vercel AI Gateway) to write the reply.
        Nothing goes until you agree, and you can withdraw below. Replies can be wrong; nothing is booked unless a partner confirms it.{' '}
        <Link href="/privacy#ai" className="underline" style={{color: '#E8C87A'}}>How AI uses your data</Link>
      </p>

      {note && (
        <p role={note.ok ? 'status' : 'alert'} className="font-body text-xs italic mt-3" style={{color: note.ok ? '#E8C87A' : '#FF4D7D'}}>{note.text}</p>
      )}

      <Block title="Your consents">
        {consents.state === 'loading' ? <p className="font-body text-sm" style={muted}>Loading…</p>
          : consents.state === 'error' ? <p role="alert" className="font-body text-sm" style={{color: '#FF4D7D'}}>{consents.text}</p>
          : (
            <ul className="space-y-3">
              {(['ai_processing', 'photo_ai', 'age_18'] as ConsentKind[]).map((kind) => {
                const row = consents.data.find((c) => c.kind === kind);
                return (
                  <li key={kind} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm" style={{color: '#F4E8D0'}}>{CONSENT_COPY[kind].title}</p>
                      <p className="font-body text-xs" style={muted}>
                        {row ? `${kind === 'age_18' ? 'Confirmed' : 'Agreed'} ${when(row.accepted_at)} · ${CONSENT_COPY[kind].body}`
                          : kind === 'age_18' ? 'Not recorded yet — the app asks when you first sign in there.' : 'Not given — nothing is sent for this.'}
                      </p>
                    </div>
                    {row && kind !== 'age_18' && (
                      <button type="button" className={btn} onClick={() => void withdraw(kind)} disabled={busy !== null}
                        style={{border: '1px solid rgba(255,77,125,0.35)', color: '#FF4D7D'}} aria-label={`Withdraw: ${CONSENT_COPY[kind].title}`}>
                        {busy === `c:${kind}` ? 'Withdrawing…' : 'Withdraw'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </Block>

      <Block title="My reports">
        {reports.state === 'loading' ? <p className="font-body text-sm" style={muted}>Loading…</p>
          : reports.state === 'error' ? <p role="alert" className="font-body text-sm" style={{color: '#FF4D7D'}}>{reports.text}</p>
          : reports.data.length === 0 ? (
            <p className="font-body text-sm" style={muted}>You haven’t reported anything. Use the ••• menu on any post, look, listing, table or profile.</p>
          ) : (
            <ul className="space-y-2">
              {reports.data.map((r) => (
                <li key={r.id} className="font-body text-sm" style={{color: '#F4E8D0'}}>
                  {KIND_NOUN[r.target_kind] ?? 'Item'} · {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                  <span className="block text-xs" style={muted}>{when(r.created_at)} · {r.status_label}</span>
                </li>
              ))}
            </ul>
          )}
        <p className="font-body text-xs mt-2" style={muted}>The house reviews every report within 24 hours. The member you reported is never told who reported them.</p>
      </Block>

      <Block title="Blocked members">
        {blocks.state === 'loading' ? <p className="font-body text-sm" style={muted}>Loading…</p>
          : blocks.state === 'error' ? <p role="alert" className="font-body text-sm" style={{color: '#FF4D7D'}}>{blocks.text}</p>
          : blocks.data.length === 0 ? (
            <p className="font-body text-sm" style={muted}>You haven’t blocked anyone.</p>
          ) : (
            <ul className="space-y-2">
              {blocks.data.map((b) => (
                <li key={b.member_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm truncate" style={{color: '#F4E8D0'}}>{b.name}</p>
                    <p className="font-body text-xs" style={muted}>Blocked {when(b.blocked_at)}</p>
                  </div>
                  <button type="button" className={btn} onClick={() => void unblock(b.member_id, b.name)} disabled={busy !== null}
                    style={{border: '1px solid rgba(201,169,97,0.2)', color: 'rgba(201,169,97,0.8)'}} aria-label={`Unblock ${b.name}`}>
                    {busy === `b:${b.member_id}` ? 'Unblocking…' : 'Unblock'}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Block>
    </section>
  );
}
