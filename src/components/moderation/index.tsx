'use client';

// Member safety on the web (Apple 1.2 / Play UGC): the "…" menu with Report (reason picker) and Block on
// every member post, VIP post, profile, listing and Game Room table, the blocked confirmation, and the
// one-time "House rules & terms" sheet shown before a member's first post.
import Link from 'next/link';
import {useCallback, useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {REPORTED_MESSAGE, REPORT_REASONS, REPORT_REASON_LABELS, type ReportKind, type ReportReason} from '@/lib/moderation';
import {acceptTerms, blockMember, blockOwnerOf, readTerms, reportContent, safetyFailure} from '@/lib/moderation-client';
import './moderation.css';

const NOUN: Record<ReportKind, string> = {
  post: 'post', vip_post: 'post', profile: 'profile', listing: 'listing', club_table: 'table', outing: 'outing', look: 'look', nova_reply: 'reply',
};

/* ───────────────────────── sheet shell ───────────────────────── */
function Sheet({labelledBy, onClose, children}: {labelledBy: string; onClose: () => void; children: ReactNode}) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => box.current?.querySelector<HTMLElement>('input, textarea, button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); prev?.focus?.(); };
  }, []);
  // Sheets only open after a tap, so this never renders on the server.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="mod-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className="mod-sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div>
    </div>,
    document.body,
  );
}

/* ───────────────────────── house rules & terms ───────────────────────── */
let termsAccepted: boolean | null = null;

export function HouseRulesSheet({onAccept, onCancel}: {onAccept: () => void; onCancel: () => void}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const agree = async () => {
    setBusy(true); setErr('');
    const r = await acceptTerms();
    setBusy(false);
    if (!r.ok) { setErr(safetyFailure(r, 'Nothing was saved.')); return; }
    termsAccepted = true;
    onAccept();
  };
  return (
    <Sheet labelledBy={id} onClose={onCancel}>
      <p className="mod-eyebrow">Before your first post</p>
      <h2 id={id} className="mod-title">House rules &amp; terms.</h2>
      <p className="mod-body">Finesse has <strong>zero tolerance for objectionable content or abusive members</strong>. Posting, listing or hosting means you agree:</p>
      <ul className="mod-rules">
        <li>No harassment, hate, slurs, threats or bullying.</li>
        <li>No sexual content or solicitation, and nothing illegal.</li>
        <li>No spam, scams, or phone numbers and contact handles in public posts.</li>
        <li>Anyone can report a post, look, listing, table or profile from its “…” menu. The house reviews every report within 24 hours, removes what breaks the rules and removes members who break them.</li>
        <li>You can block any member at any time — you stop seeing each other everywhere in the house.</li>
      </ul>
      <p className="mod-body mod-mute">These rules are part of the <Link href="/terms" className="mod-link" target="_blank">Terms of Use</Link>.</p>
      {err && <p role="alert" className="mod-alert">{err}</p>}
      <div className="mod-actions">
        <button type="button" className="mod-btn mod-btn-ghost" onClick={onCancel}>Not now</button>
        <button type="button" className="mod-btn mod-btn-solid" onClick={agree} disabled={busy}>{busy ? 'Saving…' : 'I agree'}</button>
      </div>
    </Sheet>
  );
}

/**
 * `ensure()` resolves true once the member has accepted the house rules (asking once with the sheet),
 * false if they close it. `require()` re-opens the sheet after a 403 terms_required from the server.
 * Render `sheet` anywhere in the component.
 */
export function useHouseRules() {
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const ask = useCallback(() => new Promise<boolean>((resolve) => { resolver.current = resolve; setOpen(true); }), []);
  const ensure = useCallback(async () => {
    if (termsAccepted) return true;
    const r = await readTerms();
    if (r.ok && r.body.accepted) { termsAccepted = true; return true; }
    if (!r.ok) return true; // let the server give the honest answer (signed out, not open yet…)
    return ask();
  }, [ask]);
  const require = useCallback(() => { termsAccepted = false; return ask(); }, [ask]);
  const done = (ok: boolean) => { setOpen(false); resolver.current?.(ok); resolver.current = null; };
  const sheet = open ? <HouseRulesSheet onAccept={() => done(true)} onCancel={() => done(false)} /> : null;
  return {ensure, require, sheet};
}

/* ───────────────────────── report / block ───────────────────────── */
type Props = {
  kind: ReportKind;
  targetId: string;
  /** The author / seller / profile id when the page knows it; tables block through their id instead. */
  memberId?: string | null;
  /** How the member is named in the menu ("Block Ava"). */
  name?: string | null;
  /** Hide the menu on the member's own content. */
  own?: boolean;
  /** Called after a block so the page can drop the member's content straight away. */
  onBlocked?: () => void;
  /** Called after a report (the page may hide the item for this member). */
  onReported?: () => void;
  canBlock?: boolean;
};

export function ModerationMenu({kind, targetId, memberId, name, own, onBlocked, onReported, canBlock = true}: Props) {
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<null | 'report' | 'block'>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [menu]);
  if (own) return null;
  const who = name?.trim() || 'this member';
  const blockable = canBlock && kind !== 'nova_reply' && (!!memberId || kind !== 'profile');
  return (
    <div className="mod-wrap" ref={wrap}>
      <button type="button" className="mod-dots" aria-label={`More options for this ${NOUN[kind]}`} aria-haspopup="menu" aria-expanded={menu} aria-controls={menuId}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenu((v) => !v); }}>
        <span aria-hidden>•••</span>
      </button>
      {menu && (
        <div id={menuId} role="menu" className="mod-menu">
          <button type="button" role="menuitem" className="mod-item" onClick={() => { setMenu(false); setSheet('report'); }}>Report {NOUN[kind]}</button>
          {blockable && <button type="button" role="menuitem" className="mod-item mod-item-danger" onClick={() => { setMenu(false); setSheet('block'); }}>Block {who}</button>}
        </div>
      )}
      {sheet === 'report' && (
        <ReportSheet kind={kind} targetId={targetId} who={who} canBlock={blockable}
          onClose={() => setSheet(null)} onReported={onReported} onBlock={() => setSheet('block')} />
      )}
      {sheet === 'block' && (
        <BlockSheet kind={kind} targetId={targetId} memberId={memberId} who={who} onClose={() => setSheet(null)} onBlocked={onBlocked} />
      )}
    </div>
  );
}

function ReportSheet({kind, targetId, who, canBlock, onClose, onReported, onBlock}: {
  kind: ReportKind; targetId: string; who: string; canBlock: boolean; onClose: () => void; onReported?: () => void; onBlock: () => void;
}) {
  const id = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const order: ReportReason[] = ['harassment', 'hate', 'sexual', 'violence', 'self_harm', 'scam', 'spam', 'impersonation', 'illegal', 'other'];
  const send = async () => {
    if (!reason || busy) return;
    setBusy(true); setErr('');
    const r = await reportContent(kind, targetId, reason, note);
    setBusy(false);
    if (!r.ok) { setErr(safetyFailure(r, 'Nothing was reported.')); return; }
    setSent(r.body.message ?? REPORTED_MESSAGE);
    onReported?.();
  };
  return (
    <Sheet labelledBy={id} onClose={onClose}>
      <p className="mod-eyebrow">Report</p>
      <h2 id={id} className="mod-title">{sent ? 'Report sent.' : `What’s wrong with this ${NOUN[kind]}?`}</h2>
      {sent ? (
        <>
          <p className="mod-ok" role="status">{sent}</p>
          <div className="mod-actions">
            {canBlock && <button type="button" className="mod-btn mod-btn-ghost" onClick={onBlock}>Also block {who}</button>}
            <button type="button" className="mod-btn mod-btn-solid" onClick={onClose}>Done</button>
          </div>
        </>
      ) : (
        <>
          <fieldset className="mod-reasons">
            <legend className="mod-body mod-mute" style={{marginBottom: 6}}>Your report is private — {who} isn’t told who sent it.</legend>
            {order.filter((x) => REPORT_REASONS.includes(x)).map((x) => (
              <label key={x} className="mod-reason">
                <input type="radio" name={`${id}-reason`} value={x} checked={reason === x} onChange={() => setReason(x)} />
                <span>{REPORT_REASON_LABELS[x]}</span>
              </label>
            ))}
          </fieldset>
          <label htmlFor={`${id}-note`} className="sr-only">Anything else the house should know (optional)</label>
          <textarea id={`${id}-note`} className="mod-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Anything else the house should know (optional)" />
          {err && <p role="alert" className="mod-alert">{err}</p>}
          <div className="mod-actions">
            <button type="button" className="mod-btn mod-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="mod-btn mod-btn-rose" onClick={send} disabled={!reason || busy}>{busy ? 'Sending…' : 'Send report'}</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function BlockSheet({kind, targetId, memberId, who, onClose, onBlocked}: {
  kind: ReportKind; targetId: string; memberId?: string | null; who: string; onClose: () => void; onBlocked?: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const block = async () => {
    setBusy(true); setErr('');
    const r = memberId ? await blockMember(memberId) : await blockOwnerOf(kind as Exclude<ReportKind, 'nova_reply'>, targetId);
    setBusy(false);
    if (!r.ok) { setErr(safetyFailure(r)); return; }
    setDone(true);
  };
  const finish = () => { onClose(); if (done) onBlocked?.(); };
  return (
    <Sheet labelledBy={id} onClose={finish}>
      <p className="mod-eyebrow">Block</p>
      <h2 id={id} className="mod-title">{done ? `${who === 'this member' ? 'Member' : who} blocked.` : `Block ${who}?`}</h2>
      {done ? (
        <p className="mod-ok" role="status">You won’t see each other’s posts, looks, listings, tables or profile anywhere in the house. They aren’t told. If they broke the rules, report them too.</p>
      ) : (
        <p className="mod-body">You won’t see each other’s posts, looks, listings, tables or profile anywhere in the house. They aren’t told you blocked them.</p>
      )}
      {err && <p role="alert" className="mod-alert">{err}</p>}
      <div className="mod-actions">
        {done ? (
          <button type="button" className="mod-btn mod-btn-solid" onClick={finish}>Done</button>
        ) : (
          <>
            <button type="button" className="mod-btn mod-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="mod-btn mod-btn-rose" onClick={block} disabled={busy}>{busy ? 'Blocking…' : 'Block'}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}
