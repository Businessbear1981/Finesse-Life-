// The Gym — TRAIN (set log, rest timer, recovery read, your week), EAT (today's plates), SCAN, WELLNESS.
// Signed in, TRAIN is the member's own: GET /api/gym/today (today's sets + volume), GET /api/gym/recovery
// (explainable read from logged sets — wearables aren't connected, so no sleep or heart rate is ever shown),
// POST/DELETE /api/gym/sets, POST /api/gym/rest-timer (server-stamped end time) and the planned week
// /api/gym/sessions (the member's notes — nothing is booked with a studio). Nova can draft the training week
// (/api/nova/requests, kind 'plan'). EAT reads today's plates from the Kitchen plan (/api/kitchen/plan).
// Signed out, TRAIN and EAT are labelled samples.
import {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import Animated, {FadeIn} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {AHCard, AHEyebrow, AHInput, AHLiveDot, AHPill, AHTitle} from '@/components/ah';
import {KIND_LABEL, RECOVERY_LABEL, addSession, deleteSession, deleteSet, logSet, patchSession, readRecovery, readToday, readWeek, stampRest,
  type GymToday, type GymWeek, type Recovery, type SessionKind} from '@/lib/rooms/gym';
import {ActionBar, SampleNote, Segmented, s} from './shared';
import {LiveGate, Meta, NumRow, OK_GREEN, RowBtn, Status, Tick} from './live';
import {PlanWithNova} from './plan-with-nova';

type Tab = 'TRAIN' | 'EAT' | 'SCAN' | 'WELLNESS';
const LIFTS: Array<[string, Array<[number, number]>]> = [
  ['Romanian deadlift', [[60, 8], [65, 8], [70, 6], [70, 6]]],
  ['Hip thrust', [[80, 10], [90, 8], [90, 8]]],
  ['Cable row', [[35, 12], [40, 10], [40, 10]]],
];
const TGT = {her: {kcal: 1900, p: 130, c: 190, f: 65}, him: {kcal: 2600, p: 190, c: 260, f: 85}};
const PLATES: Record<Side, Array<[string, string, number, number, number, number]>> = {
  her: [['BREAKFAST', 'Greek yogurt, berries, granola', 380, 28, 48, 9], ['LUNCH', 'Chicken, farro, roast veg', 560, 46, 58, 16], ['SNACK', 'Protein shake, banana', 290, 30, 34, 4], ['DINNER', 'Salmon, rice, greens', 640, 42, 62, 22]],
  him: [['BREAKFAST', 'Eggs, oats, berries', 620, 38, 70, 20], ['LUNCH', 'Steak, rice, peppers', 820, 62, 86, 24], ['SNACK', 'Protein shake, peanut butter toast', 480, 42, 40, 16], ['DINNER', 'Chicken thighs, potatoes, salad', 760, 56, 70, 26]],
};
const GAP: Record<Side, {dish: string; mac: [number, number, number, number]}> = {her: {dish: 'Cottage cheese, honey, walnuts', mac: [210, 36, 6, 4]}, him: {dish: 'Double chicken wrap, side of fruit', mac: [300, 48, 10, 6]}};

export function Gym({side}: {side: Side}) {
  const [tab, setTab] = useState<Tab>('TRAIN');
  return (
    <View style={{gap: 18}}>
      <Segmented options={[['TRAIN', 'Train'], ['EAT', 'Eat'], ['SCAN', 'Scan'], ['WELLNESS', 'Wellness']]} value={tab} onChange={setTab} />
      <Animated.View key={tab} entering={FadeIn.duration(250)}>
        {tab === 'TRAIN' ? <TrainTab side={side} /> : tab === 'EAT' ? <EatTab side={side} /> : tab === 'SCAN' ? <Scan /> : <Wellness side={side} />}
      </Animated.View>
    </View>
  );
}

/* ─────────────── TRAIN (live) ─────────────── */

function TrainTab({side}: {side: Side}) {
  const {live, reload} = useLive<GymToday>('/api/gym/today', readToday);
  return (
    <LiveGate live={live} reload={() => void reload()} what="your training log" signedOut={<SampleTrain side={side} />}>
      {(data) => <LiveTrain data={data} side={side} reload={() => reload(true)} />}
    </LiveGate>
  );
}

function RecoveryCard({fallback}: {fallback: Recovery}) {
  // /api/gym/recovery is the source of truth for the read; today's payload is shown until it answers.
  const [rec, setRec] = useState<Recovery>(fallback);
  const [src, setSrc] = useState('manual sets');
  useEffect(() => {
    let alive = true;
    void readRecovery().then((r) => { if (alive && r.ok && r.body.recovery) { setRec(r.body.recovery); setSrc((r.body.sources ?? ['manual sets']).join(', ')); } });
    return () => { alive = false; };
  }, [fallback.hoursSince, fallback.lastLoad]);
  const ready = rec.status === 'ready';
  return (
    <AHCard pad={16} style={{gap: 8, borderColor: ready ? 'rgba(126,226,184,0.25)' : ah.line2}}>
      <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
        <AHLiveDot color={ready ? ah.ok : rec.status === 'recovering' ? ah.rose : ah.platinum} pulse={ready} />
        <View style={{flex: 1}}>
          <Meta color={ready ? ah.ok : ah.mute}>Recovery · {RECOVERY_LABEL[rec.status]}</Meta>
          {rec.status !== 'no_data' ? <Text style={[s.small, {marginTop: 2}]}>{rec.hoursSince ?? '–'}h since your last session · needs ~{rec.hoursNeeded ?? '–'}h · last load {rec.lastLoad.toLocaleString()} kg</Text> : null}
        </View>
      </View>
      <Text style={s.small}>{rec.note}</Text>
      <Text style={[s.small, {color: ah.faint}]}>From {src}. Wearables connect soon — sleep and heart rate aren’t read yet.</Text>
    </AHCard>
  );
}

function RestTimer({acc}: {acc: string}) {
  const [rest, setRest] = useState<{endsAt: number; total: number} | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rest]);
  const start = async (seconds: number) => {
    setNote(null);
    const r = await stampRest(seconds);
    // The server stamps the end so a resumed screen stays accurate; the device clock is the fallback.
    const endsAt = r.ok && r.body.endsAt ? new Date(r.body.endsAt).getTime() : Date.now() + seconds * 1000;
    if (!r.ok) setNote('Timing on this device — the house clock did not answer.');
    setNow(Date.now());
    setRest({endsAt, total: seconds});
  };
  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  const pct = rest ? left / rest.total : 1;
  const R = 34, C = 2 * Math.PI * R;
  return (
    <AHCard style={{flexDirection: 'row', alignItems: 'center', gap: 18}}>
      <View style={{width: 84, height: 84, alignItems: 'center', justifyContent: 'center'}}>
        <Svg width={84} height={84} style={{position: 'absolute'}}>
          <Circle cx={42} cy={42} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={4} fill="none" />
          <Circle cx={42} cy={42} r={R} stroke={acc === ah.rose ? ah.rose : ah.white} strokeWidth={4} fill="none" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 42 42)" strokeLinecap="round" />
        </Svg>
        <Text style={{fontFamily: ahFonts.serif, fontSize: 24, color: ah.text}} accessibilityLiveRegion={left === 0 ? 'assertive' : 'none'}
          accessibilityLabel={rest ? (left === 0 ? 'Rest over' : `Rest ${left} seconds left`) : 'Rest timer idle'}>
          {rest ? (left === 0 ? 'Go.' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`) : '—'}
        </Text>
      </View>
      <View style={{flex: 1, gap: 10}}>
        <AHEyebrow>Rest timer</AHEyebrow>
        <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
          {[60, 90, 120].map((sec) => <RowBtn key={sec} label={`${sec}s`} a11y={`Rest ${sec} seconds`} onPress={() => void start(sec)} />)}
        </View>
        {note ? <Text style={s.small}>{note}</Text> : null}
      </View>
    </AHCard>
  );
}

const num = (v: string) => (v.trim() === '' ? null : Number(v));

function LiveTrain({data, side, reload}: {data: GymToday; side: Side; reload: () => Promise<void>}) {
  const acc = track[side].acc;
  const [ex, setEx] = useState('');
  const [kg, setKg] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);

  const log = async () => {
    const r0 = num(reps), k0 = num(kg);
    if (!ex.trim() || r0 === null || Number.isNaN(r0) || (k0 !== null && Number.isNaN(k0)) || busy) { setMsg({ok: false, text: 'Name the exercise and the reps. Nothing was logged.'}); return; }
    setBusy(true); setMsg(null);
    const r = await logSet({exercise: ex.trim(), reps: Math.round(r0), weightKg: k0, rpe});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was logged.')}); return; }
    setReps(''); setMsg({ok: true, text: 'Logged to your set log.'});
    void reload();
  };
  const remove = async (id: string) => {
    setBusy(true);
    const r = await deleteSet(id);
    setBusy(false);
    if (!r.ok && r.status !== 404) setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was removed.')});
    void reload();
  };

  return (
    <View style={{gap: 16}}>
      <RecoveryCard fallback={data.recovery} />
      <View style={{flexDirection: 'row', gap: 10}}>
        {([['Today', `${data.volumeKg.toLocaleString()} kg`], ['Sets today', String(data.today.length)], ['Days · 7d', String(data.weekSessions)]] as Array<[string, string]>).map(([k, v]) => (
          <AHCard key={k} pad={14} style={{flex: 1, gap: 4}}>
            <Meta>{k}</Meta>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 24, color: ah.text}}>{v}</Text>
          </AHCard>
        ))}
      </View>

      <AHCard style={{gap: 12}}>
        <Meta>Log a set</Meta>
        <AHInput value={ex} onChangeText={(v) => setEx(v.slice(0, 80))} placeholder="Romanian deadlift" accessibilityLabel="Exercise" />
        <View style={{flexDirection: 'row', gap: 10}}>
          <View style={{flex: 1}}><AHInput value={kg} onChangeText={(v) => setKg(v.replace(/[^\d.]/g, '').slice(0, 6))} placeholder="kg" keyboardType="decimal-pad" accessibilityLabel="Weight in kilograms" /></View>
          <View style={{flex: 1}}><AHInput value={reps} onChangeText={(v) => setReps(v.replace(/\D/g, '').slice(0, 3))} placeholder="Reps" keyboardType="number-pad" accessibilityLabel="Reps" /></View>
        </View>
        <View style={{flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center'}}>
          <Text style={[s.small, {marginRight: 4}]}>Effort</Text>
          {[6, 7, 8, 9, 10].map((n) => <RowBtn key={n} label={`RPE ${n}`} tone={rpe === n ? ah.rose : undefined} onPress={() => setRpe(rpe === n ? null : n)} />)}
        </View>
        <ActionBar label={busy ? 'Logging…' : 'Log the set'} color={acc} onPress={log} disabled={busy || !ex.trim() || !reps} />
      </AHCard>
      <Status msg={msg} />

      <RestTimer acc={acc} />

      <View style={{gap: 4}}>
        <AHEyebrow>Today’s sets</AHEyebrow>
        {data.today.length === 0
          ? <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 18, color: ah.mute, paddingVertical: 8}}>Nothing logged today yet.</Text>
          : data.today.map((x, i) => (
            <NumRow key={x.id} n={i + 1} title={x.exercise} sub={`${x.reps ?? '–'} reps${x.weight_kg != null ? ` × ${Number(x.weight_kg)} kg` : ''}${x.rpe ? ` · RPE ${Number(x.rpe)}` : ''}`} last={i === data.today.length - 1}
              right={<RowBtn label="Delete" a11y={`Delete ${x.exercise} set`} onPress={() => void remove(x.id)} disabled={busy} />} />
          ))}
      </View>

      <WeekPlan acc={acc} />
      <PlanWithNova room="gym" topic="other" title="Training week" label="Plan my training week · Nova" acc={acc}
        placeholder={side === 'him' ? 'Four sessions around work, one sauna and cold plunge' : 'Three classes and one strength session, mornings, recovery before Saturday'} />
      <SampleNote>Your log · visible only to you · delete any set at any time · health app sync not connected</SampleNote>
    </View>
  );
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KINDS: SessionKind[] = ['class', 'training', 'recovery', 'other'];

function WeekPlan({acc}: {acc: string}) {
  const [week, setWeek] = useState<GymWeek | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [kind, setKind] = useState<SessionKind>('class');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const seq = useRef(0);
  const load = useCallback(async () => {
    const n = ++seq.current;
    const r = await readWeek();
    if (n !== seq.current) return;
    if (r.ok) { setWeek(r.body); setErr(null); } else setErr(failure(r.status, r.body, 'Your week was not loaded.'));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    if (!week || !title.trim() || busy) return;
    setBusy(true); setMsg(null);
    const r = await addSession({day: week.days[day], kind, title: title.trim()});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was added.')}); return; }
    setTitle(''); setMsg({ok: true, text: 'Added to your week. Your plan — nothing was booked.'});
    void load();
  };
  const act = async (id: string, what: 'done' | 'undo' | 'remove') => {
    setBusy(true);
    const r = what === 'remove' ? await deleteSession(id) : await patchSession(id, {done: what === 'done'});
    setBusy(false);
    if (!r.ok) setMsg({ok: false, text: failure(r.status, r.body)});
    void load();
  };

  if (err) return <Text style={s.small}>{err}</Text>;
  if (!week) return <Text style={s.small}>Opening your week…</Text>;
  const trained = new Set(week.trainedDays);
  return (
    <AHCard style={{gap: 12}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <Meta>This week · your plan</Meta>
        <Text style={s.small}>{trained.size} trained · {week.sessions.filter((x) => x.done).length}/{week.sessions.length} done</Text>
      </View>
      <View style={{flexDirection: 'row', gap: 4}}>
        {week.days.map((d, i) => {
          const on = i === day;
          return (
            <Pressable key={d} onPress={() => setDay(i)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${DOW[i]}${trained.has(d) ? ', trained' : ''}`}
              style={{flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? ah.white : 'rgba(255,255,255,0.05)'}}>
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, color: on ? '#000' : ah.mute}}>{DOW[i]}</Text>
              <Text style={{fontSize: 11, color: trained.has(d) ? (on ? '#000' : OK_GREEN) : on ? '#555' : ah.faint}}>{trained.has(d) ? '✓' : '·'}</Text>
            </Pressable>
          );
        })}
      </View>
      {week.sessions.filter((x) => x.day === week.days[day]).length === 0
        ? <Text style={s.small}>Nothing planned for {DOW[day]}.</Text>
        : week.sessions.filter((x) => x.day === week.days[day]).map((x) => (
          <View key={x.id} style={{flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderTopWidth: 1, borderColor: ah.line}}>
            <Tick on={x.done} onPress={() => void act(x.id, x.done ? 'undo' : 'done')} label={`${x.title} done`} />
            <View style={{flex: 1}}>
              <Text style={{fontFamily: ahFonts.serif, fontSize: 19, color: x.done ? ah.mute : ah.text}}>{x.title}</Text>
              <Text style={s.small}>{KIND_LABEL[x.kind]}{x.at_time ? ` · ${x.at_time.slice(0, 5)}` : ''}{x.venue ? ` · ${x.venue}` : ''}</Text>
            </View>
            <RowBtn label="Remove" a11y={`Remove ${x.title}`} onPress={() => void act(x.id, 'remove')} disabled={busy} />
          </View>
        ))}
      <View style={{flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>
        {KINDS.map((k) => <RowBtn key={k} label={KIND_LABEL[k]} tone={kind === k ? ah.rose : undefined} onPress={() => setKind(k)} />)}
      </View>
      <AHInput value={title} onChangeText={(v) => setTitle(v.slice(0, 120))} placeholder={`Add to ${DOW[day]} — barre, legs, sauna…`} accessibilityLabel="Add a session" />
      <ActionBar label={busy ? 'Adding…' : `Add to ${DOW[day]}`} color={acc} onPress={add} disabled={busy || !title.trim()} />
      <Status msg={msg} />
    </AHCard>
  );
}

/* ─────────────── TRAIN (signed-out sample) ─────────────── */

function SampleTrain({side}: {side: Side}) {
  const [li, setLi] = useState(0);
  const [done, setDone] = useState<Record<number, number[]>>({});
  const [rest, setRest] = useState(90);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!running) { if (timer.current) clearInterval(timer.current); return; }
    timer.current = setInterval(() => setRest((r) => { if (r <= 1) { setRunning(false); return 90; } return r - 1; }), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);
  const [name, sets] = LIFTS[li % LIFTS.length];
  const mine = done[li % LIFTS.length] ?? [];
  const toggle = (i: number) => {
    const on = mine.includes(i);
    setDone((d) => ({...d, [li % LIFTS.length]: on ? mine.filter((x) => x !== i) : [...mine, i]}));
    if (!on) { setRest(90); setRunning(true); }
  };
  const pct = rest / 90;
  const R = 34, C = 2 * Math.PI * R;
  return (
    <View style={{gap: 16, marginTop: 12}}>
      <AHCard pad={16} style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
        <AHLiveDot color={ah.platinum} pulse={false} />
        <View style={{flex: 1}}>
          <Meta>Recovery · sample</Meta>
          <Text style={[s.small, {marginTop: 2}]}>Signed in, this reads from the sets you log. Wearables connect soon.</Text>
        </View>
      </AHCard>

      <View style={{gap: 4}}>
        <AHEyebrow>Sample · exercise {(li % LIFTS.length) + 1} of {LIFTS.length}</AHEyebrow>
        <AHTitle size={38}>{name}</AHTitle>
      </View>

      <AHCard pad={0} style={{paddingHorizontal: 16}}>
        {sets.map(([kg, reps], i) => {
          const on = mine.includes(i);
          return (
            <View key={i} style={{flexDirection: 'row', alignItems: 'center', minHeight: 64, gap: 10, borderBottomWidth: i < sets.length - 1 ? 1 : 0, borderColor: ah.line}}>
              <Text style={{width: 28, fontFamily: ahFonts.sansSemi, fontSize: 11, color: ah.faint}}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={{flex: 1, fontFamily: ahFonts.serif, fontSize: 24, color: on ? ah.mute : ah.text}}>{kg}<Text style={{fontFamily: ahFonts.sans, fontSize: 13, color: ah.mute}}> kg</Text></Text>
              <Text style={{flex: 1, fontFamily: ahFonts.serif, fontSize: 24, color: on ? ah.mute : ah.text}}>{reps}<Text style={{fontFamily: ahFonts.sans, fontSize: 13, color: ah.mute}}> reps</Text></Text>
              <Tick on={on} onPress={() => toggle(i)} label={`Set ${i + 1} done`} />
            </View>
          );
        })}
      </AHCard>

      <AHCard style={{flexDirection: 'row', alignItems: 'center', gap: 18}}>
        <View style={{width: 84, height: 84, alignItems: 'center', justifyContent: 'center'}}>
          <Svg width={84} height={84} style={{position: 'absolute'}}>
            <Circle cx={42} cy={42} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={4} fill="none" />
            <Circle cx={42} cy={42} r={R} stroke={ah.rose} strokeWidth={4} fill="none" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 42 42)" strokeLinecap="round" />
          </Svg>
          <Text style={{fontFamily: ahFonts.serif, fontSize: 24, color: ah.text}} accessibilityLabel={`Rest ${Math.floor(rest / 60)} minutes ${rest % 60} seconds`}>{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}</Text>
        </View>
        <View style={{flex: 1, gap: 10}}>
          <AHEyebrow>Rest timer</AHEyebrow>
          <AHPill small variant="ghost" label={running ? 'Pause' : rest < 90 ? 'Resume' : 'Start 1:30'} onPress={() => setRunning((r) => !r)} />
        </View>
      </AHCard>

      <ActionBar label="Next exercise" color={track[side].acc} onPress={() => { setRunning(false); setRest(90); setLi((x) => x + 1); }} />
      <SampleNote>Sample programme · nothing is saved · sign in to keep your own set log</SampleNote>
    </View>
  );
}

/* ─────────────── EAT ─────────────── */

type Meal = {day: number; slot: string; name: string; kcal?: number | null};
type KitchenPlan = {weekStart: string; dailyKcalTarget: number | null; meals: Meal[]; dailyTotals: number[]};
const mondayISO = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const SLOT_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

function EatTab({side}: {side: Side}) {
  const [week] = useState(mondayISO);
  const {live, reload} = useLive<KitchenPlan>(`/api/kitchen/plan?week=${week}`);
  return (
    <LiveGate live={live} reload={() => void reload()} what="today’s plates" signedOut={<Eat side={side} />}>
      {(plan) => <LiveEat plan={plan} />}
    </LiveGate>
  );
}

/** Today's plates from the member's Kitchen plan. Calories only — macros aren't tracked yet, so none are shown. */
function LiveEat({plan}: {plan: KitchenPlan}) {
  const today = (new Date().getDay() + 6) % 7;
  const plates = plan.meals.filter((m) => m.day === today).sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  const total = plates.reduce((a, m) => a + (m.kcal ?? 0), 0);
  const target = plan.dailyKcalTarget;
  return (
    <View style={{gap: 16}}>
      <AHTitle size={32}>{plates.length ? `${total.toLocaleString()} kcal planned today${target ? ` of ${target.toLocaleString()}` : ''}.` : 'No plates planned today.'}</AHTitle>
      {target ? (
        <View style={{height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden'}}>
          <View style={{width: `${Math.min(100, Math.round((total / target) * 100))}%`, height: '100%', borderRadius: 3, backgroundColor: ah.white}} />
        </View>
      ) : null}
      <View>
        {plates.map((m, i) => <NumRow key={`${m.slot}${i}`} n={i + 1} meta={m.slot} title={m.name} sub={m.kcal != null ? `${m.kcal} kcal` : 'kcal not set'} last={i === plates.length - 1} />)}
      </View>
      <Text style={s.small}>From your week in the Kitchen — plan or change plates there. Macro targets come once your interview sets them; nothing is estimated here.</Text>
    </View>
  );
}

function Eat({side}: {side: Side}) {
  const tgt = TGT[side], plates = PLATES[side];
  const [eaten, setEaten] = useState<number[]>([0]);
  const [gap, setGap] = useState(false);
  const sum = (k: number) => plates.reduce((a, p, i) => a + (eaten.includes(i) ? Number(p[k]) : 0), 0) + (gap ? GAP[side].mac[k - 2] : 0);
  const got = {kcal: sum(2), p: sum(3), c: sum(4), f: sum(5)};
  const rows: Array<[string, number, number, string, string]> = [['Calories', got.kcal, tgt.kcal, '', ah.white], ['Protein', got.p, tgt.p, 'g', ah.ok], ['Carbs', got.c, tgt.c, 'g', ah.platinum], ['Fat', got.f, tgt.f, 'g', ah.rose]];
  const acc = track[side].acc;
  return (
    <View style={{gap: 16}}>
      <View style={{gap: 8}}>
        <AHTitle size={34}>{got.kcal} of {tgt.kcal.toLocaleString()} kcal. Eat, don’t starve.</AHTitle>
        <Text style={s.small}>Targets from your interview and training days. Hit protein first; the rest follows.</Text>
      </View>
      <AHCard style={{gap: 16}}>
        {rows.map(([label, a, b, u, color]) => (
          <View key={label} style={{gap: 8}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
              <Meta>{label}</Meta>
              <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.text}}>{a}{u} <Text style={{color: ah.faint}}>/ {b}{u}</Text></Text>
            </View>
            <View style={{height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden'}}>
              <View style={{width: `${Math.min(100, Math.round((a / b) * 100))}%`, height: '100%', borderRadius: 3, backgroundColor: color}} />
            </View>
          </View>
        ))}
      </AHCard>

      <AHEyebrow style={{marginTop: 6}}>Today’s plates</AHEyebrow>
      <View>
        {plates.map(([when, dish, k, p, c, f], i) => {
          const on = eaten.includes(i);
          return (
            <NumRow key={when} n={i + 1} meta={when} title={dish} sub={`${k} kcal · ${p}P ${c}C ${f}F`} last={i === plates.length - 1}
              right={<Tick on={on} onPress={() => setEaten((e) => (on ? e.filter((x) => x !== i) : [...e, i]))} label={`${dish} eaten`} />} />
          );
        })}
      </View>

      <AHCard style={{gap: 6, borderColor: acc === ah.rose ? 'rgba(232,180,160,0.4)' : ah.line2, backgroundColor: acc === ah.rose ? '#120C0D' : ah.ink2}}>
        <Meta color={acc}>Fill the gap</Meta>
        <Text style={s.small}>Still to go: {Math.max(0, tgt.p - got.p)}g protein, {Math.max(0, tgt.c - got.c)}g carbs.</Text>
        <Text style={{fontFamily: ahFonts.serif, fontSize: 24, lineHeight: 27, color: ah.text, marginTop: 6}}>{GAP[side].dish}</Text>
        <Text style={s.small}>{GAP[side].mac[0]} kcal · {GAP[side].mac[1]}P {GAP[side].mac[2]}C {GAP[side].mac[3]}F</Text>
        <AHPill style={{marginTop: 10}} block variant={gap ? 'ghost' : acc === ah.rose ? 'rose' : 'solid'} label={gap ? 'Added · tap to remove' : 'Add to today'} onPress={() => setGap((g) => !g)} />
      </AHCard>
      <SampleNote>Sample plan · not yours · sign in to see the plates from your Kitchen week</SampleNote>
    </View>
  );
}

function Scan() {
  const k = 22;
  return (
    <View style={{gap: 14}}>
      <View style={{height: 240, borderRadius: radius.hero, backgroundColor: '#070708', borderWidth: 1, borderColor: ah.line, alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden'}}>
        <Svg style={{position: 'absolute', left: 0, top: 0}} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
          {[`M${k} 14 H14 V${k}`, `M${100 - k} 14 H86 V${k}`, `M14 ${100 - k} V86 H${k}`, `M86 ${100 - k} V86 H${100 - k}`].map((d) => <Path key={d} d={d} stroke="rgba(255,255,255,0.4)" strokeWidth={0.8} fill="none" vectorEffect="non-scaling-stroke" />)}
        </Svg>
        <Icon name="eye" size={36} color={ah.platinum} strokeWidth={1.2} />
        <Text style={[s.small, {fontSize: 13}]}>Point the camera at your plate.</Text>
      </View>
      <Text style={s.small}>Food recognition needs the camera and a nutrition partner. It is not connected yet, so nothing is estimated here.</Text>
    </View>
  );
}

function Wellness({side}: {side: Side}) {
  const items = side === 'her'
    ? [['Hormone balance', 'Clinician-led programme · consult first'], ['Collagen', 'Daily staple, shipped monthly']]
    : [['Testosterone', 'Clinician-led programme · consult and labs first'], ['Creatine', 'Daily staple, shipped monthly']];
  return (
    <View style={{gap: 14}}>
      <AHCard pad={0} style={{paddingHorizontal: 16}}>
        {items.map(([t, d], i) => <NumRow key={t} n={i + 1} title={t} sub={d} last={i === items.length - 1} />)}
      </AHCard>
      <Text style={s.small}>Prescription programmes need a licensed clinician visit and may need labs. Not available in every state. Supplements are not intended to diagnose or treat any condition.</Text>
    </View>
  );
}
