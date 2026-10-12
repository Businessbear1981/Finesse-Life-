'use client';

// Departures — the member's trips (table `trips`) composed with Nova (nova_requests hub, topic 'trip'),
// and ride plans (topic 'ride'). No flight, hotel or ride partner is connected: plans are saved, nothing
// is searched live or booked, and the room says so at exactly that step.
import {useState} from 'react';
import {motion} from 'framer-motion';
import Link from 'next/link';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';
import {daysUntil, PARTNER_NOTE, rideBrief, tripBrief, tripDate, type Trip} from '@/lib/departures';
import {resultView} from '@/lib/nova-request-view';
import {failureText, runNovaRequest, useRoomData} from '@/lib/rooms/live-room';
import {LiveRoom, Notice, SampleLabel} from '@/components/live-room-states';

type TripsData = {trips: Trip[]};
const ACCENT = '#C9A961';

/** <input type="date"> value → ISO at local noon (keeps the calendar day in every timezone). */
const dayToIso = (d: string) => (d ? new Date(`${d}T12:00:00`).toISOString() : null);

function PartnerNote() {
  return (
    <p className="border border-cream/10 bg-ink/40 px-4 py-3 font-body text-xs italic text-cream/50">{PARTNER_NOTE}</p>
  );
}

function SampleTrips() {
  return (
    <div className="space-y-3">
      <SampleLabel>Sample trip · sign in to compose your own</SampleLabel>
      <div className="border border-cream/8 bg-ink/40 p-4 opacity-70">
        <p className="font-display text-xl text-cream/80">Atlanta → Naples</p>
        <p className="font-mono text-[10px] text-cream/35">Fri 14 Nov · 2 people · planned</p>
        <p className="mt-2 font-body text-sm italic text-cream/40">Day 1: car to ATL, lounge. Day 2: driver to Positano, lunch on the terrace…</p>
      </div>
    </div>
  );
}

/** Ask Nova for a trip plan and keep it on the trip (the server copies the plan from the member's own request). */
async function planTrip(trip: Trip): Promise<{ok: true; trip: Trip} | {ok: false; message: string}> {
  const r = await runNovaRequest({
    kind: 'plan', title: `Trip: ${trip.title}`, room: 'departures',
    details: {topic: 'trip', brief: tripBrief(trip), party_size: trip.party_size, ...(trip.depart_at ? {when: trip.depart_at} : {})},
  });
  if (!r.ok) return {ok: false, message: `${r.message} Your trip is saved as a draft.`};
  const p = await roomCall<{trip?: Trip}>(`/api/departures/trips/${trip.id}`, {method: 'PATCH', json: {nova_request_id: r.request.id}});
  if (!p.ok || !p.body.trip) return {ok: false, message: failureText(p.status, p.body, 'The plan is in your Diary; the trip stays a draft.')};
  return {ok: true, trip: p.body.trip};
}

function Compose({onDone}: {onDone: () => void}) {
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [depart, setDepart] = useState('');
  const [ret, setRet] = useState('');
  const [party, setParty] = useState(2);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || busy) return;
    if (depart && ret && ret < depart) { setMsg({ok: false, text: 'The return date is before departure. Nothing was saved.'}); return; }
    setMsg(null);
    setBusy('Saving your trip…');
    const c = await roomCall<{trip?: Trip}>('/api/departures/trips', {method: 'POST', json: {
      destination: destination.trim(), origin: origin.trim() || null, depart_at: dayToIso(depart), return_at: dayToIso(ret), party_size: party, brief: brief.trim() || null,
    }});
    if (!c.ok || !c.body.trip) { setBusy(null); setMsg({ok: false, text: failureText(c.status, c.body, 'Nothing was saved.')}); return; }
    setBusy('Nova is composing your departure…');
    const p = await planTrip(c.body.trip);
    setBusy(null);
    setMsg(p.ok ? {ok: true, text: 'Composed. Nova’s plan is saved on the trip and in your Diary.'} : {ok: false, text: p.message});
    setDestination(''); setOrigin(''); setDepart(''); setRet(''); setBrief('');
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-2 border border-brass/15 bg-ink/60 p-5">
      <p className="font-label text-[8px] uppercase tracking-[0.3em] text-brass/50">Compose a departure</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input aria-label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Where to — Amalfi, Tokyo, Miami" maxLength={120} className={fieldCls} required />
        <input aria-label="From" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="From (optional)" maxLength={120} className={fieldCls} />
        <label className="flex items-center gap-2 font-label text-[9px] uppercase tracking-[0.2em] text-cream/40">Depart<input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} className={fieldCls} /></label>
        <label className="flex items-center gap-2 font-label text-[9px] uppercase tracking-[0.2em] text-cream/40">Return<input type="date" value={ret} min={depart || undefined} onChange={(e) => setRet(e.target.value)} className={fieldCls} /></label>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-label text-[9px] uppercase tracking-[0.2em] text-cream/40">Party</span>
        <button type="button" aria-label="Fewer people" onClick={() => setParty((n) => Math.max(1, n - 1))} className="h-9 w-9 border border-brass/30 text-brass">−</button>
        <span className="w-6 text-center font-mono text-cream/80" aria-live="polite">{party}</span>
        <button type="button" aria-label="More people" onClick={() => setParty((n) => Math.min(40, n + 1))} className="h-9 w-9 border border-brass/30 text-brass">+</button>
      </div>
      <textarea aria-label="What kind of trip" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Great food and beaches, one boat day, nothing before 10 AM." maxLength={600} rows={2} className={`${fieldCls} py-2`} />
      <button type="submit" disabled={!destination.trim() || !!busy} className={`${btnCls} border-brass/60 text-brass`}>{busy ?? 'Compose with Nova'}</button>
      {msg && <Notice tone={msg.ok ? 'quiet' : 'error'}>{msg.text}</Notice>}
      <PartnerNote />
    </form>
  );
}

function TripCard({trip, reload}: {trip: Trip; reload: () => void}) {
  const [open, setOpen] = useState(trip.status === 'planned');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const days = daysUntil(trip.depart_at);
  const act = async (fn: () => Promise<string | null>) => {
    setBusy(true); setMsg(null);
    const err = await fn();
    setBusy(false);
    if (err) setMsg(err); else reload();
  };
  const replan = () => act(async () => { const r = await planTrip(trip); return r.ok ? null : r.message; });
  const setStatus = (status: 'draft' | 'cancelled') => act(async () => {
    const r = await roomCall(`/api/departures/trips/${trip.id}`, {method: 'PATCH', json: {status}});
    return r.ok ? null : failureText(r.status, r.body);
  });
  const remove = () => act(async () => {
    const r = await roomCall(`/api/departures/trips/${trip.id}`, {method: 'DELETE'});
    return r.ok ? null : failureText(r.status, r.body);
  });
  return (
    <motion.div initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} className="border border-cream/8 bg-ink/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl tracking-wide text-cream/85">{trip.origin ? `${trip.origin} → ` : ''}{trip.destination}</p>
          <p className="font-mono text-[10px] text-cream/35">
            {[tripDate(trip.depart_at), trip.return_at ? `to ${tripDate(trip.return_at)}` : '', `${trip.party_size} ${trip.party_size === 1 ? 'person' : 'people'}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <span className="font-label text-[8px] uppercase tracking-[0.2em]" style={{color: trip.status === 'planned' ? ACCENT : 'rgba(244,232,208,0.4)'}}>
            {trip.status === 'planned' ? 'Planned · not booked' : trip.status}
          </span>
          {days !== null && trip.status !== 'cancelled' && <p className="font-mono text-xs text-cream/40">{days === 0 ? 'today' : `in ${days} days`}</p>}
        </div>
      </div>
      {trip.plan && (
        <div className="mt-3">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-9 font-label text-[8px] uppercase tracking-[0.25em] text-brass/70">{open ? 'Hide Nova’s plan' : 'Show Nova’s plan'}</button>
          {open && <p className="mt-2 whitespace-pre-line border-t border-brass/10 pt-3 font-body text-sm leading-relaxed text-cream/70">{trip.plan}</p>}
        </div>
      )}
      {trip.status !== 'cancelled' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={replan} className={`${btnCls} border-brass/40 text-brass`}>{busy ? 'Working…' : trip.plan ? 'Re-plan with Nova' : 'Plan with Nova'}</button>
          <button type="button" disabled={busy} onClick={() => setStatus('cancelled')} className={`${btnCls} border-cream/15 text-cream/50`}>Cancel trip</button>
        </div>
      )}
      {trip.status === 'cancelled' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => setStatus('draft')} className={`${btnCls} border-cream/15 text-cream/60`}>Restore</button>
          {confirmDelete
            ? <button type="button" disabled={busy} onClick={remove} className={`${btnCls} border-neon-pink/50 text-neon-pink`}>Delete for good</button>
            : <button type="button" onClick={() => setConfirmDelete(true)} className={`${btnCls} border-cream/10 text-cream/35`}>Delete</button>}
        </div>
      )}
      {msg && <div className="mt-2"><Notice tone="error">{msg}</Notice></div>}
    </motion.div>
  );
}

function Ride() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [at, setAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !dropoff.trim() || busy) return;
    setBusy(true); setErr(null); setPlan(null);
    const when = at ? new Date(at) : null;
    const valid = when && !Number.isNaN(when.getTime()) ? when : null;
    const r = await runNovaRequest({kind: 'plan', title: `Ride to ${dropoff.trim()}`, room: 'departures', details: {
      topic: 'ride', brief: rideBrief(pickup.trim(), dropoff.trim(), valid ? valid.toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'}) : null),
      ...(valid ? {when: valid.toISOString()} : {}),
    }});
    setBusy(false);
    if (!r.ok) { setErr(r.message); return; }
    const v = resultView(r.request.result);
    setPlan(v.type === 'plan' ? v.text : 'Nova returned an empty plan.');
  };
  return (
    <form onSubmit={go} className="space-y-2 border border-cream/8 bg-ink/40 p-5">
      <p className="font-label text-[8px] uppercase tracking-[0.3em] text-brass/50">Plan a ride</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input aria-label="Pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Pickup" maxLength={120} className={fieldCls} required />
        <input aria-label="Drop-off" value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Drop-off" maxLength={120} className={fieldCls} required />
        <input aria-label="When" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={fieldCls} />
      </div>
      <button type="submit" disabled={busy || !pickup.trim() || !dropoff.trim()} className={`${btnCls} border-brass/50 text-brass`}>{busy ? 'Nova is planning…' : 'Plan the ride'}</button>
      {err && <Notice tone="error">{err}</Notice>}
      {plan && (
        <div className="border-t border-brass/10 pt-3">
          <p className="mb-2 font-label text-[8px] uppercase tracking-[0.3em] text-brass/40">Nova’s ride plan · in your Diary</p>
          <p className="whitespace-pre-line font-body text-sm leading-relaxed text-cream/70">{plan}</p>
        </div>
      )}
      <p className="font-body text-xs italic text-cream/40">Ride partners connect soon — your plan is saved. No car has been requested.</p>
    </form>
  );
}

export default function Departures() {
  const {data: room, reload} = useRoomData<TripsData>('/api/departures/trips');
  const quiet = () => void reload(true);
  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.6}} className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2" style={{background: 'radial-gradient(ellipse at center, rgba(66,133,244,0.06) 0%, transparent 65%)'}} />
      </div>

      <header className="relative z-10 pb-4 pt-12 text-center">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <h1 className="font-display text-4xl tracking-[0.2em] text-brass">departures</h1>
          <p className="mt-2 font-label text-[10px] uppercase tracking-[0.5em] text-cream/20">trips &middot; rides &middot; composed by nova</p>
        </motion.div>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl space-y-8 px-4 pb-12">
        <LiveRoom room={room} what="your Departures" reload={() => void reload()} signedOut={<SampleTrips />}>
          {(d) => {
            const upcoming = d.trips.filter((t) => t.status !== 'cancelled');
            const cancelled = d.trips.filter((t) => t.status === 'cancelled');
            return (
              <div className="space-y-8">
                <Compose onDone={quiet} />
                <section className="space-y-3">
                  <p className="font-label text-[8px] uppercase tracking-[0.3em] text-cream/40">Your trips</p>
                  {upcoming.length === 0 ? <Notice>No trips yet — compose one above.</Notice> : upcoming.map((t) => <TripCard key={t.id} trip={t} reload={quiet} />)}
                  {cancelled.length > 0 && (
                    <details className="pt-2">
                      <summary className="min-h-9 cursor-pointer font-label text-[8px] uppercase tracking-[0.3em] text-cream/30">Cancelled · {cancelled.length}</summary>
                      <div className="mt-3 space-y-3">{cancelled.map((t) => <TripCard key={t.id} trip={t} reload={quiet} />)}</div>
                    </details>
                  )}
                </section>
                <Ride />
              </div>
            );
          }}
        </LiveRoom>
        <p className="text-center font-body text-[11px] italic text-cream/25">Flights, hotels and cars: booking partners connect soon. Nothing in this room searches live fares or books anything.</p>
      </div>

      <div className="relative z-10 pb-8 text-center">
        <Link href="/lobby" className="font-body text-sm text-cream/20 transition-colors hover:text-brass">return to the lobby</Link>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent" />
    </motion.div>
  );
}
