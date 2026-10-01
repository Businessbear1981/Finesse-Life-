'use client';

/** The Gym — your set log, rest timer and recovery read (room 26). Member data only. */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useReducedMotion} from 'framer-motion';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';

/** Wall clock read outside render (rest timer runs on device local time). */
const nowMs = () => Date.now();

type GymSet = {id: string; exercise: string; reps: number | null; weight_kg: number | null; duration_s: number | null; rpe: number | null; performed_at: string};
type Today = {today: GymSet[]; volumeKg: number; weekSessions: number; recovery: {status: string; hoursSince: number | null; note: string}; healthSync: string};

export function GymLog({accent}: {accent: string}) {
  const reduce = useReducedMotion();
  const [data, setData] = useState<Today | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'signed_out' | 'closed' | 'error'>('loading');
  const [ex, setEx] = useState('');
  const [reps, setReps] = useState('');
  const [kg, setKg] = useState('');
  const [rpe, setRpe] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [rest, setRest] = useState<{endsAt: number; total: number} | null>(null);
  const [now, setNow] = useState(nowMs);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const r = await roomCall<Today>('/api/gym/today');
    if (r.ok) { setData(r.body); setStatus('live'); }
    else setStatus(r.status === 401 ? 'signed_out' : r.status === 503 ? 'closed' : 'error');
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the awaited fetch, not synchronously
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!rest) return;
    tick.current = setInterval(() => setNow(nowMs()), 250);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [rest]);

  const log = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await roomCall('/api/gym/sets', {method: 'POST', json: {
      exercise: ex, reps: reps ? Number(reps) : null, weightKg: kg ? Number(kg) : null, rpe: rpe ? Number(rpe) : null,
    }});
    if (!r.ok) { setMsg(r.body.message ?? 'Check the set — reps are required.'); return; }
    setMsg(null); setReps(''); void load();
  };
  const startRest = async (seconds: number) => {
    const r = await roomCall<{endsAt: string}>('/api/gym/rest-timer', {method: 'POST', json: {seconds}});
    const endsAt = r.ok ? new Date(r.body.endsAt).getTime() : nowMs() + seconds * 1000;
    setNow(nowMs());
    setRest({endsAt, total: seconds});
  };
  const remove = async (id: string) => { await roomCall(`/api/gym/sets?id=${id}`, {method: 'DELETE'}); void load(); };

  if (status === 'loading') return <div className="mb-8 h-24 animate-pulse border border-brass/10" role="status" aria-label="Loading your log" />;
  if (status !== 'live' || !data) {
    return (
      <p className="mb-8 border border-brass/15 p-4 font-body text-sm italic text-cream/70">
        {status === 'signed_out' ? 'Sign in to keep your own set log here.' : status === 'closed' ? 'Your set log opens once this room is fitted out.' : 'The log did not answer. Nothing was changed.'}
      </p>
    );
  }

  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  const pct = rest ? 1 - left / rest.total : 0;
  return (
    <section aria-labelledby="gym-log" className="mb-10 border p-4" style={{borderColor: `${accent}55`}}>
      <h2 id="gym-log" className="font-label text-[10px] uppercase tracking-[0.4em]" style={{color: accent}}>Your log · live</h2>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div><dt className="font-label text-[8px] uppercase tracking-[0.3em] text-cream/55">Today</dt><dd className="font-display text-2xl">{data.volumeKg} kg</dd></div>
        <div><dt className="font-label text-[8px] uppercase tracking-[0.3em] text-cream/55">Sessions · 7d</dt><dd className="font-display text-2xl">{data.weekSessions}</dd></div>
        <div><dt className="font-label text-[8px] uppercase tracking-[0.3em] text-cream/55">Recovery</dt><dd className="font-display text-2xl capitalize">{data.recovery.status.replace('_', ' ')}</dd></div>
      </dl>
      <p className="mt-2 font-body text-xs italic text-cream/55">{data.recovery.note}</p>

      <form onSubmit={log} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input aria-label="Exercise" required value={ex} onChange={(e) => setEx(e.target.value)} placeholder="Back squat" className={`${fieldCls} col-span-2`} maxLength={80} />
        <input aria-label="Reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))} placeholder="Reps" className={fieldCls} />
        <input aria-label="Weight in kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value.replace(/[^\d.]/g, ''))} placeholder="kg" className={fieldCls} />
        <input aria-label="Effort 1 to 10" inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value.replace(/[^\d.]/g, ''))} placeholder="RPE" className={fieldCls} />
        <button type="submit" className={`${btnCls} col-span-2 sm:col-span-5`} style={{borderColor: accent, color: accent}}>Log the set</button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[60, 90, 120].map((s) => <button key={s} type="button" onClick={() => startRest(s)} className={`${btnCls} border-brass/40 text-cream/80`}>Rest {s}s</button>)}
        {rest && (
          <div className="flex items-center gap-3" role="timer" aria-live={left === 0 ? 'assertive' : 'off'}>
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(201,169,97,0.25)" strokeWidth="3" />
              <circle cx="22" cy="22" r="19" fill="none" stroke={accent} strokeWidth="3" strokeDasharray={`${2 * Math.PI * 19}`} strokeDashoffset={`${2 * Math.PI * 19 * (1 - pct)}`}
                transform="rotate(-90 22 22)" style={{transition: reduce ? 'none' : 'stroke-dashoffset 250ms linear'}} />
            </svg>
            <span className="font-display text-xl">{left === 0 ? 'Go.' : `${left}s`}</span>
          </div>
        )}
      </div>

      {data.today.length > 0 && (
        <ul className="mt-4 space-y-1 font-body text-sm">
          {data.today.map((s) => (
            <li key={s.id} className="flex justify-between border-b border-brass/10 py-1">
              <span>{s.exercise} — {s.reps ?? '–'} × {s.weight_kg ?? 0} kg{s.rpe ? ` · RPE ${s.rpe}` : ''}</span>
              <button type="button" onClick={() => remove(s.id)} className="min-h-8 px-2 font-label text-[9px] uppercase tracking-[0.2em] text-cream/45 hover:text-neon-pink" aria-label={`Delete ${s.exercise} set`}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 font-body text-[11px] italic text-cream/45">Health app sync: not connected. Your log is visible only to you and can be deleted at any time.</p>
      {msg && <p role="alert" className="mt-2 font-body text-sm italic text-neon-pink/90">{msg}</p>}
    </section>
  );
}
