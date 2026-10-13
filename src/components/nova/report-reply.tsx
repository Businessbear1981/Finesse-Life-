'use client';

// "Report this response" for anything Nova wrote (Apple 1.2 / 5.1.2, Google Play AI-generated content policy).
// POST /api/moderation/report {target_kind: 'nova_reply', target_id, reason, note}. The reply text goes in
// `note` (content_reports.note holds 500 characters) so staff can see what Nova said. Honest outcome only:
// a server without the endpoint says so and gives the support email.

import {useState} from 'react';
import './request-card.css';

const REASONS: Array<{reason: string; label: string}> = [
  {reason: 'other', label: 'Wrong or misleading'},
  {reason: 'hate', label: 'Offensive or hateful'},
  {reason: 'harassment', label: 'Rude or abusive'},
  {reason: 'sexual', label: 'Sexual content'},
  {reason: 'illegal', label: 'Unsafe or illegal advice'},
];

export const REPORT_NOTE_MAX = 500;
const SUPPORT = 'support@finesselife.vip';

export function reportNote(label: string, text: string) {
  return `${label} — Nova said: ${text.replace(/\s+/g, ' ').trim()}`.slice(0, REPORT_NOTE_MAX);
}

export function outcomeText(status: number): {ok: boolean; text: string} {
  if (status >= 200 && status < 300) return {ok: true, text: 'Reported. Thank you — the house reviews reports within 24 hours.'};
  if (status === 409) return {ok: true, text: 'You’ve already reported this reply. The house is reviewing it.'};
  if (status === 0) return {ok: false, text: 'Offline — the report wasn’t sent. Try again when connected.'};
  if (status === 401) return {ok: false, text: 'Sign in to report. Nothing was sent.'};
  if (status === 429) return {ok: false, text: `Too many reports just now. Try again later, or email ${SUPPORT}.`};
  if (status === 404 || status === 405) return {ok: false, text: `Reporting isn’t open on the server yet. Email ${SUPPORT} and we’ll act within 24 hours.`};
  return {ok: false, text: `The report couldn’t be sent. Email ${SUPPORT} instead.`};
}

export function ReportReply({targetId, text}: {targetId: string; text: string}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ok: boolean; text: string} | null>(null);

  const send = async (reason: string, label: string) => {
    setBusy(true);
    let status = 0;
    try {
      const res = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({target_kind: 'nova_reply', target_id: targetId.slice(0, 200), reason, note: reportNote(label, text)}),
      });
      status = res.status;
    } catch { status = 0; }
    const o = outcomeText(status);
    setOut(o); setBusy(false);
    if (o.ok) setOpen(false);
  };

  if (out?.ok) return <p className="nr-fine" role="status" style={{color: 'var(--ah-ok, #7ee2b8)'}}>{out.text}</p>;
  return (
    <div className="nr-report">
      <button type="button" className="nr-report-btn" aria-expanded={open} onClick={() => { setOpen((v) => !v); setOut(null); }}>
        {open ? 'Cancel report' : 'Report this response'}
      </button>
      {open && (
        <div role="group" aria-label="Why are you reporting this reply?">
          <p className="nr-fine" style={{margin: '4px 0 8px'}}>What’s wrong with this reply?</p>
          <div className="nr-acts" style={{marginTop: 0}}>
            {REASONS.map((r) => (
              <button key={r.label} type="button" className="nr-btn" disabled={busy} onClick={() => void send(r.reason, r.label)}>{r.label}</button>
            ))}
          </div>
        </div>
      )}
      {out && !out.ok && <p className="nr-err" role="alert">{out.text}</p>}
    </div>
  );
}
