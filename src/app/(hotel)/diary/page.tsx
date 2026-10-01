'use client';

import {useState} from 'react';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate} from '@/components/hotel/room-plate';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';

type LiveItem = {id: string; title: string; starts_at: string; source_room: string; state: string};
type DiaryData = {day: string; items: LiveItem[]; nextDecision: LiveItem | null};
const LIVE_LABEL: Record<string, string> = {needs_member_action: 'Needs you', held: 'Held', moved: 'Moved', approved: 'Approved', done: 'Done'};

function DiaryLive({data, accent, reload}: {data: DiaryData; accent: string; reload: () => void}) {
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
          <li key={i.id} className="flex items-center justify-between gap-3 border-b border-brass/10 py-2 font-body text-sm">
            <span>{new Date(i.starts_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} — {i.title}</span>
            <span className="flex items-center gap-2">
              <span className="italic text-cream/55">{LIVE_LABEL[i.state] ?? i.state}</span>
              {i.state !== 'done' && <button type="button" disabled={busy} onClick={() => act(i.id, 'done')} className="min-h-9 px-2 font-label text-[9px] uppercase tracking-[0.2em] text-brass/80">Done</button>}
            </span>
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
const ITEMS: {t: string; what: string; s: ItemState}[] = [
  {t: '09:00', what: 'Salon — blow-out', s: 'done'},
  {t: '11:30', what: 'Tailor fitting', s: 'moved'},
  {t: '13:00', what: 'Lunch table for two', s: 'done'},
  {t: '16:00', what: 'Registry gift wrapped', s: 'done'},
  {t: '20:00', what: 'Ballroom evening — approve the hold', s: 'needs_you'},
];
const LABEL: Record<ItemState, string> = {done: 'Done', moved: 'Moved', held: 'Held', needs_you: 'Needs you', approved: 'Approved'};

export default function DiaryPage() {
  const [items, setItems] = useState(ITEMS);
  return (
    <RoomPlate
      roomId="diary"
      liveEndpoint="/api/diary"
      isEmpty={(d: DiaryData) => d.items.length === 0}
      live={({data, accent, reload}) => <DiaryLive data={data} accent={accent} reload={reload} />}
      lede={{
        finesse: 'Four things handled. One that needs you. The day, on a single page.',
        carpe_diem: 'Four things handled. One decision left. The day, on a single page.',
      }}
      emptyCopy="A blank page. Nothing needs you today."
      actionConsequence="approve the held item with the partner; moved and held items stay visibly distinct until then."
      scene={({accent, reduce}) => (
        <div className="absolute inset-0 flex items-center justify-center" style={{background: 'radial-gradient(ellipse at 50% 30%, #3a1f12 0%, #120806 70%)'}}>
          <div className="relative flex h-[78%] w-[78%] max-w-[760px]" style={{perspective: 1400}}>
            <div className="h-full w-1/2 rounded-l-md border border-brass/30 bg-[#efe2c6] p-[4%] shadow-2xl">
              <p className="font-label text-[10px] uppercase tracking-[0.4em] text-[#6B5028]">Today</p>
              {items.slice(0, 4).map((i) => (
                <p key={i.t} className="mt-2 border-b border-[#6B5028]/20 pb-1 font-body text-[13px] text-[#2a170c]">
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
              <p className="mt-3 font-display text-xl italic text-[#2a170c]">{items[4].what}</p>
              <p className="mt-1 font-body text-sm italic text-[#6B5028]">{LABEL[items[4].s]}</p>
            </motion.div>
          </div>
        </div>
      )}
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
