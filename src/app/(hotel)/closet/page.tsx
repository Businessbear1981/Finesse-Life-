'use client';

import {useState} from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate, type LiveCtx} from '@/components/hotel/room-plate';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';

type Look = {id: string; photo_url: string; caption: string | null};
type ClosetData = {weekStart: string; status: string; days: {day: number; lookId: string | null}[]; looks: Look[]; missingPieces: {id: string; description: string; route_to: string | null}[]};

function ClosetLive({data, accent, reload}: LiveCtx<ClosetData>) {
  const [days, setDays] = useState(data.days);
  const [gap, setGap] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lookById = Object.fromEntries(data.looks.map((l) => [l.id, l]));
  if (data.looks.length === 0) {
    return <p className="font-body text-sm text-cream/75">No owned looks on file yet. <Link href="/camera" className="underline decoration-brass/60">Scan pieces with The Camera</Link> or add looks in the <Link href="/wardrobe" className="underline decoration-brass/60">Wardrobe</Link>.</p>;
  }
  const approve = async () => {
    setBusy(true);
    const r = await roomCall('/api/closet/approve-week', {method: 'POST', json: {weekStart: data.weekStart, days}});
    setBusy(false);
    setMsg(r.ok ? 'The week is set.' : r.body.message ?? 'Nothing was saved.');
    if (r.ok) reload();
  };
  const note = async (routeTo?: string) => {
    if (gap.trim().length < 2) return;
    setBusy(true);
    const r = await roomCall('/api/closet/missing-piece', {method: 'POST', json: {description: gap, routeTo}});
    setBusy(false);
    if (r.ok) { setGap(''); reload(); } else setMsg(r.body.message ?? 'Nothing was noted.');
  };
  return (
    <div className="space-y-5">
      <p className="font-label text-[9px] uppercase tracking-[0.35em] text-cream/60">Week of {data.weekStart} · {data.status}</p>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        {WEEK.map((d, i) => {
          const sel = days[i]?.lookId ?? '';
          const look = sel ? lookById[sel] : null;
          return (
            <li key={d} className="border border-brass/15 p-2">
              <span className="block font-label text-[9px] uppercase tracking-[0.25em] text-brass/80">{d}</span>
              {look ? (
                // eslint-disable-next-line @next/next/no-img-element -- member-owned look photos from arbitrary storage hosts
                <img src={look.photo_url} alt={look.caption ?? `Look for ${d}`} className="mt-1 aspect-[3/4] w-full object-cover" />
              ) : <div className="mt-1 aspect-[3/4] w-full border border-dashed border-brass/20" />}
              <label className="sr-only" htmlFor={`look-${i}`}>Look for {d}</label>
              <select id={`look-${i}`} value={sel} onChange={(e) => setDays((xs) => xs.map((x) => (x.day === i ? {...x, lookId: e.target.value || null} : x)))} className={`${fieldCls} mt-1 min-h-9 text-xs`}>
                <option value="">Rest day</option>
                {data.looks.map((l) => <option key={l.id} value={l.id}>{l.caption ?? 'Owned look'}</option>)}
              </select>
            </li>
          );
        })}
      </ol>
      <button type="button" disabled={busy} onClick={approve} className={btnCls} style={{borderColor: accent, color: accent}}>Approve the week</button>
      <div className="border-t border-brass/15 pt-4">
        <p className="font-label text-[9px] uppercase tracking-[0.35em] text-brass/80">Missing piece</p>
        <ul className="mt-2 space-y-1 font-body text-sm text-cream/75">{data.missingPieces.map((m) => <li key={m.id}>— {m.description}{m.route_to ? ` · sent to ${m.route_to}` : ''}</li>)}</ul>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input aria-label="Describe the missing piece" value={gap} onChange={(e) => setGap(e.target.value)} placeholder="A camel coat that works with Thursday" className={fieldCls} maxLength={300} />
          <button type="button" disabled={busy} onClick={() => note()} className={`${btnCls} border-brass/40 text-cream/75`}>Just note it</button>
          <button type="button" disabled={busy} onClick={() => note('stylist')} className={`${btnCls} border-brass/60 text-brass-highlight`}>Ask the Stylist</button>
        </div>
      </div>
      {msg && <p role="status" className="font-body text-sm italic text-cream/80">{msg}</p>}
    </div>
  );
}

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ClosetPage() {
  return (
    <RoomPlate
      roomId="closet"
      liveEndpoint="/api/closet/rotation"
      live={(ctx: LiveCtx<ClosetData>) => <ClosetLive {...ctx} />}
      lede={{
        finesse: 'Seven looks, all from pieces you already own. The one thing missing stays on its own hook.',
        carpe_diem: 'Seven fits, all from what is already in the closet. The one missing piece hangs apart.',
      }}
      emptyCopy="The rail is bare. Scan your closet with The Camera to fill it."
      actionConsequence="lock the week's rotation; a missing piece only becomes a Bag or Stylist suggestion if you ask."
      scene={({accent, reduce}) => (
        <div className="absolute inset-0 overflow-hidden" style={{background: 'linear-gradient(180deg,#2a170c 0%,#140a06 60%,#080406 100%)'}}>
          <div aria-hidden="true" className="absolute inset-x-[8%] top-[6%] h-[3%] rounded bg-gradient-to-r from-brass-shadow via-brass-highlight to-brass-shadow" />
          <motion.div
            className="absolute inset-x-[10%] top-[10%] flex h-[70%] justify-between"
            animate={reduce ? {} : {x: ['0%', '-2%', '0%']}}
            transition={{duration: 9, repeat: Infinity, ease: 'easeInOut'}}
          >
            {WEEK.map((d, i) => (
              <div key={d} className="flex w-[12%] flex-col items-center">
                <div className="h-6 w-px bg-brass/70" />
                <div className="h-full w-full rounded-t-[40%] border border-brass/30"
                  style={{background: `linear-gradient(180deg, ${i % 2 ? accent + '40' : '#3a2a1c'}, #120a08)`}} />
                <span className="mt-2 font-label text-[9px] uppercase tracking-[0.3em] text-cream/70">{d}</span>
              </div>
            ))}
          </motion.div>
          <div className="absolute bottom-[6%] right-[4%] w-[16%] border border-dashed p-2 text-center font-label text-[8px] uppercase tracking-[0.25em] text-cream/70" style={{borderColor: accent}}>
            Missing piece
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{background: 'radial-gradient(ellipse at 50% 0%, rgba(244,232,208,0.18), transparent 60%)'}} />
        </div>
      )}
      preview={({accent, act, acted}) => (
        <div className="space-y-4">
          <ol className="grid grid-cols-7 gap-1" aria-label="Weekly rotation, sample">
            {WEEK.map((d) => (
              <li key={d} className="border border-brass/15 p-2 text-center">
                <span className="block font-label text-[8px] uppercase tracking-[0.2em] text-brass/70">{d}</span>
                <span className="mt-1 block font-body text-[11px] text-cream/75">Owned</span>
              </li>
            ))}
          </ol>
          <p className="font-body text-xs italic text-cream/55">Owned pieces never generate an affiliate event just by appearing here.</p>
          <PlateAction label="Approve the week" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
