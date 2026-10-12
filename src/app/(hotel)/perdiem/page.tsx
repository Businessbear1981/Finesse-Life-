'use client';

// Per Diem — plan the night around a budget. Signed-in members get their real night for the chosen date
// (table per_diem_plans): Nova's evening plan (nova_requests hub, topic 'evening') is kept as written and
// parsed into stops the member ticks off. Nothing is reserved or paid. Signed out, a labelled sample.
import {useCallback, useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';
import {useLocalPref} from '@/components/after-hours';
import {LiveRoom, Notice, SampleLabel} from '@/components/live-room-states';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';
import {eveningBrief, totals, type PerDiemItem, type PerDiemPlan} from '@/lib/per-diem';
import {formatCents, resultView, type ItemView} from '@/lib/nova-request-view';
import {failureText, runNovaRequest, today, useRoomData} from '@/lib/rooms/live-room';

/* ─── Types ─── */

type Tab = 'planner' | 'wishlist' | 'verify' | 'split';
type Gender = 'masculine' | 'feminine';
type SplitMode = 'all' | 'fair' | 'cover';
type DayData = {date: string; plan: PerDiemPlan | null};

interface MemberResult {
  found: boolean;
  display_name?: string;
  gender?: string;
  vibe?: string;
  city?: string;
}

/* ─── Signed-out sample (labelled) ─── */

const SAMPLE_PLAN: PerDiemItem[] = [
  {time: '7:00 PM', label: 'Black car pickup', cost_cents: 4500, done: false},
  {time: '7:45 PM', label: 'Dinner — omakase bar', cost_cents: 32000, done: false},
  {time: '9:30 PM', label: 'Cocktails — speakeasy', cost_cents: 8000, done: false},
  {time: '11:00 PM', label: 'Live music', cost_cents: 4000, done: false},
];

const BUDGET_PRESETS = [
  {label: '$100', cents: 10000},
  {label: '$250', cents: 25000},
  {label: '$500', cents: 50000},
  {label: '$1,000', cents: 100000},
  {label: 'No limit', cents: 0},
];

const VIBE_OPTIONS = ['romantic', 'casual', 'adventurous', 'group night', 'solo treat', 'impress'];

const TEAL = '#69C9D0';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
}
const budgetLabel = (cents: number) => (cents > 0 ? formatPrice(cents) : 'No limit');
const occasionFor = (vibe: string) => `${vibe.charAt(0).toUpperCase()}${vibe.slice(1)} night`.slice(0, 60);

/* ─── Gender Lock ─── */

function GenderLock() {
  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]"
          style={{background: `radial-gradient(ellipse at center, rgba(105,201,208,0.05) 0%, transparent 65%)`}}
        />
      </div>
      <span className="text-5xl mb-6 inline-block">🎩</span>
      <h1 className="font-display text-3xl tracking-[0.2em] mb-3" style={{color: TEAL}}>
        carpe diem
      </h1>
      <p className="font-label text-[10px] tracking-[0.5em] uppercase mb-6" style={{color: 'rgba(244,232,208,0.2)'}}>
        this room is for him
      </p>
      <p className="font-body text-sm italic mb-10" style={{color: 'rgba(244,232,208,0.3)', maxWidth: '280px'}}>
        Per Diem is a Carpe Diem feature — date planning built for the man who shows up prepared.
      </p>
      <Link
        href="/lobby"
        className="px-8 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-colors"
        style={{border: `1px solid rgba(105,201,208,0.3)`, color: 'rgba(244,232,208,0.4)'}}
      >
        return to lobby
      </Link>
    </motion.div>
  );
}

/* ─── Timeline ─── */

function Timeline({items, onToggle, busy}: {items: PerDiemItem[]; onToggle?: (i: number, done: boolean) => void; busy?: boolean}) {
  return (
    <div className="relative pl-8">
      <div className="absolute bottom-0 left-3 top-0 w-px" style={{background: 'rgba(105,201,208,0.15)'}} />
      <div className="space-y-4">
        {items.map((item, i) => (
          <motion.div key={`${i}-${item.time}-${item.label}`} initial={{opacity: 0, x: -10}} animate={{opacity: 1, x: 0}} transition={{delay: i * 0.06}} className="relative">
            <div className="absolute -left-5 top-4 h-3 w-3 rounded-full border" style={{
              borderColor: item.done ? 'rgba(0,255,136,0.5)' : 'rgba(105,201,208,0.3)', background: item.done ? 'rgba(0,255,136,0.2)' : '#0A0406',
            }} />
            <button type="button" disabled={!onToggle || busy} onClick={() => onToggle?.(i, !item.done)} aria-pressed={item.done}
              className="w-full border p-4 text-left transition-all disabled:cursor-default"
              style={{borderColor: item.done ? 'rgba(0,255,136,0.15)' : 'rgba(244,232,208,0.06)', background: item.done ? 'rgba(10,4,6,0.5)' : 'rgba(10,4,6,0.3)'}}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-sm" style={{color: 'rgba(105,201,208,0.7)'}}>{item.time}</span>
                  <p className="mt-1 font-display text-base tracking-wide" style={{color: 'rgba(244,232,208,0.85)', textDecoration: item.done ? 'line-through' : undefined}}>{item.label}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-base" style={{color: TEAL}}>{item.cost_cents ? formatPrice(item.cost_cents) : '—'}</p>
                  {onToggle && (
                    <span className="font-label text-[7px] uppercase tracking-[0.15em]" style={{color: item.done ? 'rgba(0,255,136,0.6)' : 'rgba(244,232,208,0.25)'}}>
                      {item.done ? 'done ✓' : 'tap when done'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Rule({children}: {children: React.ReactNode}) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="h-px flex-1" style={{background: 'rgba(105,201,208,0.2)'}} />
      <span className="font-label text-[9px] uppercase tracking-[0.4em]" style={{color: 'rgba(105,201,208,0.4)'}}>{children}</span>
      <div className="h-px flex-1" style={{background: 'rgba(105,201,208,0.2)'}} />
    </div>
  );
}

/* ─── Wishlist (signed in): Nova's scout, through the hub ─── */

function WishlistFinder({budget}: {budget: number}) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ItemView[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || busy) return;
    setBusy(true); setErr(null); setItems(null);
    const r = await runNovaRequest({kind: 'find_item', title: `Gift: ${query.trim()}`, room: 'perdiem',
      details: {query: query.trim().slice(0, 200), ...(budget > 0 ? {budget_cents: budget} : {})}});
    setBusy(false);
    if (!r.ok) { setErr(r.message); return; }
    const v = resultView(r.request.result);
    setItems(v.type === 'items' ? v.items : []);
  };
  return (
    <div className="space-y-4">
      <p className="text-center font-body text-xs italic" style={{color: 'rgba(244,232,208,0.35)'}}>
        Tell Nova what she’s been wanting. Nova looks within tonight’s budget — nothing is bought.
      </p>
      <form onSubmit={find} className="flex gap-2">
        <input aria-label="What she wants" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200} placeholder="cashmere wrap, Santal 33, pearl drops…" className={fieldCls} />
        <button type="submit" disabled={busy || !query.trim()} className={btnCls} style={{borderColor: TEAL, color: TEAL}}>{busy ? 'Looking…' : 'Find'}</button>
      </form>
      {err && <Notice tone="error">{err}</Notice>}
      {items && (items.length === 0 ? <Notice>Nova didn’t find a match inside the budget — try different words or a bigger budget.</Notice> : (
        <ul className="space-y-2">
          {items.map((i, k) => (
            <li key={`${i.title}-${k}`} className="flex items-center justify-between gap-3 border p-4" style={{borderColor: 'rgba(244,232,208,0.06)', background: 'rgba(10,4,6,0.4)'}}>
              <div>
                {i.brand && <p className="font-label text-[8px] uppercase tracking-[0.15em]" style={{color: 'rgba(244,232,208,0.3)'}}>{i.brand}</p>}
                <p className="font-display text-base tracking-wide" style={{color: 'rgba(244,232,208,0.85)'}}>{i.title}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-base" style={{color: TEAL}}>{formatCents(i.price_cents)}</p>
                {i.url && <a href={i.url} target="_blank" rel="noopener noreferrer" className="font-label text-[8px] uppercase tracking-[0.2em] text-cream/40 underline">view</a>}
              </div>
            </li>
          ))}
        </ul>
      ))}
      <p className="text-center font-body text-[10px] italic" style={{color: 'rgba(244,232,208,0.2)'}}>This search is in your Diary.</p>
    </div>
  );
}

/* ─── Main Component ─── */

export default function PerDiemPage() {
  const gender = useLocalPref<Gender>('finesse_gender', (g) => (g === 'feminine' ? 'feminine' : 'masculine'), 'masculine');
  const [tab, setTab] = useState<Tab>('planner');
  const [date, setDate] = useState(() => today());
  const [budget, setBudget] = useState(50000);
  const [vibe, setVibe] = useState('romantic');
  const [busy, setBusy] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const {data: room, reload} = useRoomData<DayData>(`/api/per-diem?date=${date}`);
  const plan = room.state === 'ready' ? room.data.plan : null;
  const signedIn = room.state === 'ready';

  /* verify state */
  const [verifyQuery, setVerifyQuery] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<MemberResult | null>(null);

  /* split state */
  const [splitMode, setSplitMode] = useState<SplitMode>('all');
  const [splitParty, setSplitParty] = useState(2);
  const [mySharePct, setMySharePct] = useState(70);

  /* Nova draws the evening; the server keeps her plan and parses the stops. */
  const generate = useCallback(async () => {
    setPlanError(null);
    setBusy('Saving tonight…');
    const occasion = occasionFor(vibe);
    const c = await roomCall<{plan?: PerDiemPlan}>('/api/per-diem', {method: 'POST', json: {date, budget_cents: budget, occasion}});
    if (!c.ok || !c.body.plan) { setBusy(null); setPlanError(failureText(c.status, c.body, 'Nothing was saved.')); return; }
    setBusy('Nova is curating your night…');
    const r = await runNovaRequest({kind: 'plan', title: `${occasion} · ${date}`, room: 'perdiem',
      details: {topic: 'evening', brief: eveningBrief(occasion, budget, `The vibe: ${vibe}.`), when: new Date(`${date}T19:00:00`).toISOString(), party_size: 2}});
    if (!r.ok) { setBusy(null); setPlanError(`${r.message} Your budget for the night is saved.`); void reload(true); return; }
    const p = await roomCall(`/api/per-diem/${c.body.plan.id}`, {method: 'PATCH', json: {nova_request_id: r.request.id}});
    setBusy(null);
    if (!p.ok) setPlanError(failureText(p.status, p.body, 'Nova’s plan is in your Diary.'));
    void reload(true);
  }, [budget, date, reload, vibe]);

  const toggle = useCallback(async (index: number, done: boolean) => {
    if (!plan) return;
    setBusy('Saving…');
    const r = await roomCall(`/api/per-diem/${plan.id}`, {method: 'PATCH', json: {toggle: {index, done}}});
    setBusy(null);
    if (!r.ok) setPlanError(failureText(r.status, r.body));
    void reload(true);
  }, [plan, reload]);

  /* Member verify */
  const runVerify = useCallback(async () => {
    if (!verifyQuery.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/member?username=${encodeURIComponent(verifyQuery.trim())}`);
      const data: MemberResult = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({found: false});
    } finally {
      setVerifying(false);
    }
  }, [verifyQuery]);

  /* Derived values — the member's real night when signed in, the labelled sample otherwise. */
  const items = signedIn ? plan?.items ?? [] : SAMPLE_PLAN;
  const shownBudget = plan ? plan.budget_cents : budget;
  const t = totals(items, shownBudget);
  const remaining = t.left;

  const splitTotal = t.planned;
  const myShareAmount =
    splitMode === 'all'
      ? splitTotal
      : splitMode === 'fair'
      ? Math.round(splitTotal / splitParty)
      : Math.round(splitTotal * (mySharePct / 100));

  if (gender === 'feminine') return <GenderLock />;

  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.6}} className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2" style={{background: 'radial-gradient(ellipse at center, rgba(105,201,208,0.07) 0%, transparent 65%)'}} />
      </div>

      {/* Header */}
      <header className="relative z-10 pb-4 pt-12 text-center">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <span className="mb-4 inline-block text-4xl">🎩</span>
          <h1 className="font-display text-4xl tracking-[0.2em]" style={{color: TEAL}}>per diem</h1>
          <p className="mt-2 font-label text-[10px] uppercase tracking-[0.5em]" style={{color: 'rgba(244,232,208,0.2)'}}>date curator · carpe diem</p>
        </motion.div>
      </header>

      {/* Budget bar */}
      <div className="relative z-10 mx-auto mb-6 max-w-3xl px-4">
        <div className="brass-border bg-ink/60 p-5 backdrop-blur-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex flex-wrap items-center gap-2 font-label text-[9px] uppercase tracking-[0.3em]" style={{color: 'rgba(105,201,208,0.4)'}}>
              the night of
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${fieldCls} w-auto`} />
            </label>
            <span className="font-mono text-2xl" style={{color: TEAL, textShadow: '0 0 12px rgba(105,201,208,0.2)'}}>{budgetLabel(shownBudget)}</span>
          </div>

          <div className="mb-4 flex gap-2">
            {BUDGET_PRESETS.map((b) => (
              <button key={b.cents} type="button" onClick={() => setBudget(b.cents)} aria-pressed={budget === b.cents}
                className="flex-1 py-1.5 font-label text-[9px] uppercase tracking-[0.12em] transition-all"
                style={{background: budget === b.cents ? TEAL : 'transparent', color: budget === b.cents ? '#0A0406' : 'rgba(244,232,208,0.25)', border: budget === b.cents ? 'none' : '1px solid rgba(244,232,208,0.08)'}}>
                {b.label}
              </button>
            ))}
          </div>

          <div className="relative mb-2 h-2 bg-cream/5">
            <motion.div className="h-full" style={{background: t.pct > 90 ? '#FF4D7D' : t.pct > 70 ? '#FFA96B' : TEAL}} animate={{width: `${t.pct}%`}} transition={{duration: 0.5}} />
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px]" style={{color: 'rgba(244,232,208,0.3)'}}>{formatPrice(t.planned)} planned{t.spent ? ` · ${formatPrice(t.spent)} done` : ''}</span>
            <span className="font-mono text-[10px]" style={{color: remaining >= 0 ? 'rgba(0,255,136,0.6)' : 'rgba(255,77,125,0.6)'}}>
              {shownBudget <= 0 ? 'no limit' : remaining >= 0 ? `${formatPrice(remaining)} left` : 'over budget'}
            </span>
          </div>
          {plan && plan.budget_cents !== budget && (
            <p className="mt-2 font-body text-[10px] italic" style={{color: 'rgba(244,232,208,0.3)'}}>Saved budget {budgetLabel(plan.budget_cents)} — generate again to plan around {budgetLabel(budget)}.</p>
          )}
        </div>
      </div>

      {/* Vibe selector */}
      <div className="relative z-10 mx-auto mb-6 max-w-3xl px-4">
        <div className="flex flex-wrap justify-center gap-2">
          {VIBE_OPTIONS.map((v) => (
            <button key={v} type="button" onClick={() => setVibe(v)} aria-pressed={vibe === v}
              className="px-3 py-1.5 font-label text-[9px] uppercase tracking-[0.12em] transition-all"
              style={{background: vibe === v ? TEAL : 'transparent', color: vibe === v ? '#0A0406' : 'rgba(244,232,208,0.25)', border: vibe === v ? 'none' : '1px solid rgba(244,232,208,0.08)'}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 mx-auto mb-8 max-w-3xl px-4">
        <div className="flex flex-wrap justify-center gap-2">
          {([
            {key: 'planner', label: 'planner'},
            {key: 'wishlist', label: 'her wishlist'},
            {key: 'verify', label: 'verify her'},
            {key: 'split', label: 'finesse split'},
          ] as const).map(({key, label}) => (
            <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
              className="px-4 py-2 font-label text-[10px] uppercase tracking-[0.2em] transition-all"
              style={{background: tab === key ? TEAL : 'transparent', color: tab === key ? '#0A0406' : 'rgba(244,232,208,0.25)', border: tab === key ? 'none' : '1px solid rgba(244,232,208,0.08)'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-12">
        <AnimatePresence mode="wait">

          {/* ═══ DATE PLANNER ═══ */}
          {tab === 'planner' && (
            <motion.div key="planner" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <LiveRoom room={room} what="Per Diem" reload={() => void reload()} signedOut={
                <div className="space-y-4">
                  <SampleLabel>Tonight’s itinerary · sample</SampleLabel>
                  <Timeline items={SAMPLE_PLAN} />
                </div>
              }>
                {() => (
                  <div>
                    <div className="mb-8 text-center">
                      <button type="button" onClick={generate} disabled={!!busy} className="px-8 py-3 font-label text-[10px] uppercase tracking-[0.3em] transition-all"
                        style={{background: busy ? 'transparent' : TEAL, color: busy ? TEAL : '#0A0406', border: busy ? '1px solid rgba(105,201,208,0.4)' : 'none', opacity: busy ? 0.7 : 1}}>
                        {busy ?? (plan?.items.length ? 'plan it again with nova' : 'generate with nova')}
                      </button>
                      <p className="mt-2 font-body text-[10px] italic" style={{color: 'rgba(244,232,208,0.25)'}}>tailored to your vibe and budget · nothing is booked or paid</p>
                    </div>

                    <Rule>{plan?.status === 'planned' || plan?.items.length ? <>nova&apos;s plan · nothing booked</> : <>the night of {date}</>}</Rule>
                    {planError && <p className="mb-6 text-center font-body text-xs italic" style={{color: 'rgba(255,77,125,0.75)'}} role="alert">{planError}</p>}

                    {!plan || (plan.items.length === 0 && !plan.plan_text) ? (
                      <Notice>No plan for this night yet — set the budget and the vibe, then let Nova draw it.</Notice>
                    ) : plan.items.length > 0 ? (
                      <Timeline items={plan.items} onToggle={toggle} busy={!!busy} />
                    ) : null}

                    {plan?.plan_text && (
                      <details className="mt-6" open={plan.items.length === 0}>
                        <summary className="min-h-9 cursor-pointer font-label text-[8px] uppercase tracking-[0.3em] text-cream/40">Nova’s plan, as written</summary>
                        <p className="mt-3 whitespace-pre-line font-body text-sm leading-relaxed text-cream/65">{plan.plan_text}</p>
                      </details>
                    )}

                    {plan && plan.items.length > 0 && (
                      <div className="mt-6 flex items-center justify-between border px-4 py-3" style={{borderColor: 'rgba(105,201,208,0.2)', background: 'rgba(10,4,6,0.5)'}}>
                        <span className="font-label text-[9px] uppercase tracking-[0.3em]" style={{color: 'rgba(244,232,208,0.3)'}}>the night’s total</span>
                        <span className="font-mono text-xl" style={{color: TEAL}}>{formatPrice(t.planned)}</span>
                      </div>
                    )}
                    <p className="mt-4 text-center font-body text-[10px] italic" style={{color: 'rgba(244,232,208,0.2)'}}>Reservation partners connect soon — your plan is saved and in your Diary.</p>
                  </div>
                )}
              </LiveRoom>
            </motion.div>
          )}

          {/* ═══ HER WISHLIST ═══ */}
          {tab === 'wishlist' && (
            <motion.div key="wishlist" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <Rule>her wishlist · found by nova</Rule>
              <LiveRoom room={room} what="Per Diem" reload={() => void reload()} signedOut={<SampleLabel>Sign in and Nova finds what she wants inside your budget.</SampleLabel>}>
                {() => <WishlistFinder budget={budget} />}
              </LiveRoom>
            </motion.div>
          )}

          {/* ═══ VERIFY HER ═══ */}
          {tab === 'verify' && (
            <motion.div key="verify" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
                <span className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `rgba(105,201,208,0.4)`}}>
                  member verification
                </span>
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
              </div>
              <p
                className="text-center font-body text-xs italic mb-8"
                style={{color: 'rgba(244,232,208,0.25)', maxWidth: '300px', margin: '0 auto 2rem'}}
              >
                Confirm she&apos;s a real Finesse member before you invest the night.
              </p>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={verifyQuery}
                  onChange={(e) => {
                    setVerifyQuery(e.target.value);
                    setVerifyResult(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && runVerify()}
                  placeholder="her username or display name"
                  className="flex-1 px-4 py-3 bg-ink/60 font-body text-sm outline-none"
                  style={{border: `1px solid rgba(105,201,208,0.25)`, color: 'rgba(244,232,208,0.8)'}}
                />
                <button
                  onClick={runVerify}
                  disabled={verifying || !verifyQuery.trim()}
                  className="px-6 font-label text-[9px] tracking-[0.2em] uppercase transition-all"
                  style={{
                    background: verifying ? 'transparent' : TEAL,
                    color: verifying ? TEAL : '#0A0406',
                    border: verifying ? `1px solid rgba(105,201,208,0.4)` : 'none',
                    opacity: !verifyQuery.trim() ? 0.4 : 1,
                  }}
                >
                  {verifying ? '...' : 'check'}
                </button>
              </div>

              <AnimatePresence>
                {verifyResult && (
                  <motion.div
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0}}
                    className="p-6 border"
                    style={{
                      borderColor: verifyResult.found ? `rgba(105,201,208,0.3)` : 'rgba(255,77,125,0.3)',
                      background: verifyResult.found ? `rgba(105,201,208,0.05)` : 'rgba(255,77,125,0.05)',
                    }}
                  >
                    {verifyResult.found ? (
                      <>
                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className="w-12 h-12 flex items-center justify-center font-display text-xl"
                            style={{background: `rgba(105,201,208,0.15)`, color: TEAL, border: `1px solid rgba(105,201,208,0.3)`}}
                          >
                            {verifyResult.display_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-display text-lg tracking-wide" style={{color: 'rgba(244,232,208,0.9)'}}>
                              {verifyResult.display_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="font-label text-[8px] tracking-[0.2em] uppercase px-2 py-0.5"
                                style={{background: `rgba(105,201,208,0.15)`, color: TEAL}}
                              >
                                verified member
                              </span>
                              {verifyResult.city && (
                                <span className="font-body text-[10px] italic" style={{color: 'rgba(244,232,208,0.3)'}}>
                                  {verifyResult.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {verifyResult.vibe && (
                          <div className="flex items-center gap-2">
                            <span className="font-label text-[8px] tracking-[0.15em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
                              vibe
                            </span>
                            <span className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.5)'}}>
                              {verifyResult.vibe}
                            </span>
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t" style={{borderColor: `rgba(105,201,208,0.15)`}}>
                          <p className="font-label text-[8px] tracking-[0.2em] uppercase" style={{color: `rgba(105,201,208,0.7)`}}>
                            she checks out. proceed with the evening.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-3xl mb-3">⚠️</div>
                        <p className="font-display text-base tracking-wide mb-2" style={{color: 'rgba(255,77,125,0.8)'}}>
                          member not found
                        </p>
                        <p className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.3)'}}>
                          No Finesse member matches that name. Proceed with caution.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!verifyResult && (
                <div className="text-center mt-10 space-y-2">
                  <p className="font-label text-[8px] tracking-[0.3em] uppercase mb-4" style={{color: 'rgba(244,232,208,0.12)'}}>
                    what we check
                  </p>
                  {['active membership status', 'verified profile photo', 'account age & activity', 'platform reputation score'].map((c) => (
                    <p key={c} className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.2)'}}>
                      — {c}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ FINESSE SPLIT ═══ */}
          {tab === 'split' && (
            <motion.div key="split" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
                <span className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `rgba(105,201,208,0.4)`}}>
                  finesse split
                </span>
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
              </div>

              <div className="text-center mb-6">
                <div className="inline-block px-10 py-6" style={{border: `1px solid rgba(105,201,208,0.2)`, background: 'rgba(10,4,6,0.6)'}}>
                  <p className="font-label text-[9px] tracking-[0.4em] uppercase mb-2" style={{color: `rgba(105,201,208,0.4)`}}>
                    total tonight
                  </p>
                  <p className="font-display text-5xl" style={{color: TEAL, textShadow: `0 0 25px rgba(105,201,208,0.2)`}}>
                    {formatPrice(splitTotal)}
                  </p>
                </div>
              </div>

              {/* Mode selector */}
              <div className="flex gap-2 mb-6">
                {(
                  [
                    {key: 'all', label: "I've got it"},
                    {key: 'fair', label: 'fair split'},
                    {key: 'cover', label: 'my share'},
                  ] as const
                ).map(({key, label}) => (
                  <button
                    key={key}
                    onClick={() => setSplitMode(key)}
                    className="flex-1 py-2.5 font-label text-[9px] tracking-[0.15em] uppercase transition-all"
                    style={{
                      background: splitMode === key ? TEAL : 'transparent',
                      color: splitMode === key ? '#0A0406' : 'rgba(244,232,208,0.25)',
                      border: splitMode === key ? 'none' : '1px solid rgba(244,232,208,0.08)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {splitMode === 'fair' && (
                  <motion.div
                    initial={{opacity: 0, height: 0}}
                    animate={{opacity: 1, height: 'auto'}}
                    exit={{opacity: 0, height: 0}}
                    className="overflow-hidden mb-6"
                  >
                    <div className="p-4" style={{border: '1px solid rgba(244,232,208,0.06)', background: 'rgba(10,4,6,0.4)'}}>
                      <p className="font-label text-[8px] tracking-[0.3em] uppercase mb-3" style={{color: 'rgba(244,232,208,0.2)'}}>
                        party size
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSplitParty(Math.max(2, splitParty - 1))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{border: `1px solid rgba(105,201,208,0.3)`, color: TEAL}}
                        >
                          −
                        </button>
                        <span className="font-mono text-2xl flex-1 text-center" style={{color: 'rgba(244,232,208,0.8)'}}>
                          {splitParty}
                        </span>
                        <button
                          onClick={() => setSplitParty(Math.min(10, splitParty + 1))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{border: `1px solid rgba(105,201,208,0.3)`, color: TEAL}}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {splitMode === 'cover' && (
                  <motion.div
                    initial={{opacity: 0, height: 0}}
                    animate={{opacity: 1, height: 'auto'}}
                    exit={{opacity: 0, height: 0}}
                    className="overflow-hidden mb-6"
                  >
                    <div className="p-4" style={{border: '1px solid rgba(244,232,208,0.06)', background: 'rgba(10,4,6,0.4)'}}>
                      <p className="font-label text-[8px] tracking-[0.3em] uppercase mb-3" style={{color: 'rgba(244,232,208,0.2)'}}>
                        my share
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setMySharePct(Math.max(10, mySharePct - 10))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{border: `1px solid rgba(105,201,208,0.3)`, color: TEAL}}
                        >
                          −
                        </button>
                        <span className="font-mono text-2xl flex-1 text-center" style={{color: 'rgba(244,232,208,0.8)'}}>
                          {mySharePct}%
                        </span>
                        <button
                          onClick={() => setMySharePct(Math.min(100, mySharePct + 10))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{border: `1px solid rgba(105,201,208,0.3)`, color: TEAL}}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result rows */}
              <div className="space-y-2">
                <div
                  className="flex justify-between px-4 py-3"
                  style={{border: '1px solid rgba(244,232,208,0.04)', background: 'rgba(10,4,6,0.4)'}}
                >
                  <span className="font-label text-[9px] tracking-[0.25em] uppercase" style={{color: 'rgba(244,232,208,0.3)'}}>
                    you pay
                  </span>
                  <span className="font-mono text-lg" style={{color: TEAL}}>
                    {formatPrice(myShareAmount)}
                  </span>
                </div>

                {splitMode !== 'all' && (
                  <div
                    className="flex justify-between px-4 py-3"
                    style={{border: '1px solid rgba(244,232,208,0.04)', background: 'rgba(10,4,6,0.3)'}}
                  >
                    <span className="font-label text-[9px] tracking-[0.25em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
                      she covers
                    </span>
                    <span className="font-mono text-base" style={{color: 'rgba(244,232,208,0.4)'}}>
                      {formatPrice(splitTotal - myShareAmount)}
                    </span>
                  </div>
                )}

                <div
                  className="flex justify-between px-4 py-3"
                  style={{border: '1px solid rgba(0,255,136,0.08)', background: 'rgba(0,255,136,0.04)'}}
                >
                  <span className="font-label text-[9px] tracking-[0.25em] uppercase" style={{color: 'rgba(0,255,136,0.4)'}}>
                    est. cashback · not live
                  </span>
                  <span className="font-mono text-base" style={{color: 'rgba(0,255,136,0.7)'}}>
                    +{formatPrice(Math.round(myShareAmount * 0.15))}
                  </span>
                </div>
              </div>

              <p className="text-center font-body text-[10px] italic mt-6" style={{color: 'rgba(244,232,208,0.15)'}}>
                Cashback isn&apos;t live yet — figures here are illustrative only.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 pb-8 text-center">
        <Link href="/lobby" className="font-body text-sm transition-colors" style={{color: 'rgba(244,232,208,0.2)'}}>
          return to the lobby
        </Link>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent" />
    </motion.div>
  );
}
