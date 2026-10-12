'use client';

import {useEffect, useState} from 'react';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate} from '@/components/hotel/room-plate';
import {NovaPlanText, type NovaRequest} from '@/components/hotel/nova-plan';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';

type LiveItem = {id: string; title: string; starts_at: string; source_room: string; source_id: string | null; state: string; notes?: string | null};
type DiaryData = {day: string; items: LiveItem[]; nextDecision: LiveItem | null};
const LIVE_LABEL: Record<string, string> = {needs_member_action: 'Needs you', held: 'Held', moved: 'Moved', approved: 'Approved', done: 'Done'};

/** A Diary item Nova created (source_room 'nova', source_id = the request) — opens the request it came from. */
function NovaRequestPanel({id}: {id: string}) {
  const [req, setReq] = useState<NovaRequest | null | 'missing'>(null);
  useEffect(() => {
    let alive = true;
    void roomCall<{requests?: NovaRequest[]}>('/api/nova/requests').then((r) => {
      if (alive) setReq((r.ok ? r.body.requests?.find((q) => q.id === id) : undefined) ?? 'missing');
    });
    return () => { alive = false; };
  }, [id]);
  if (req === null) return <div className="mt-2 h-8 animate-pulse border border-brass/10" role="status" aria-label="Opening Nova's request" />;
  if (req === 'missing') return <p className="mt-2 font-body text-xs italic text-cream/55">Nova&apos;s request could not be opened. Nothing was changed.</p>;
  return (
    <div id={`request-${req.id}`} className="mt-2 space-y-2 border-l border-brass/30 pl-3">
      <p className="font-label text-[8px] uppercase tracking-[0.3em] text-brass/80">Nova&apos;s request · {req.kind.replace('_', ' ')} · {req.status}{req.room ? ` · from the ${req.room}` : ''}</p>
      {req.result?.plan ? <NovaPlanText text={req.result.plan} /> : req.result ? <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-body text-xs text-cream/70">{JSON.stringify(req.result, null, 2)}</pre> : <p className="font-body text-xs italic text-cream/55">No result yet.</p>}
      {req.result && 'booked' in req.result && !req.result.booked && <p className="font-body text-[11px] italic text-cream/50">Nothing is booked — approve to keep the plan, then arrange it.</p>}
    </div>
  );
}

function DiaryLive({data, accent, reload, onData}: {data: DiaryData; accent: string; reload: () => void; onData: (d: DiaryData) => void}) {
  useEffect(() => { onData(data); }, [data, onData]);
  const [openNova, setOpenNova] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('19:00');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (id: string, kind: 'approve' | 'hold' | 'done') => {
    setBusy(true);
    const r = kind === 'done'
      ? await roomCall(`/api/diary/items/${id}`, {method: 'PATCH', json: {state: 'done'}})
      : await roomCall(`/api/diary/items/${id}/${kind}`, {method: 'POST'});
    setBusy(false);
    setMsg(r.ok ? null : r.body.message ?? 'Nothing was changed.');
    if (r.ok) reload();
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const startsAt = new Date(`${data.day}T${time}:00`).toISOString();
    const r = await roomCall('/api/diary/items', {method: 'POST', json: {title, startsAt}});
    setBusy(false);
    if (r.ok) { setTitle(''); reload(); } else setMsg(r.body.message ?? 'Nothing was added.');
  };
  return (
    <div className="space-y-4">
      {data.nextDecision && (
        <div className="border p-4" style={{borderColor: accent}}>
          <p className="font-label text-[9px] uppercase tracking-[0.35em]" style={{color: accent}}>One thing needs you</p>
          <p className="mt-1 font-display text-xl italic">{data.nextDecision.title}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => act(data.nextDecision!.id, 'approve')} className={btnCls} style={{borderColor: accent, color: accent}}>Approve</button>
            <button type="button" disabled={busy} onClick={() => act(data.nextDecision!.id, 'hold')} className={`${btnCls} border-brass/40 text-cream/70`}>Hold</button>
          </div>
        </div>
      )}
      <ul className="space-y-1">
        {data.items.map((i) => (
          <li key={i.id} className="border-b border-brass/10 py-2 font-body text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>
                {new Date(i.starts_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} — {i.title}
                {i.source_room !== 'diary' && <span className="ml-2 font-label text-[8px] uppercase tracking-[0.2em] text-cream/45">from {i.source_room === 'nova' ? 'Nova' : `the ${i.source_room}`}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="italic text-cream/55">{LIVE_LABEL[i.state] ?? i.state}</span>
                {i.source_room === 'nova' && i.source_id && (
                  <button type="button" onClick={() => setOpenNova(openNova === i.id ? null : i.id)} aria-expanded={openNova === i.id} className="min-h-9 px-2 font-label text-[9px] uppercase tracking-[0.2em]" style={{color: accent}}>
                    {openNova === i.id ? 'Close' : 'Open request'}
                  </button>
                )}
                {i.state !== 'done' && <button type="button" disabled={busy} onClick={() => act(i.id, 'done')} className="min-h-9 px-2 font-label text-[9px] uppercase tracking-[0.2em] text-brass/80">Done</button>}
              </span>
            </div>
            {i.notes && <p className="mt-1 font-body text-xs italic text-cream/50">{i.notes}</p>}
            {openNova === i.id && i.source_id && <NovaRequestPanel id={i.source_id} />}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="diary-title">New entry</label>
        <input id="diary-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add to today's page" className={fieldCls} maxLength={200} />
        <label className="sr-only" htmlFor="diary-time">Time</label>
        <input id="diary-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${fieldCls} sm:w-32`} />
        <button type="submit" disabled={busy} className={`${btnCls} border-brass/50 text-brass-highlight`}>Write it in</button>
      </form>
      {msg && <p role="alert" className="font-body text-sm italic text-neon-pink/90">{msg}</p>}
    </div>
  );
}

type ItemState = 'done' | 'moved' | 'held' | 'needs_you' | 'approved';
// Rehearsal page — shown only in the signed-out / not-open preview, never once the member's diary has loaded.
const ITEMS: {t: string; what: string; s: ItemState}[] = [
  {t: '09:00', what: 'Salon — blow-out', s: 'done'},
  {t: '11:30', what: 'Tailor fitting', s: 'moved'},
  {t: '13:00', what: 'Lunch table for two', s: 'done'},
  {t: '16:00', what: 'Registry gift wrapped', s: 'done'},
  {t: '20:00', what: 'Ballroom evening — approve the hold', s: 'needs_you'},
];
const LABEL: Record<ItemState, string> = {done: 'Done', moved: 'Moved', held: 'Held', needs_you: 'Needs you', approved: 'Approved'};

const LIVE_TO_SCENE: Record<string, ItemState> = {needs_member_action: 'needs_you', held: 'held', moved: 'moved', approved: 'approved', done: 'done'};
type SceneLine = {key: string; t: string; what: string; s: ItemState};
const toScene = (i: LiveItem): SceneLine => ({key: i.id, t: new Date(i.starts_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), what: i.title, s: LIVE_TO_SCENE[i.state] ?? 'done'});

export default function DiaryPage() {
  const [items, setItems] = useState(ITEMS);
  // The member's own day, once the live endpoint answers. The scene draws this — never the rehearsal ITEMS.
  const [live, setLive] = useState<DiaryData | null>(null);
  /** What the open book shows: the member's day when live, the rehearsal only in preview, nothing while loading. */
  const sceneFor = (state: string): {lines: SceneLine[]; one: SceneLine | null; note: string | null} => {
    if (live) {
      const one = live.nextDecision ? toScene(live.nextDecision) : null;
      return {lines: live.items.map(toScene).filter((l) => l.key !== one?.key), one, note: live.items.length ? null : 'A blank page.'};
    }
    if (state === 'preview' || state === 'confirmed') {
      const x = items.find((i) => i.s === 'needs_you' || i.s === 'approved') ?? items[items.length - 1];
      return {lines: items.filter((i) => i !== x).map((i) => ({key: i.t, ...i})), one: {key: x.t, ...x}, note: 'Sample page'};
    }
    return {lines: [], one: null, note: state === 'loading' || state === 'live' ? 'Opening your page…' : null};
  };
  return (
    <RoomPlate
      roomId="diary"
      liveEndpoint="/api/diary"
      isEmpty={(d: DiaryData) => d.items.length === 0}
      live={({data, accent, reload}) => <DiaryLive data={data} accent={accent} reload={reload} onData={setLive} />}
      lede={{
        finesse: 'What is handled, and the one thing that needs you. The day, on a single page.',
        carpe_diem: 'What is handled, and the one decision left. The day, on a single page.',
      }}
      emptyCopy="A blank page. Nothing needs you today."
      actionConsequence="approve the held item with the partner; moved and held items stay visibly distinct until then."
      scene={({accent, reduce, state}) => { const {lines, one, note} = sceneFor(state); return (
        <div className="absolute inset-0 flex items-center justify-center" style={{background: 'radial-gradient(ellipse at 50% 30%, #3a1f12 0%, #120806 70%)'}}>
          <div className="relative flex h-[78%] w-[78%] max-w-[760px]" style={{perspective: 1400}}>
            <div className="h-full w-1/2 rounded-l-md border border-brass/30 bg-[#efe2c6] p-[4%] shadow-2xl">
              <p className="font-label text-[10px] uppercase tracking-[0.4em] text-[#6B5028]">Today</p>
              {note && <p className="mt-3 font-body text-[13px] italic text-[#6B5028]">{note}</p>}
              {lines.slice(0, 5).map((i) => (
                <p key={i.key} className="mt-2 border-b border-[#6B5028]/20 pb-1 font-body text-[13px] text-[#2a170c]">
                  {i.t} · {i.what} <span className="italic text-[#6B5028]">— {LABEL[i.s]}</span>
                </p>
              ))}
            </div>
            <motion.div
              className="h-full w-1/2 origin-left rounded-r-md border border-brass/30 bg-[#f4e8d0] p-[4%] shadow-2xl"
              initial={reduce ? false : {rotateY: -60}}
              animate={{rotateY: 0}}
              transition={{duration: 1.2, ease: [0.16, 1, 0.3, 1]}}
            >
              <p className="font-label text-[10px] uppercase tracking-[0.4em]" style={{color: accent}}>One thing</p>
              {one ? (
                <>
                  <p className="mt-3 font-display text-xl italic text-[#2a170c]">{one.what}</p>
                  <p className="mt-1 font-body text-sm italic text-[#6B5028]">{LABEL[one.s]}</p>
                </>
              ) : live ? (
                <p className="mt-3 font-display text-xl italic text-[#2a170c]">Nothing needs you today.</p>
              ) : null}
            </motion.div>
          </div>
        </div>
      ); }}
      preview={({accent, act, acted}) => (
        <div className="space-y-3">
          <ul className="space-y-1 font-body text-sm text-cream/80">
            {items.map((i) => <li key={i.t}>{i.t} — {i.what} <span className="italic text-cream/55">({LABEL[i.s]})</span></li>)}
          </ul>
          <PlateAction
            label="Approve one item"
            accent={accent}
            done={acted}
            onClick={() => { setItems((xs) => xs.map((x) => (x.s === 'needs_you' ? {...x, s: 'approved'} : x))); act(); }}
          />
        </div>
      )}
    />
  );
}
