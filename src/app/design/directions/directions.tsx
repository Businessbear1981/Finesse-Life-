'use client';

import {useEffect, useState} from 'react';

/* Shared sample content: the same Lobby in each direction, so only the look changes. */
const MEMBER = {name: 'Amara', tier: 'Black Key', since: '25'};
const TONIGHT = {title: 'Rooftop Session', place: 'The Penthouse', time: '11:00 PM', listed: 36, cap: 40};
const DROP = {title: 'Rose Gold', sub: 'Card finish · members first', endsIn: 2 * 3600 + 14 * 60 + 9};
const VAULT = {balance: '$1,240.00', rate: '12%'};
const CIRCLE = [
  {i: 'JD', c: '#B76E79'}, {i: 'MK', c: '#8E9298'}, {i: 'SO', c: '#2B2B2E'},
  {i: 'TA', c: '#C98B86'}, {i: 'LR', c: '#5A5D63'}, {i: 'NV', c: '#8E4B55'},
];
const ROOMS = [
  {n: 'Lounge', s: 'Who’s in tonight'},
  {n: 'Vault', s: '12% back, always'},
  {n: 'Concierge', s: 'Nova, on call'},
  {n: 'Closet', s: 'Your rotation'},
  {n: 'Jazz Club', s: 'Live at 10'},
  {n: 'Departures', s: 'Next escape'},
];

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

function useCountdown(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(left / 3600))}:${p(Math.floor((left % 3600) / 60))}:${p(left % 60)}`;
}

/* ───────────────────────── A · After Hours ───────────────────────── */
function AfterHours() {
  const t = useCountdown(DROP.endsIn);
  return (
    <div className="da">
      <header className="da-top">
        <span className="da-mark">FINESSE</span>
        <span className="da-me">A</span>
      </header>

      <p className="da-eyebrow">Good evening,</p>
      <h1 className="da-name">{MEMBER.name}.</h1>
      <p className="da-tier"><i /> {MEMBER.tier} · Member since ’{MEMBER.since}</p>

      <div className="da-circle">
        <div className="da-ring da-ring-add"><span>+</span></div>
        {CIRCLE.map((f) => (
          <div key={f.i} className="da-ring"><span style={{background: f.c}}>{f.i}</span></div>
        ))}
      </div>

      <section className="da-tonight">
        <div className="da-smoke" />
        <div className="da-tonight-in">
          <span className="da-chip">Tonight</span>
          <h2>Rooftop<br /><em>Session</em></h2>
          <p>{TONIGHT.place} · {TONIGHT.time}</p>
          <div className="da-list">
            <span className="da-pill">✓ You’re on the list</span>
            <span className="da-cap">{TONIGHT.listed}/{TONIGHT.cap}</span>
          </div>
        </div>
      </section>

      <section className="da-drop">
        <div>
          <span className="da-k">Drop 07</span>
          <h3>{DROP.title}</h3>
          <p>{DROP.sub}</p>
        </div>
        <div className="da-timer">{t}</div>
      </section>

      <section className="da-card">
        <div className="da-card-face">
          <div className="da-card-row"><span>FINESSE</span><span className="da-chipset" /></div>
          <div className="da-bal">{VAULT.balance}</div>
          <div className="da-card-row"><span className="da-k">Vault · Nano Black</span><span className="da-rate">{VAULT.rate} back</span></div>
        </div>
      </section>

      <div className="da-rooms">
        {ROOMS.map((r) => <span key={r.n}>{r.n}</span>)}
      </div>

      <nav className="da-tab">
        <b>Lobby</b><span>Lounge</span><span>Vault</span><span>Nova</span><span>You</span>
      </nav>
    </div>
  );
}

/* ───────────────────────── B · Glass ───────────────────────── */
function Glass() {
  return (
    <div className="db">
      <div className="db-aurora" />
      <header className="db-top">
        <div>
          <p className="db-hey">Hey {MEMBER.name}</p>
          <p className="db-sub">{MEMBER.tier} · since ’{MEMBER.since}</p>
        </div>
        <span className="db-me">A</span>
      </header>

      <section className="db-cardwrap">
        <div className="db-card">
          <div className="db-card-row"><span className="db-wm">finesse</span><span className="db-nfc">)))</span></div>
          <div>
            <div className="db-card-k">Vault balance</div>
            <div className="db-bal">{VAULT.balance}</div>
          </div>
          <div className="db-card-row"><span>•••• 0712</span><span className="db-rate">{VAULT.rate} back</span></div>
        </div>
      </section>

      <div className="db-grid">
        <section className="db-g db-tonight">
          <span className="db-k">Tonight</span>
          <h3>{TONIGHT.title}</h3>
          <p>{TONIGHT.place} · {TONIGHT.time}</p>
          <div className="db-bar"><i style={{width: `${(TONIGHT.listed / TONIGHT.cap) * 100}%`}} /></div>
          <p className="db-small">You’re on the list · {TONIGHT.cap - TONIGHT.listed} spots left</p>
        </section>
        <section className="db-g">
          <span className="db-k">Circle</span>
          <div className="db-faces">
            {CIRCLE.slice(0, 4).map((f) => <span key={f.i} style={{background: f.c}}>{f.i}</span>)}
          </div>
          <p className="db-small">4 friends in the Lounge</p>
        </section>
        <section className="db-g">
          <span className="db-k">Drop 07</span>
          <h4>{DROP.title}</h4>
          <p className="db-small">Members first</p>
        </section>
        <section className="db-g db-nova">
          <span className="db-k">Nova</span>
          <div className="db-ask">Book us a table for four…</div>
        </section>
      </div>

      <div className="db-rooms">
        {ROOMS.map((r) => (
          <div key={r.n} className="db-room"><b>{r.n}</b><span>{r.s}</span></div>
        ))}
      </div>

      <nav className="db-tab">
        <b>Lobby</b><span>Lounge</span><span>Vault</span><span>Nova</span><span>You</span>
      </nav>
    </div>
  );
}

/* ───────────────────────── C · The Drop ───────────────────────── */
function TheDrop() {
  const t = useCountdown(DROP.endsIn);
  const ticker = 'MEMBERS ONLY — DROP 07 — ROSE GOLD — 48H EARLY ACCESS — ROOFTOP SESSION 11PM — ';
  return (
    <div className="dc">
      <div className="dc-ticker"><div>{ticker.repeat(4)}</div></div>
      <header className="dc-head">
        <span>Nº 07</span><span>{MEMBER.tier}</span><span>Amara ●</span>
      </header>
      <h1 className="dc-word">FINESSE</h1>
      <p className="dc-dek"><em>The hotel is open.</em> You’re on the list, {MEMBER.name}.</p>

      <section className="dc-hero">
        <div className="dc-hero-img" />
        <span className="dc-sticker">ON THE<br />LIST</span>
        <div className="dc-hero-txt">
          <span>Tonight · {TONIGHT.time}</span>
          <h2>ROOFTOP<br />SESSION</h2>
          <span>{TONIGHT.place} — {TONIGHT.listed}/{TONIGHT.cap}</span>
        </div>
      </section>

      <section className="dc-drop">
        <div className="dc-card" />
        <div>
          <span className="dc-k">Drop 07</span>
          <h3>{DROP.title.toUpperCase()}</h3>
          <p><em>The card, in rose gold.</em> {VAULT.rate} back on every tap.</p>
          <div className="dc-timer">{t}</div>
        </div>
      </section>

      <ol className="dc-index">
        {ROOMS.map((r, i) => (
          <li key={r.n}>
            <span className="dc-num">{String(i + 1).padStart(2, '0')}</span>
            <b>{r.n.toUpperCase()}</b>
            <em>{r.s}</em>
            <span className="dc-arrow">→</span>
          </li>
        ))}
      </ol>

      <nav className="dc-tab">
        <b>LOBBY</b><span>LOUNGE</span><span>VAULT</span><span>NOVA</span><span>YOU</span>
      </nav>
    </div>
  );
}

const DIRECTIONS = {
  a: {name: 'A · After Hours', note: 'Noir + chrome. Nightlife, guest lists, drops. Saint Laurent after dark.', C: AfterHours},
  b: {name: 'B · Glass', note: 'Frosted glass over rose-gold aurora. App-native, widget-driven. Apple Card energy.', C: Glass},
  c: {name: 'C · The Drop', note: 'Editorial street-lux. Huge condensed type, tickers, stickers. SSENSE × magazine.', C: TheDrop},
} as const;

export function Directions({only}: {only?: 'a' | 'b' | 'c'}) {
  const keys = only ? [only] : (['a', 'b', 'c'] as const);
  return (
    <main className={only ? 'dir-solo' : 'dir-wall'}>
      <style>{CSS}</style>
      {keys.map((k) => {
        const {name, note, C} = DIRECTIONS[k];
        return (
          <figure key={k} className="dir-fig">
            {!only && <figcaption><b>{name}</b><span>{note}</span></figcaption>}
            <div className="dir-phone"><C /></div>
          </figure>
        );
      })}
    </main>
  );
}

const CSS = `
.dir-wall{min-height:100vh;background:#1a1a1c;display:flex;gap:40px;justify-content:center;flex-wrap:wrap;padding:40px 16px;font-family:var(--d-sans),system-ui,sans-serif}
.dir-solo{background:#000;min-height:100vh;font-family:var(--d-sans),system-ui,sans-serif}
.dir-fig{margin:0;display:flex;flex-direction:column;gap:14px;width:390px;max-width:100%}
.dir-fig figcaption{color:#eee;display:flex;flex-direction:column;gap:4px;font-size:13px}
.dir-fig figcaption b{font-size:16px;letter-spacing:.02em}
.dir-fig figcaption span{color:#9a9a9f}
.dir-wall .dir-phone{border-radius:44px;overflow:hidden;box-shadow:0 0 0 10px #000,0 0 0 11px #333,0 40px 80px rgba(0,0,0,.6)}
.dir-solo .dir-phone{max-width:430px;margin:0 auto}
.dir-phone>div{position:relative;min-height:844px;overflow:hidden;padding:56px 20px 110px}
@media (prefers-reduced-motion: reduce){.dc-ticker div{animation:none!important}}

/* A · After Hours */
.da{background:#050505;color:#EDEBE7}
.da:before{content:'';position:absolute;inset:0;background:${GRAIN};opacity:.07;pointer-events:none;mix-blend-mode:overlay}
.da-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:34px}
.da-mark{font-weight:700;letter-spacing:.42em;font-size:12px;background:linear-gradient(90deg,#fff,#8E9298 45%,#fff 60%,#9a9ca2);-webkit-background-clip:text;background-clip:text;color:transparent}
.da-me{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;background:linear-gradient(135deg,#F2C9B8,#B76E79);color:#2a1014}
.da-eyebrow{margin:0;font-size:14px;color:#8a8a8f}
.da-name{margin:0;font-family:var(--d-serif),serif;font-style:italic;font-weight:400;font-size:84px;line-height:.95;letter-spacing:-.02em;background:linear-gradient(180deg,#fff 10%,#B9BCC2 55%,#6d7076 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
.da-tier{display:flex;align-items:center;gap:8px;margin:10px 0 26px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9a9a9f}
.da-tier i{width:7px;height:7px;border-radius:50%;background:#E8B4A0;box-shadow:0 0 12px #E8B4A0}
.da-circle{display:flex;gap:12px;overflow:hidden;margin:0 -20px 28px;padding:0 20px}
.da-ring{flex:none;width:58px;height:58px;border-radius:50%;padding:2px;background:conic-gradient(from 200deg,#F4F4F2,#B76E79,#E8B4A0,#8E9298,#F4F4F2)}
.da-ring span{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;border:3px solid #050505;font-size:13px;font-weight:700;color:#fff}
.da-ring-add{background:#222}.da-ring-add span{background:#0d0d0f;font-size:22px;font-weight:300}
.da-tonight{position:relative;border-radius:28px;overflow:hidden;aspect-ratio:4/4.4;margin-bottom:14px;border:1px solid rgba(255,255,255,.08)}
.da-smoke{position:absolute;inset:0;background:radial-gradient(60% 50% at 70% 25%,rgba(183,110,121,.85),transparent 70%),radial-gradient(50% 45% at 20% 70%,rgba(142,75,85,.9),transparent 70%),radial-gradient(40% 35% at 85% 85%,rgba(185,188,194,.35),transparent 70%),#0b0708;filter:saturate(1.1)}
.da-smoke:after{content:'';position:absolute;inset:0;background:${GRAIN};opacity:.25;mix-blend-mode:overlay}
.da-tonight-in{position:absolute;inset:0;padding:22px;display:flex;flex-direction:column;justify-content:flex-end;background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.75))}
.da-chip{position:absolute;top:20px;left:20px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:7px 12px;border-radius:99px;background:rgba(255,255,255,.12);backdrop-filter:blur(12px)}
.da-tonight h2{margin:0;font-family:var(--d-serif),serif;font-weight:400;font-size:54px;line-height:.92;letter-spacing:-.01em}
.da-tonight h2 em{color:#F2C9B8}
.da-tonight p{margin:10px 0 16px;color:rgba(255,255,255,.7);font-size:14px}
.da-list{display:flex;justify-content:space-between;align-items:center}
.da-pill{font-size:13px;font-weight:600;padding:10px 16px;border-radius:99px;background:#fff;color:#000}
.da-cap{font-size:12px;color:rgba(255,255,255,.6);font-variant-numeric:tabular-nums}
.da-drop{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-radius:22px;background:#0f0f11;border:1px solid rgba(255,255,255,.08);margin-bottom:14px}
.da-k{font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#8a8a8f}
.da-drop h3{margin:4px 0 2px;font-family:var(--d-serif),serif;font-style:italic;font-weight:400;font-size:28px;background:linear-gradient(90deg,#F2C9B8,#B76E79);-webkit-background-clip:text;background-clip:text;color:transparent}
.da-drop p{margin:0;font-size:12px;color:#8a8a8f}
.da-timer{font-variant-numeric:tabular-nums;font-weight:500;font-size:20px;letter-spacing:.04em;color:#fff}
.da-card{perspective:900px;margin:26px 0 24px}
.da-card-face{aspect-ratio:1.586;border-radius:20px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;transform:rotateX(14deg) rotateZ(-3deg);background:linear-gradient(135deg,#2B2B2E,#0B0B0D 38%,#1C1C1F 68%,#050506);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 30px 60px rgba(0,0,0,.8),0 0 60px rgba(183,110,121,.18)}
.da-card-row{display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.32em;color:rgba(232,230,224,.8)}
.da-chipset{width:34px;height:26px;border-radius:6px;background:linear-gradient(135deg,#d8d9dc,#7d8086)}
.da-bal{font-size:34px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.da-rate{letter-spacing:.06em;font-weight:700;color:#F2C9B8}
.da-rooms{display:flex;flex-wrap:wrap;gap:8px}
.da-rooms span{font-size:13px;padding:10px 16px;border-radius:99px;border:1px solid rgba(255,255,255,.14);color:#ddd}
.da-tab,.db-tab{position:absolute;left:14px;right:14px;bottom:22px;display:flex;justify-content:space-around;align-items:center;padding:16px 8px;border-radius:26px;font-size:12px}
.da-tab{background:rgba(22,22,24,.82);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);color:#777}
.da-tab b{color:#fff}

/* B · Glass */
.db{background:#0d0b10;color:#fff}
.db-aurora{position:absolute;inset:-20%;background:radial-gradient(35% 25% at 20% 18%,rgba(183,110,121,.75),transparent 70%),radial-gradient(30% 22% at 85% 30%,rgba(185,188,194,.45),transparent 70%),radial-gradient(40% 30% at 60% 75%,rgba(142,75,85,.6),transparent 70%),radial-gradient(30% 20% at 10% 85%,rgba(232,180,160,.35),transparent 70%);filter:blur(30px)}
.db>*:not(.db-aurora){position:relative}
.db-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
.db-hey{margin:0;font-size:34px;font-weight:700;letter-spacing:-.03em}
.db-sub{margin:4px 0 0;font-size:14px;color:rgba(255,255,255,.6)}
.db-me{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:rgba(255,255,255,.14);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.25)}
.db-cardwrap{margin-bottom:16px}
.db-card{aspect-ratio:1.586;border-radius:24px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;color:rgba(42,16,20,.9);background:linear-gradient(135deg,#F2C9B8 0%,#B76E79 38%,#E8B4A0 68%,#8E4B55 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 24px 50px rgba(142,75,85,.45)}
.db-card-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600}
.db-wm{font-size:20px;font-weight:800;letter-spacing:-.04em}
.db-nfc{transform:rotate(0deg);letter-spacing:-.2em;opacity:.6}
.db-card-k{font-size:12px;font-weight:600;opacity:.65}
.db-bal{font-size:38px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.db-rate{padding:6px 10px;border-radius:99px;background:rgba(42,16,20,.85);color:#F2C9B8;font-size:12px}
.db-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.db-g{padding:16px;border-radius:24px;background:rgba(255,255,255,.08);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.14);min-height:120px;display:flex;flex-direction:column;gap:6px}
.db-tonight,.db-nova{grid-column:span 2}
.db-nova{min-height:0}
.db-k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.db-g h3{margin:2px 0 0;font-size:24px;font-weight:700;letter-spacing:-.02em}
.db-g h4{margin:2px 0 0;font-size:20px;font-weight:700;background:linear-gradient(90deg,#F2C9B8,#E8B4A0);-webkit-background-clip:text;background-clip:text;color:transparent}
.db-g p{margin:0;font-size:14px;color:rgba(255,255,255,.75)}
.db-g .db-small{font-size:12px;color:rgba(255,255,255,.55)}
.db-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.12);margin:8px 0 4px;overflow:hidden}
.db-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#E8B4A0,#fff)}
.db-faces{display:flex;margin:6px 0 4px}
.db-faces span{width:34px;height:34px;border-radius:50%;margin-right:-10px;display:grid;place-items:center;font-size:11px;font-weight:700;border:2px solid rgba(255,255,255,.35)}
.db-ask{margin-top:auto;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.25);font-size:12px;color:rgba(255,255,255,.6)}
.db-rooms{display:flex;flex-direction:column;border-radius:24px;overflow:hidden;background:rgba(255,255,255,.06);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12)}
.db-room{display:flex;justify-content:space-between;padding:15px 18px;border-bottom:1px solid rgba(255,255,255,.08);font-size:15px}
.db-room:last-child{border-bottom:0}
.db-room span{color:rgba(255,255,255,.5);font-size:13px}
.db-tab{background:rgba(255,255,255,.1);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.55)}
.db-tab b{color:#fff;padding:8px 14px;border-radius:99px;background:rgba(255,255,255,.16)}

/* C · The Drop */
.dc{background:#EFECE6;color:#0A0A0A}
.dc:before{content:'';position:absolute;inset:0;background:${GRAIN};opacity:.12;pointer-events:none;mix-blend-mode:multiply}
.dc>*{position:relative}
.dc-ticker{margin:-56px -20px 18px;padding:62px 0 10px;background:#0A0A0A;color:#EFECE6;overflow:hidden;white-space:nowrap;font-family:var(--d-cond),Impact,sans-serif;font-size:14px;letter-spacing:.08em}
.dc-ticker div{display:inline-block;animation:dc-marq 22s linear infinite}
@keyframes dc-marq{to{transform:translateX(-50%)}}
.dc-head{display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;border-bottom:1.5px solid #0A0A0A;padding-bottom:8px}
.dc-word{margin:6px 0 0;font-family:var(--d-cond),Impact,sans-serif;font-weight:400;font-size:98px;line-height:.86;letter-spacing:-.01em}
.dc-dek{margin:10px 0 20px;font-size:15px;line-height:1.35}
.dc-dek em{font-family:var(--d-serif),serif;font-size:19px}
.dc-hero{position:relative;aspect-ratio:4/4.6;overflow:hidden;margin-bottom:18px;background:#0A0A0A}
.dc-hero-img{position:absolute;inset:0;background:radial-gradient(55% 45% at 65% 30%,#C98B86,transparent 70%),radial-gradient(45% 40% at 25% 75%,#8E4B55,transparent 70%),radial-gradient(30% 25% at 85% 80%,#B9BCC2,transparent 70%),#151012;filter:contrast(1.1)}
.dc-hero-img:after{content:'';position:absolute;inset:0;background:${GRAIN};opacity:.35;mix-blend-mode:overlay}
.dc-sticker{position:absolute;top:18px;right:18px;width:84px;height:84px;border-radius:50%;display:grid;place-items:center;text-align:center;background:#E8B4A0;color:#0A0A0A;font-family:var(--d-cond),Impact,sans-serif;font-size:15px;line-height:1;transform:rotate(12deg);box-shadow:0 6px 0 #0A0A0A}
.dc-hero-txt{position:absolute;left:18px;right:18px;bottom:18px;color:#EFECE6;display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.dc-hero-txt h2{margin:0;font-family:var(--d-cond),Impact,sans-serif;font-weight:400;font-size:64px;line-height:.88;letter-spacing:0}
.dc-drop{display:grid;grid-template-columns:120px 1fr;gap:16px;align-items:center;padding:16px 0;border-top:1.5px solid #0A0A0A;border-bottom:1.5px solid #0A0A0A;margin-bottom:8px}
.dc-card{aspect-ratio:1/1.586;border-radius:12px;background:linear-gradient(160deg,#F2C9B8,#B76E79 40%,#E8B4A0 70%,#8E4B55);transform:rotate(-6deg);box-shadow:6px 8px 0 #0A0A0A}
.dc-k{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
.dc-drop h3{margin:2px 0 4px;font-family:var(--d-cond),Impact,sans-serif;font-weight:400;font-size:40px;line-height:.9}
.dc-drop p{margin:0 0 10px;font-size:13px;line-height:1.35}
.dc-drop p em{font-family:var(--d-serif),serif;font-size:16px}
.dc-timer{display:inline-block;padding:6px 10px;background:#0A0A0A;color:#E8B4A0;font-variant-numeric:tabular-nums;font-weight:700;font-size:15px;letter-spacing:.06em}
.dc-index{list-style:none;margin:0;padding:0}
.dc-index li{display:grid;grid-template-columns:30px auto 1fr auto;align-items:baseline;gap:10px;padding:13px 0;border-bottom:1px solid rgba(10,10,10,.25)}
.dc-num{font-size:11px;font-weight:700}
.dc-index b{font-family:var(--d-cond),Impact,sans-serif;font-weight:400;font-size:26px;letter-spacing:.01em}
.dc-index em{font-family:var(--d-serif),serif;font-size:15px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-arrow{font-size:18px}
.dc-tab{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-around;padding:18px 8px 30px;background:#0A0A0A;color:#777;font-family:var(--d-cond),Impact,sans-serif;font-size:14px;letter-spacing:.08em}
.dc-tab b{font-weight:400;color:#E8B4A0}
`;
