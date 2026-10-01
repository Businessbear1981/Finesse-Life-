'use client';

import {useState} from 'react';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate, type LiveCtx} from '@/components/hotel/room-plate';
import {btnCls, roomCall} from '@/lib/room-client';

type Session = {id: string; title: string; performers: string[]; starts_at: string; state: string; replay_until: string | null; licensing_note: string | null};
type JazzData = {sessions: Session[]; live: Session | null; audioProvider: string};

function JazzLive({data, accent}: LiveCtx<JazzData>) {
  const [msg, setMsg] = useState<string | null>(null);
  const join = async (id: string) => {
    const r = await roomCall(`/api/jazz-club/rooms/${id}/join`, {method: 'POST'});
    setMsg(r.body.message ?? (r.ok ? 'Joining…' : 'The door is closed.'));
  };
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {data.sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-brass/10 pb-2">
            <span className="font-body text-sm">
              {new Date(s.starts_at).toLocaleString([], {weekday: 'short', hour: '2-digit', minute: '2-digit'})} — <span className="font-display italic">{s.title}</span>
              {s.performers.length > 0 && <span className="text-cream/60"> · {s.performers.join(', ')}</span>}
            </span>
            {s.state === 'live'
              ? <button type="button" onClick={() => join(s.id)} className={btnCls} style={{borderColor: accent, color: accent}}>Join tonight&apos;s room</button>
              : <span className="font-label text-[9px] uppercase tracking-[0.25em] text-cream/50">{s.state}</span>}
          </li>
        ))}
      </ul>
      <p className="font-body text-xs italic text-cream/55">House sound: {data.audioProvider === 'configured' ? 'connected' : 'not connected yet'}. Tips open once performer payouts are set up.</p>
      {msg && <p role="status" className="font-body text-sm italic text-cream/80">{msg}</p>}
    </div>
  );
}

export default function JazzClubPage() {
  return (
    <RoomPlate
      roomId="jazz-club"
      liveEndpoint="/api/jazz-club/program"
      isEmpty={(d: JazzData) => d.sessions.length === 0}
      live={(ctx) => <JazzLive {...ctx} />}
      lede={{
        finesse: 'Down the back stair: one lamp, a trio, and the members who stayed for the second set.',
        carpe_diem: 'Down the back stair: one lamp, a trio, and the table that never empties.',
      }}
      emptyCopy="No set tonight. The lamp wakes only when a live room genuinely starts."
      actionConsequence="join a live audio room with captions; tips and tickets will show their price and recipient before you pay."
      scene={({accent, reduce, state}) => {
        const live = state === 'confirmed' || state === 'live';
        return (
          <svg viewBox="0 0 1600 900" className="absolute inset-0 h-full w-full" role="img" aria-label="Basement jazz club, green-black walls, a single brass lamp over a trio">
            <rect width="1600" height="900" fill="#050806" />
            {Array.from({length: 24}).map((_, i) => <rect key={i} x={i * 70} y="0" width="2" height="900" fill="#0f1a12" />)}
            <motion.polygon
              points="800,120 520,760 1080,760"
              fill={accent}
              initial={false}
              animate={{opacity: live ? 0.22 : 0.06}}
              transition={{duration: reduce ? 0 : 1.6}}
            />
            <line x1="800" y1="0" x2="800" y2="110" stroke="#C9A961" />
            <path d="M770 110 h60 l-10 18 h-40z" fill="#C9A961" />
            {/* Trio silhouettes */}
            <g fill="#0a0a0a" stroke="#C9A961" strokeOpacity="0.35">
              <rect x="640" y="560" width="120" height="200" rx="40" />
              <ellipse cx="800" cy="700" rx="70" ry="60" />
              <rect x="880" y="520" width="40" height="240" rx="14" />
            </g>
            <rect x="420" y="760" width="760" height="12" fill="#C9A961" fillOpacity="0.4" />
            {live && !reduce && [0, 1, 2].map((i) => (
              <motion.circle key={i} cx="800" cy="300" r="40" fill="none" stroke={accent} initial={{r: 40, opacity: 0.6}} animate={{r: 260, opacity: 0}} transition={{duration: 3, repeat: Infinity, delay: i}} />
            ))}
          </svg>
        );
      }}
      preview={({accent, act, acted}) => (
        <div className="space-y-3">
          <ul className="font-body text-sm text-cream/80">
            <li>9:30 pm — Set one (sample programme)</li>
            <li>11:00 pm — Set two · replay held 7 days</li>
          </ul>
          <p className="font-body text-xs italic text-cream/55">Tips go to the performers named on the programme; licensing and replay terms appear before payment.</p>
          <PlateAction label="Join tonight's room" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
