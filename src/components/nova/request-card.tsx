'use client';

// Nova request cards — one UI for the orchestrator hub across every web room.
//   <RequestCard>     a request at any status: Confirm / Not now (drafted), Working, result + Done (ready), Try again (failed)
//   <RequestResult>   scout/stylist items, price-hunter table, procurement path, planner plan (always "Not booked")
//   <NovaAction>      one button = POST /api/nova/requests {confirm:true}; renders the card it produced
//   <RequestsSheet>   "Your requests" (GET /api/nova/requests) with status chips and the same actions
// Honesty: nothing here buys or books. Plans say "Not booked"; links open the retailer, nothing more.

import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {
  actionsFor, formatCents, KIND_LABEL, requestErrorText, resultView, sourceLabel, STATUS_LABEL, storedErrorText,
  type ItemView, type NovaRequest, type RequestStatus,
} from '@/lib/nova-request-view';
import {closeRequest, confirmRequest, createRequest, listRequests, type NewRequest} from './requests-api';
import './request-card.css';

type AccentProps = {accent?: string};
const vars = (accent?: string) => (accent ? ({'--nr-accent': accent} as CSSProperties) : undefined);

export function StatusChip({status}: {status: RequestStatus}) {
  return <span className="nr-chip" data-status={status}>{status === 'running' && <i className="nr-spin" aria-hidden />}{STATUS_LABEL[status]}</span>;
}

/* ─── Result renderers ─── */

function ItemRows({items, itemActions}: {items: ItemView[]; itemActions?: (item: ItemView) => ReactNode}) {
  return (
    <ul className="nr-items">
      {items.map((it, i) => (
        <li key={`${it.title}-${i}`} className="nr-item">
          {it.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.image_url} alt="" className="nr-thumb" loading="lazy" referrerPolicy="no-referrer" />
          ) : <span className="nr-thumb nr-thumb-empty" aria-hidden>{(it.brand || it.title)[0]?.toUpperCase()}</span>}
          <div className="nr-item-body">
            <span className="nr-item-title">{it.title}</span>
            <span className="nr-item-sub">{[it.brand, sourceLabel(it.source), it.partner].filter(Boolean).join(' · ')}</span>
            {(it.url || itemActions) && (
              <span className="nr-item-acts">
                {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer nofollow" className="nr-link">View ↗</a>}
                {itemActions?.(it)}
              </span>
            )}
          </div>
          <span className="nr-price">{formatCents(it.price_cents)}</span>
        </li>
      ))}
    </ul>
  );
}

export function RequestResult({request, itemActions}: {request: NovaRequest; itemActions?: (item: ItemView) => ReactNode}) {
  const view = resultView(request.result);
  switch (view.type) {
    case 'items':
      return (
        <div className="nr-result">
          <ItemRows items={view.items} itemActions={itemActions} />
          {view.items.some((i) => i.source === 'nova') && <p className="nr-fine">Nova’s picks are suggestions — prices and stock are the retailer’s to confirm.</p>}
        </div>
      );
    case 'prices':
      return (
        <div className="nr-result nr-table-wrap">
          <table className="nr-table">
            <thead><tr><th scope="col">Where</th><th scope="col">Price</th><th scope="col">You save</th></tr></thead>
            <tbody>
              {view.prices.map((p, i) => (
                <tr key={`${p.source}-${i}`}>
                  <td>
                    {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="nr-link">{p.source} ↗</a> : p.source}
                    {p.members && <span className="nr-members">Members</span>}
                  </td>
                  <td className="nr-num">{formatCents(p.price_cents)}</td>
                  <td className="nr-num">{p.savings_cents > 0 ? formatCents(p.savings_cents) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="nr-fine">Market prices Nova found. Check the retailer before you buy.</p>
        </div>
      );
    case 'path': {
      const p = view.path;
      const how = p.method === 'scale' ? 'Through Scale (group buy)' : p.method === 'partner' ? `Through ${p.partner ?? 'a partner'}` : p.method === 'direct' ? 'Buy direct' : 'Sourced by hand';
      return (
        <div className="nr-result nr-path">
          <span className="nr-path-how">{how}</span>
          {p.instructions && <p className="nr-text">{p.instructions}</p>}
          <div className="nr-path-row">
            {p.savings_cents > 0 && <span>Est. savings <b className="nr-num">{formatCents(p.savings_cents)}</b></span>}
            {p.token && <span>Code <code className="nr-code">{p.token}</code></span>}
            {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="nr-link">Open {p.partner ?? 'partner'} ↗</a>}
          </div>
          <p className="nr-fine">Nova suggested the route. Nothing has been bought.</p>
        </div>
      );
    }
    case 'plan':
      return (
        <div className="nr-result">
          <p className="nr-text nr-plan">{view.text}</p>
          <p className="nr-honest">Not booked — Nova drafted this.</p>
        </div>
      );
    default:
      return <p className="nr-fine">Nova came back empty-handed on this one. Try a broader ask.</p>;
  }
}

/* ─── The card ─── */

type CardProps = AccentProps & {
  request: NovaRequest;
  onChange?: (r: NovaRequest) => void;
  itemActions?: (item: ItemView) => ReactNode;
  /** Shown above the title while drafted. */
  draftLine?: string;
};

export function RequestCard({request, onChange, itemActions, accent, draftLine = 'Ready when you are'}: CardProps) {
  const [req, setReq] = useState(request);
  const [busy, setBusy] = useState<null | 'confirm' | 'cancel' | 'done'>(null);
  const [err, setErr] = useState<string | null>(null);

  const update = (r: NovaRequest) => { setReq(r); onChange?.(r); };

  const run = async (what: 'confirm' | 'cancel' | 'done') => {
    if (busy) return;
    setBusy(what); setErr(null);
    const prev = req;
    if (what === 'confirm') setReq({...req, status: 'running'});
    const out = what === 'confirm' ? await confirmRequest(req.id) : await closeRequest(req.id, what);
    if (out.ok) update(out.data);
    else {
      // A dispatch that reached the agent and failed is stored as failed; anything else left the row as it was.
      const failedOnServer = what === 'confirm' && (out.status === 502 || out.status === 503);
      setReq(failedOnServer ? {...prev, status: 'failed', error: out.body?.error ?? 'agent_failed'} : prev);
      setErr(requestErrorText(out.status, out.body));
    }
    setBusy(null);
  };

  const acts = actionsFor(req.status);
  const showResult = (req.status === 'ready' || req.status === 'done') && req.result;

  return (
    <article className="nr-card" style={vars(accent)} data-status={req.status} aria-busy={req.status === 'running'}>
      <header className="nr-head">
        <span className="nr-eyebrow">{req.status === 'drafted' ? draftLine : KIND_LABEL[req.kind]}</span>
        <StatusChip status={req.status} />
      </header>
      <h3 className="nr-title">{req.title}</h3>

      {req.status === 'running' && <p className="nr-fine" role="status">Nova is on it…</p>}
      {req.status === 'failed' && !err && <p className="nr-err">{storedErrorText(req.error)}</p>}
      {req.status === 'cancelled' && <p className="nr-fine">Set aside. Nothing ran.</p>}
      {showResult && <RequestResult request={req} itemActions={itemActions} />}
      {err && <p className="nr-err" role="alert">{err}</p>}

      {(acts.confirm || acts.retry || acts.done || acts.cancel) && (
        <div className="nr-acts">
          {acts.confirm && <button type="button" className="nr-btn nr-btn-solid" disabled={!!busy} onClick={() => run('confirm')}>{busy === 'confirm' ? 'Working…' : 'Confirm'}</button>}
          {acts.retry && <button type="button" className="nr-btn nr-btn-solid" disabled={!!busy} onClick={() => run('confirm')}>{busy === 'confirm' ? 'Working…' : 'Try again'}</button>}
          {acts.done && <button type="button" className="nr-btn nr-btn-solid" disabled={!!busy} onClick={() => run('done')}>{busy === 'done' ? 'Saving…' : 'Done'}</button>}
          {acts.cancel && <button type="button" className="nr-btn" disabled={!!busy} onClick={() => run('cancel')}>{busy === 'cancel' ? '…' : req.status === 'drafted' ? 'Not now' : 'Dismiss'}</button>}
        </div>
      )}
    </article>
  );
}

/* ─── One-button agent run for rooms ─── */

type ActionProps = AccentProps & {
  label: string;
  /** Build the request at click time; return null to do nothing. */
  build: () => NewRequest | null;
  itemActions?: (item: ItemView) => ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Render the produced card here instead of under the button. */
  onResult?: (r: NovaRequest) => void;
};

/** "Price check", "Find it", "Best way to buy"… → POST {confirm:true}, then the card with the result. */
export function NovaAction({label, build, accent, itemActions, className, style, onResult}: ActionProps) {
  const [busy, setBusy] = useState(false);
  const [req, setReq] = useState<NovaRequest | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    const input = build();
    if (!input || busy) return;
    setBusy(true); setErr(null);
    const out = await createRequest(input, true);
    if (out.ok) { if (onResult) onResult(out.data); else setReq(out.data); }
    else setErr(requestErrorText(out.status, out.body));
    setBusy(false);
  };

  return (
    <div className={['nr-action', className].filter(Boolean).join(' ')} style={{...vars(accent), ...style}}>
      <button type="button" className="nr-btn nr-btn-nova" onClick={go} disabled={busy} aria-busy={busy}>
        {busy ? <><i className="nr-spin" aria-hidden /> Nova is on it…</> : <>✦ {label}</>}
      </button>
      {err && <p className="nr-err" role="alert">{err}</p>}
      {req && !onResult && <RequestCard request={req} accent={accent} itemActions={itemActions} onChange={setReq} />}
    </div>
  );
}

/* ─── Your requests ─── */

const FILTERS: Array<[string, (s: RequestStatus) => boolean]> = [
  ['Open', (s) => s === 'drafted' || s === 'running' || s === 'ready' || s === 'failed'],
  ['All', () => true],
];

export function RequestsList({room, accent, emptyLine, itemActions, reloadKey = 0, exclude}: AccentProps & {
  room?: string; emptyLine?: string; itemActions?: (item: ItemView) => ReactNode; reloadKey?: number;
  /** A request already shown elsewhere on the page (e.g. the one just run). */
  exclude?: string;
}) {
  const [rows, setRows] = useState<NovaRequest[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState(0);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    listRequests().then((out) => {
      if (!alive) return;
      if (out.ok) { setRows(out.data); setErr(null); }
      else { setRows(null); setErr(out.status === 401 ? 'Sign in to see your requests.' : 'Your requests couldn’t be loaded just now.'); }
    });
    return () => { alive = false; };
  }, [reloadKey, tick]);
  const refresh = () => { setRows(null); setErr(null); setTick((n) => n + 1); };

  const shown = (rows ?? []).filter((r) => r.id !== exclude && (!room || r.room === room) && FILTERS[filter][1](r.status));

  return (
    <div className="nr-list" style={vars(accent)}>
      <div className="nr-filters" role="tablist" aria-label="Filter requests">
        {FILTERS.map(([label], i) => (
          <button key={label} type="button" role="tab" aria-selected={filter === i} className="nr-filter" onClick={() => setFilter(i)}>{label}</button>
        ))}
        <button type="button" className="nr-filter nr-refresh" onClick={refresh}>Refresh</button>
      </div>
      {err ? <p className="nr-err">{err}</p>
        : rows === null ? <div className="nr-skel" aria-label="Loading requests"><span /><span /></div>
        : shown.length === 0 ? <p className="nr-empty">{emptyLine ?? (filter === 0 ? 'Nothing open. Ask Nova to find, price, style, source or plan something.' : 'No requests yet.')}</p>
        : shown.map((r) => (
          <RequestCard key={r.id} request={r} accent={accent} itemActions={itemActions}
            onChange={(n) => setRows((prev) => (prev ?? []).map((x) => (x.id === n.id ? n : x)))} />
        ))}
    </div>
  );
}

export function RequestsSheet({open, onClose, room, accent, title = 'Your requests'}: AccentProps & {open: boolean; onClose: () => void; room?: string; title?: string}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="nr-scrim" onClick={onClose}>
      <section className="nr-sheet" role="dialog" aria-modal="true" aria-label={title} style={vars(accent)} onClick={(e) => e.stopPropagation()}>
        <header className="nr-sheet-head">
          <h2 className="nr-sheet-title">{title}</h2>
          <button type="button" className="nr-btn" onClick={onClose}>Close</button>
        </header>
        <p className="nr-fine" style={{marginTop: 0}}>Everything you’ve asked Nova to do. Nothing is bought or booked without you.</p>
        <RequestsList room={room} accent={accent} />
      </section>
    </div>
  );
}

/** Small "Your requests" trigger + sheet, for a room header. */
export function RequestsButton({accent, room, label = 'Your requests'}: AccentProps & {room?: string; label?: string}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="nr-btn nr-btn-quiet" style={vars(accent)} onClick={() => setOpen(true)}>{label}</button>
      <RequestsSheet open={open} onClose={() => setOpen(false)} room={room} accent={accent} />
    </>
  );
}
