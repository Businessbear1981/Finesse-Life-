'use client';

// Game Room — tables members host and seats they take (club_tables / club_seats, read through
// club_board()). Points only: no money moves in the app and no sportsbook, fantasy or games partner is
// connected, so those say "partner offers coming" / "needs a live feed" instead of showing fake data.
import {useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';
import {useLocalPref} from '@/components/after-hours';
import {LiveRoom, Notice, SampleLabel} from '@/components/live-room-states';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';
import {clubErrorText, GAME_INFO, GAMES, seatsLeft, type ClubTable, type Game} from '@/lib/clubhouse';
import {failureText, useRoomData} from '@/lib/rooms/live-room';

type Gender = 'masculine' | 'feminine';
type BoardData = {tables: ClubTable[]};

const SAMPLE_TABLES: Array<{game: Game; title: string; when: string; taken: number; seats: number}> = [
  {game: 'poker', title: 'Dealer’s choice at midnight', when: 'Fri 11:45 PM', taken: 4, seats: 6},
  {game: 'spades', title: 'Partners · trash talk welcome', when: 'Sat 9:00 PM', taken: 2, seats: 4},
];

const whenLabel = (iso: string) => new Date(iso).toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'});

/** datetime-local default: today, next whole hour. */
function nextHourLocal() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

function SampleBoard() {
  return (
    <div className="space-y-3">
      <SampleLabel>Sample tables · sign in to pull up a chair</SampleLabel>
      {SAMPLE_TABLES.map((t) => (
        <div key={t.title} className="flex items-center justify-between gap-3 border border-cream/6 bg-ink/40 p-4 opacity-70">
          <div>
            <p className="font-label text-[8px] uppercase tracking-[0.2em] text-cream/35">{GAME_INFO[t.game].label} · {t.when}</p>
            <p className="font-display text-base text-cream/80">{t.title}</p>
          </div>
          <p className="whitespace-nowrap font-mono text-sm text-cream/50">{t.taken} / {t.seats}</p>
        </div>
      ))}
    </div>
  );
}

function HostForm({accent, onDone}: {accent: string; onDone: () => void}) {
  const [game, setGame] = useState<Game>('spades');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [at, setAt] = useState(nextHourLocal);
  const [seats, setSeats] = useState(GAME_INFO.spades.defaultSeats);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pick = (g: Game) => { setGame(g); setSeats(GAME_INFO[g].defaultSeats); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const when = new Date(at);
    if (!title.trim() || busy || Number.isNaN(when.getTime())) return;
    setBusy(true); setMsg(null);
    const r = await roomCall<{error?: string}>('/api/clubhouse/tables', {method: 'POST', json: {game, title: title.trim(), note: note.trim() || null, starts_at: when.toISOString(), seats}});
    setBusy(false);
    if (!r.ok) { setMsg(r.body.error && r.status === 409 ? clubErrorText(r.body.error) : failureText(r.status, r.body, 'No table was opened.')); return; }
    setTitle(''); setNote('');
    onDone();
  };
  const info = GAME_INFO[game];
  return (
    <form onSubmit={submit} className="space-y-3 border border-cream/8 bg-ink/40 p-5">
      <p className="font-label text-[9px] uppercase tracking-[0.3em]" style={{color: `${accent}90`}}>Host a table</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Game">
        {GAMES.map((g) => (
          <button key={g} type="button" role="radio" aria-checked={g === game} onClick={() => pick(g)}
            className="min-h-10 px-3 font-label text-[9px] uppercase tracking-[0.15em]"
            style={{background: g === game ? accent : 'transparent', color: g === game ? '#0A0406' : 'rgba(244,232,208,0.4)', border: g === game ? 'none' : '1px solid rgba(244,232,208,0.1)'}}>
            {GAME_INFO[g].label}
          </button>
        ))}
      </div>
      <p className="font-body text-xs italic text-cream/35">{info.blurb}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input aria-label="Table name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name the table" maxLength={80} className={fieldCls} required />
        <input aria-label="Starts" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={fieldCls} required />
      </div>
      <input aria-label="House rules" value={note} onChange={(e) => setNote(e.target.value)} placeholder="House rules (optional)" maxLength={200} className={fieldCls} />
      <div className="flex items-center gap-3">
        <span className="font-label text-[9px] uppercase tracking-[0.2em] text-cream/40">Seats</span>
        <button type="button" aria-label="Fewer seats" onClick={() => setSeats((n) => Math.max(2, n - 1))} className="h-9 w-9 border border-cream/15 text-cream/70">−</button>
        <span className="w-6 text-center font-mono text-cream/80" aria-live="polite">{seats}</span>
        <button type="button" aria-label="More seats" onClick={() => setSeats((n) => Math.min(info.maxSeats, n + 1))} className="h-9 w-9 border border-cream/15 text-cream/70">+</button>
        <span className="font-body text-[10px] italic text-cream/30">up to {info.maxSeats}</span>
      </div>
      <button type="submit" disabled={busy || !title.trim()} className={btnCls} style={{borderColor: accent, color: accent}}>{busy ? 'Opening…' : 'Open the table'}</button>
      {msg && <Notice tone="error">{msg}</Notice>}
    </form>
  );
}

function TableCard({t, accent, reload}: {t: ClubTable; accent: string; reload: () => void}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const left = seatsLeft(t);
  const act = async (path: string, method: 'POST' | 'DELETE' = 'POST') => {
    setBusy(true); setMsg(null);
    const r = await roomCall<{error?: string}>(path, {method});
    setBusy(false);
    if (!r.ok) setMsg(r.status === 409 && r.body.error ? clubErrorText(r.body.error) : failureText(r.status, r.body));
    reload();
  };
  return (
    <motion.div layout initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} className="border bg-ink/40 p-4" style={{borderColor: t.seated ? `${accent}55` : 'rgba(244,232,208,0.06)'}}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-label text-[8px] uppercase tracking-[0.2em] text-cream/40">{GAME_INFO[t.game].label} · {whenLabel(t.starts_at)} · hosted by {t.is_host ? 'you' : t.host_name}</p>
          <p className="font-display text-lg tracking-wide text-cream/85">{t.title}</p>
          {t.note && <p className="font-body text-xs italic text-cream/35">{t.note}</p>}
        </div>
        <div className="text-right">
          <p className="whitespace-nowrap font-mono text-lg" style={{color: left === 0 ? 'rgba(244,232,208,0.4)' : accent}}>{t.seats_taken} / {t.seats}</p>
          <p className="font-label text-[7px] uppercase tracking-[0.15em] text-cream/30">{left === 0 ? 'full' : `${left} open`}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {t.is_host ? (
          <button type="button" disabled={busy} onClick={() => act(`/api/clubhouse/tables/${t.id}`, 'DELETE')} className={`${btnCls} border-cream/15 text-cream/50`}>Close the table</button>
        ) : t.seated ? (
          <button type="button" disabled={busy} onClick={() => act(`/api/clubhouse/tables/${t.id}/leave`)} className={`${btnCls} border-cream/20 text-cream/60`}>You’re seated · leave</button>
        ) : (
          <button type="button" disabled={busy || left === 0} onClick={() => act(`/api/clubhouse/tables/${t.id}/join`)} className={btnCls} style={{borderColor: accent, color: accent}}>{left === 0 ? 'Table full' : 'Take a seat'}</button>
        )}
      </div>
      {msg && <div className="mt-2"><Notice tone="error">{msg}</Notice></div>}
    </motion.div>
  );
}

function FeedNotice({what}: {what: string}) {
  return (
    <div className="border border-cream/8 bg-ink/40 p-6 text-center">
      <p className="font-display text-lg italic text-cream/50">{what} need a live sports feed.</p>
      <p className="mt-2 font-body text-sm text-cream/35">The feed isn’t connected yet, so there’s nothing real to show — no sample scores or rosters pretending to be live.</p>
    </div>
  );
}

export default function GameRoomPage() {
  const gender = useLocalPref<Gender>('finesse_gender', (g) => (g === 'masculine' ? 'masculine' : 'feminine'), 'feminine');
  const [tab, setTab] = useState<'tables' | 'scores' | 'fantasy'>('tables');
  const {data: room, reload} = useRoomData<BoardData>('/api/clubhouse/tables');
  const quiet = () => void reload(true);

  const isMasc = gender === 'masculine';
  const accent = isMasc ? '#00FF88' : '#FF4D7D';
  const tabs = isMasc ? (['tables', 'scores', 'fantasy'] as const) : (['tables'] as const);

  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.6}} className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2" style={{background: `radial-gradient(ellipse at center, ${accent}08 0%, transparent 65%)`}} />
      </div>

      <header className="relative z-10 pb-4 pt-12 text-center">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <h1 className="font-display text-4xl tracking-[0.2em]" style={{color: accent}}>game room</h1>
          <p className="mt-2 font-label text-[10px] uppercase tracking-[0.5em]" style={{color: 'rgba(244,232,208,0.2)'}}>poker · spades · dominoes · rummy · the book</p>
        </motion.div>
      </header>

      <div className="relative z-10 mx-auto mb-8 max-w-4xl px-4">
        <div className="flex justify-center gap-2">
          {tabs.map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k}
              className="px-4 py-2 font-label text-[10px] uppercase tracking-[0.2em] transition-all duration-300"
              style={{background: tab === k ? accent : 'transparent', color: tab === k ? '#0A0406' : 'rgba(244,232,208,0.25)', border: tab === k ? 'none' : '1px solid rgba(244,232,208,0.08)'}}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-12">
        <AnimatePresence mode="wait">
          {tab === 'tables' && (
            <motion.div key="tables" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <p className="text-center font-body text-xs italic text-cream/35">Played for points between members — no real money changes hands in the app.</p>
              <LiveRoom room={room} what="the Game Room" reload={() => void reload()} signedOut={<SampleBoard />}>
                {(d) => (
                  <div className="space-y-6">
                    <section className="space-y-3">
                      <p className="font-label text-[9px] uppercase tracking-[0.35em]" style={{color: `${accent}80`}}>Open tables</p>
                      {d.tables.length === 0 ? <Notice>No tables open yet — host the first one.</Notice> : d.tables.map((t) => <TableCard key={t.id} t={t} accent={accent} reload={quiet} />)}
                    </section>
                    <HostForm accent={accent} onDone={quiet} />
                  </div>
                )}
              </LiveRoom>
              <div className="border border-cream/6 bg-ink/30 p-4 text-center">
                <p className="font-label text-[9px] uppercase tracking-[0.3em] text-cream/40">Partner offers coming</p>
                <p className="mt-1 font-body text-xs italic text-cream/30">
                  {isMasc ? 'No sportsbook or fantasy partner is connected. The Book stays points-only until a licensed partner and age/location checks are live.' : 'Game partners aren’t connected yet.'}
                </p>
              </div>
            </motion.div>
          )}
          {tab === 'scores' && isMasc && (
            <motion.div key="scores" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}><FeedNotice what="Live scores" /></motion.div>
          )}
          {tab === 'fantasy' && isMasc && (
            <motion.div key="fantasy" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}><FeedNotice what="Fantasy rosters" /></motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 pb-8 text-center">
        <Link href="/lobby" className="font-body text-sm transition-colors" style={{color: 'rgba(244,232,208,0.2)'}}>return to the lobby</Link>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent" />
    </motion.div>
  );
}
