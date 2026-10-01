'use client';

import {useState} from 'react';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate, type LiveCtx} from '@/components/hotel/room-plate';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';

type Evening = {id: string; title: string; occasion: string | null; starts_at: string; party_size: number; components: {kind: string; label: string; state: string}[]; state: string};
type BallroomData = {evenings: Evening[]; sources: {looks: number; registryWishes: number}};
const STAGE_OF: Record<string, number> = {proposal: 0, hold_requested: 0, held: 1, confirmed: 2};
const KINDS = ['table', 'look', 'gift', 'route'] as const;

function BallroomLive({data, accent, track, reload}: LiveCtx<BallroomData>) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [parts, setParts] = useState<Record<string, string>>({table: '', look: '', gift: '', route: ''});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const compose = async (e: React.FormEvent) => {
    e.preventDefault();
    const components = KINDS.filter((k) => parts[k].trim()).map((k) => ({kind: k, label: parts[k].trim()}));
    if (!title.trim() || !when || components.length === 0) { setMsg('Give the evening a name, a time and at least one element.'); return; }
    setBusy(true);
    const r = await roomCall('/api/ballroom/compose', {method: 'POST', json: {title, startsAt: new Date(when).toISOString(), track, components}});
    setBusy(false);
    if (r.ok) { setTitle(''); setWhen(''); setParts({table: '', look: '', gift: '', route: ''}); setMsg('Proposal written. It is also waiting in your Diary.'); reload(); }
    else setMsg(r.body.message ?? 'Nothing was composed.');
  };
  const step = async (id: string, kind: 'hold' | 'confirm') => {
    setBusy(true);
    const r = await roomCall(`/api/ballroom/${kind}`, {method: 'POST', json: {eveningId: id}});
    setBusy(false);
    setMsg(r.body.message ?? (r.ok ? null : 'Nothing was changed.'));
    if (r.ok) reload();
  };

  return (
    <div className="space-y-6">
      {data.evenings.map((ev) => (
        <article key={ev.id} className="border border-brass/20 p-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xl italic">{ev.title}</h3>
            <time className="font-label text-[9px] uppercase tracking-[0.3em] text-cream/60">{new Date(ev.starts_at).toLocaleString([], {weekday: 'short', hour: '2-digit', minute: '2-digit'})}</time>
          </header>
          <ol className="mt-3 flex gap-2" aria-label="Stages">
            {STAGES.map((st, i) => (
              <li key={st} className="flex-1 border px-2 py-1 text-center font-label text-[9px] uppercase tracking-[0.25em]"
                style={{borderColor: i <= (STAGE_OF[ev.state] ?? 0) ? accent : 'rgba(201,169,97,0.2)', color: i <= (STAGE_OF[ev.state] ?? 0) ? '#F4E8D0' : 'rgba(244,232,208,0.45)'}}>
                {st}{ev.state === 'hold_requested' && i === 1 ? ' · requested' : ''}
              </li>
            ))}
          </ol>
          <ul className="mt-3 grid gap-1 font-body text-sm text-cream/75 sm:grid-cols-2">
            {ev.components.map((c, i) => <li key={i}><span className="font-label text-[9px] uppercase tracking-[0.25em] text-brass/70">{c.kind}</span> {c.label}</li>)}
          </ul>
          <div className="mt-3 flex gap-2">
            {ev.state === 'proposal' && <button type="button" disabled={busy} onClick={() => step(ev.id, 'hold')} className={btnCls} style={{borderColor: accent, color: accent}}>Ask the desk for holds</button>}
            {ev.state === 'held' && <button type="button" disabled={busy} onClick={() => step(ev.id, 'confirm')} className={btnCls} style={{borderColor: accent, color: accent}}>Confirm the evening</button>}
            {ev.state === 'hold_requested' && <p className="font-body text-xs italic text-cream/60">Waiting on partners — nothing is held until they say so.</p>}
          </div>
        </article>
      ))}
      <form onSubmit={compose} className="space-y-2 border-t border-brass/15 pt-4">
        <p className="font-label text-[9px] uppercase tracking-[0.35em] text-brass/80">Compose an evening</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input aria-label="Evening name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anniversary, Friday" className={fieldCls} maxLength={160} />
          <input aria-label="Start time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={fieldCls} />
          {KINDS.map((k) => (
            <input key={k} aria-label={k} value={parts[k]} onChange={(e) => setParts((p) => ({...p, [k]: e.target.value}))} placeholder={`${k[0].toUpperCase()}${k.slice(1)} — e.g. ${k === 'table' ? 'corner booth, 8:30' : k === 'look' ? 'from my Closet' : k === 'gift' ? 'Registry wish' : 'car at 8:05'}`} className={fieldCls} maxLength={160} />
          ))}
        </div>
        <p className="font-body text-xs italic text-cream/55">{data.sources.looks} owned looks and {data.sources.registryWishes} Registry wishes can feed this evening.</p>
        <button type="submit" disabled={busy} className={`${btnCls} border-brass/60 text-brass-highlight`}>Write the proposal</button>
      </form>
      {msg && <p role="status" className="font-body text-sm italic text-cream/80">{msg}</p>}
    </div>
  );
}

const STAGES = ['Proposal', 'Hold', 'Confirmed'] as const;

export default function BallroomPage() {
  return (
    <RoomPlate
      roomId="ballroom"
      liveEndpoint="/api/ballroom/context"
      isEmpty={(d: BallroomData) => d.evenings.length === 0}
      live={(ctx) => <BallroomLive {...ctx} />}
      lede={{
        finesse: 'One evening, composed: the table, the look, the gift and the route — under one chandelier.',
        carpe_diem: 'One night, composed: the table, the car, the suit and the timing — under one chandelier.',
      }}
      emptyCopy="No evenings composed yet. Ask Nova for a date, a dinner or an occasion."
      actionConsequence="ask partners for holds, then wait for your approval before anything is confirmed."
      scene={({accent, reduce}) => (
        <svg viewBox="0 0 1600 900" className="absolute inset-0 h-full w-full" role="img" aria-label="Double-height ballroom with laid tables under a chandelier grid">
          <defs>
            <radialGradient id="pool" cx="50%" cy="0%" r="80%"><stop offset="0" stopColor={accent} stopOpacity="0.35" /><stop offset="1" stopColor="#080406" stopOpacity="0" /></radialGradient>
            <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#17090D" /><stop offset="1" stopColor="#080406" /></linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#floor)" />
          {/* Arched windows */}
          {[160, 480, 800, 1120, 1440].map((x) => (
            <path key={x} d={`M${x - 90} 600 V220 A90 90 0 0 1 ${x + 90} 220 V600`} fill="none" stroke="#C9A961" strokeOpacity="0.25" strokeWidth="2" />
          ))}
          <rect width="1600" height="900" fill="url(#pool)" />
          {/* Chandelier grid */}
          {[400, 800, 1200].map((x, i) => (
            <motion.g key={x} initial={false} animate={reduce ? {} : {opacity: [0.6, 1, 0.6]}} transition={{duration: 5, repeat: Infinity, delay: i * 1.3}}>
              <line x1={x} y1="0" x2={x} y2="90" stroke="#C9A961" strokeOpacity="0.6" />
              {[-60, -30, 0, 30, 60].map((dx) => <line key={dx} x1={x} y1="90" x2={x + dx} y2="150" stroke="#E8C87A" strokeOpacity="0.5" />)}
              {[-60, -30, 0, 30, 60].map((dx) => <circle key={dx} cx={x + dx} cy="156" r="5" fill="#F4E8D0" />)}
            </motion.g>
          ))}
          {/* Tables */}
          {[[320, 640], [800, 690], [1280, 640], [560, 780], [1040, 780]].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <ellipse cx={x} cy={y} rx="110" ry="28" fill="#F4E8D0" fillOpacity="0.08" stroke="#C9A961" strokeOpacity="0.5" />
              <line x1={x - 10} y1={y - 26} x2={x - 10} y2={y - 60} stroke="#E8C87A" strokeOpacity="0.7" />
              <circle cx={x - 10} cy={y - 64} r="4" fill={accent} />
            </g>
          ))}
          <text x="800" y="860" textAnchor="middle" fill="#C9A961" fillOpacity="0.6" fontSize="18" letterSpacing="12">THE BALLROOM</text>
        </svg>
      )}
      preview={({accent, act, acted}) => (
        <div className="space-y-4">
          <ol className="flex gap-2" aria-label="Evening stages">
            {STAGES.map((s, i) => (
              <li key={s} className="flex-1 border px-3 py-2 text-center font-label text-[9px] uppercase tracking-[0.3em]"
                style={{borderColor: (acted ? i <= 1 : i === 0) ? accent : 'rgba(201,169,97,0.2)', color: (acted ? i <= 1 : i === 0) ? '#F4E8D0' : 'rgba(244,232,208,0.45)'}}>
                {s}
              </li>
            ))}
          </ol>
          <dl className="grid gap-2 font-body text-sm sm:grid-cols-4">
            {[['Table', 'Sample bistro, 8:30 pm'], ['Look', 'From your Closet'], ['Gift', 'Registry wish #1'], ['Route', 'Car at 8:05 pm']].map(([k, v]) => (
              <div key={k} className="border border-brass/10 p-3"><dt className="font-label text-[9px] uppercase tracking-[0.3em] text-brass/70">{k}</dt><dd className="mt-1 text-cream/80">{v}</dd></div>
            ))}
          </dl>
          <PlateAction label="Compose an evening" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
