'use client';

/**
 * The Gym — the member's own week (gym_sessions via /api/gym/sessions) and the recovery read
 * (/api/gym/recovery, from logged sets only). Planned classes, training and recovery are the member's notes:
 * no studio, trainer or spa is contacted. Wearables are not connected, so recovery never claims sleep or HR.
 */
import {useCallback, useEffect, useState} from 'react';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';

type Session = {id: string; day: string; at_time: string | null; kind: 'class' | 'training' | 'recovery' | 'other'; title: string; venue: string | null; done: boolean};
type Week = {weekStart: string; days: string[]; sessions: Session[]; trainedDays: string[]};
type Recovery = {recovery: {status: 'no_data' | 'ready' | 'recovering'; hoursSince: number | null; lastLoad: number; meanRpe?: number | null; hoursNeeded?: number; note: string}; sources: string[]; healthSync: string};
const KIND: Record<Session['kind'], string> = {class: 'Class', training: 'Training', recovery: 'Recovery', other: 'Other'};
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS: Record<Recovery['recovery']['status'], string> = {no_data: 'No sessions logged', ready: 'Ready', recovering: 'Recovering'};

export function GymRecovery({accent}: {accent: string}) {
  const [data, setData] = useState<Recovery | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void roomCall<Recovery>('/api/gym/recovery').then((r) => {
      if (!alive) return;
      if (r.ok) setData(r.body); else setErr(r.status === 503 ? 'The recovery read opens once this room is fitted out.' : 'The recovery read did not answer. Nothing was changed.');
    });
    return () => { alive = false; };
  }, []);
  if (err) return <p className="mb-8 border border-brass/15 p-4 font-body text-sm italic text-cream/70">{err}</p>;
  if (!data) return <div className="mb-8 h-20 animate-pulse border border-brass/10" role="status" aria-label="Reading your recovery" />;
  const r = data.recovery;
  return (
    <section aria-labelledby="gym-recovery" className="mb-8 border p-4" style={{borderColor: `${accent}40`}}>
      <h2 id="gym-recovery" className="font-label text-[10px] uppercase tracking-[0.4em]" style={{color: accent}}>Recovery · from your logged sets</h2>
      <p className="mt-2 font-display text-3xl italic" style={{color: r.status === 'ready' ? '#7AF5B8' : '#F4E8D0'}}>{STATUS[r.status]}</p>
      {r.status !== 'no_data' && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div><dt className="font-label text-[8px] uppercase tracking-[0.3em] text-cream/55">Since last</dt><dd className="font-display text-xl">{r.hoursSince ?? '–'}h</dd></div>
          <div><dt className="font-label text-[8px] uppercase tracking-[0.3em] text-cream/55">Needs</dt><dd className="font-display text-xl">{r.hoursNeeded ?? '–'}h</dd></div>
          <div><dt className="font-label text-[8px] uppercase tracking-[0.3em] text-cream/55">Last load</dt><dd className="font-display text-xl">{r.lastLoad} kg</dd></div>
        </dl>
      )}
      <p className="mt-2 font-body text-xs italic text-cream/55">{r.note}</p>
      <p className="mt-2 font-body text-[11px] italic text-cream/45">Wearables connect soon — sleep and heart rate aren&apos;t read yet, so they never appear here. Source: {data.sources.join(', ')}.</p>
    </section>
  );
}

export function GymWeek({accent}: {accent: string}) {
  const [week, setWeek] = useState<Week | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('07:00');
  const [kind, setKind] = useState<Session['kind']>('training');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await roomCall<Week>('/api/gym/sessions');
    if (r.ok) { setWeek(r.body); setErr(null); setDay((d) => d || (r.body.days.includes(new Date().toISOString().slice(0, 10)) ? new Date().toISOString().slice(0, 10) : r.body.days[0])); }
    else setErr(r.status === 503 ? 'Your week opens once this room is fitted out.' : 'Your week did not answer. Nothing was changed.');
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the awaited fetch
  useEffect(() => { void load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !day || busy) return;
    setBusy(true); setMsg(null);
    const r = await roomCall('/api/gym/sessions', {method: 'POST', json: {day, atTime: time || null, kind, title: title.trim(), venue: venue.trim() || null}});
    setBusy(false);
    if (r.ok) { setTitle(''); setVenue(''); setMsg('Added to your week. It is your plan — nothing was booked with a studio.'); void load(); }
    else setMsg(r.body.message ?? 'Nothing was added.');
  };
  const patch = async (s: Session, body: Record<string, unknown>) => {
    setBusy(true);
    const r = await roomCall(`/api/gym/sessions/${s.id}`, {method: 'PATCH', json: body});
    setBusy(false);
    if (!r.ok) setMsg('Nothing was changed.');
    void load();
  };
  const remove = async (s: Session) => {
    setBusy(true);
    const r = await roomCall(`/api/gym/sessions/${s.id}`, {method: 'DELETE'});
    setBusy(false);
    if (!r.ok) setMsg('Nothing was removed.');
    void load();
  };

  if (err) return <p className="mb-8 border border-brass/15 p-4 font-body text-sm italic text-cream/70">{err}</p>;
  if (!week) return <div className="mb-8 h-28 animate-pulse border border-brass/10" role="status" aria-label="Loading your week" />;
  const trained = new Set(week.trainedDays);
  const planned = week.sessions.length;
  const done = week.sessions.filter((s) => s.done).length;

  return (
    <section id="gym-week" aria-labelledby="gym-week-h" className="mb-8 border p-4" style={{borderColor: `${accent}40`}}>
      <h2 id="gym-week-h" className="font-label text-[10px] uppercase tracking-[0.4em]" style={{color: accent}}>This week · your plan</h2>
      <p className="mt-1 font-body text-sm text-cream/75">{trained.size} {trained.size === 1 ? 'day' : 'days'} trained · {done} of {planned} planned done</p>
      <ol className="mt-3 grid grid-cols-7 gap-1" aria-label="Days trained this week">
        {week.days.map((d, i) => (
          <li key={d} className="border py-2 text-center" style={{borderColor: trained.has(d) ? `${accent}66` : 'rgba(201,169,97,0.15)', background: trained.has(d) ? `${accent}14` : 'transparent'}}>
            <span className="block font-label text-[8px] uppercase tracking-[0.2em] text-cream/55">{DOW[i]}</span>
            <span className="block text-sm" style={{color: trained.has(d) ? accent : 'rgba(244,232,208,0.25)'}} aria-label={trained.has(d) ? 'trained' : 'not trained'}>{trained.has(d) ? '✓' : '·'}</span>
          </li>
        ))}
      </ol>

      {planned === 0 ? (
        <p className="mt-4 font-body text-sm italic text-cream/60">Nothing planned this week — add a class, a session or recovery below.</p>
      ) : (
        <ul className="mt-4 space-y-1">
          {week.sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 border-b border-brass/10 py-2">
              <div className="min-w-0">
                <p className={`font-body text-sm ${s.done ? 'text-cream/45 line-through' : 'text-cream/85'}`}>{s.title}</p>
                <p className="font-label text-[8px] uppercase tracking-[0.2em] text-cream/50">
                  {DOW[week.days.indexOf(s.day)] ?? s.day}{s.at_time ? ` · ${s.at_time.slice(0, 5)}` : ''} · {KIND[s.kind]}{s.venue ? ` · ${s.venue}` : ''}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" disabled={busy} onClick={() => patch(s, {done: !s.done})} className="min-h-9 px-2 font-label text-[9px] uppercase tracking-[0.2em]" style={{color: accent}} aria-label={`${s.done ? 'Undo' : 'Mark done'}: ${s.title}`}>{s.done ? 'Undo' : 'Done'}</button>
                <button type="button" disabled={busy} onClick={() => remove(s)} className="min-h-9 px-2 font-label text-[9px] uppercase tracking-[0.2em] text-cream/45 hover:text-neon-pink" aria-label={`Remove ${s.title}`}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
        <select aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)} className={fieldCls}>
          {week.days.map((d, i) => <option key={d} value={d}>{DOW[i]} {d.slice(5)}</option>)}
        </select>
        <input aria-label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls} style={{colorScheme: 'dark'}} />
        <select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value as Session['kind'])} className={fieldCls}>
          {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input aria-label="What" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Barre, legs, sauna…" maxLength={120} className={`${fieldCls} col-span-2 sm:col-span-3`} />
        <input aria-label="Where (optional)" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Where (optional)" maxLength={120} className={`${fieldCls} col-span-2 sm:col-span-4`} />
        <button type="submit" disabled={busy || !title.trim()} className={`${btnCls} col-span-2`} style={{borderColor: accent, color: accent}}>Add to my week</button>
      </form>
      <p className="mt-2 font-body text-[11px] italic text-cream/45">Your own plan. No studio, trainer or spa is booked from here.</p>
      {msg && <p role="status" className="mt-2 font-body text-sm italic text-cream/80">{msg}</p>}
    </section>
  );
}
