// The Gym — TRAIN (set log + rest timer), EAT (macros to target, plates, fill the gap), SCAN, WELLNESS.
// Follows the design. Sets are posted to /api/gym/sets when the member is signed in; the programme,
// plates and targets are sample content until the interview has set them.
import {useEffect, useRef, useState} from 'react';
import {Text, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import Animated, {FadeIn} from 'react-native-reanimated';
import {api} from '@/lib/api';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {AHCard, AHEyebrow, AHLiveDot, AHPill, AHTitle} from '@/components/ah';
import {ActionBar, SampleNote, Segmented, s} from './shared';
import {Meta, NumRow, Tick} from './live';

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
        {tab === 'TRAIN' ? <Train side={side} /> : tab === 'EAT' ? <Eat side={side} /> : tab === 'SCAN' ? <Scan /> : <Wellness side={side} />}
      </Animated.View>
    </View>
  );
}

function Train({side}: {side: Side}) {
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
  // Server ids of logged sets, keyed by `${lift}:${set}`. A tick POSTs once; an untick DELETEs the row,
  // so re-ticking never duplicates. While a POST is in flight the latest wish (keep / drop) is recorded
  // and applied when it returns.
  const logged = useRef<Record<string, {id?: string; inFlight?: boolean; want: boolean}>>({});
  const sync = async (key: string, payload: {exercise: string; weightKg: number; reps: number; restS: number}) => {
    const e = logged.current[key];
    if (!e || e.inFlight) return;
    if (e.want && !e.id) {
      e.inFlight = true;
      const r = await api<{set?: {id: string}}>('/api/gym/sets', {method: 'POST', json: payload}); // stays local if signed out
      e.inFlight = false;
      if (r.ok && r.body.set?.id) e.id = r.body.set.id;
      if (!e.want && e.id) void sync(key, payload);
    } else if (!e.want && e.id) {
      const id = e.id;
      e.inFlight = true;
      const r = await api(`/api/gym/sets?id=${encodeURIComponent(id)}`, {method: 'DELETE'});
      e.inFlight = false;
      if (r.ok || r.status === 404) e.id = undefined;
      if (e.want && !e.id) void sync(key, payload);
    }
  };
  const toggle = (i: number) => {
    const on = mine.includes(i);
    const lift = li % LIFTS.length;
    setDone((d) => ({...d, [lift]: on ? mine.filter((x) => x !== i) : [...mine, i]}));
    if (!on) { setRest(90); setRunning(true); }
    const key = `${lift}:${i}`;
    const [kg, reps] = sets[i];
    logged.current[key] = {...(logged.current[key] ?? {}), want: !on};
    void sync(key, {exercise: name, weightKg: kg, reps, restS: 90});
  };
  const pct = rest / 90;
  const R = 34, C = 2 * Math.PI * R;
  return (
    <View style={{gap: 16}}>
      <AHCard pad={16} style={{flexDirection: 'row', gap: 12, alignItems: 'center', borderColor: 'rgba(126,226,184,0.25)'}}>
        <AHLiveDot color={ah.ok} />
        <View style={{flex: 1}}>
          <Meta color={ah.ok}>Recovery · ready</Meta>
          <Text style={[s.small, {marginTop: 2}]}>7h 40m sleep · resting HR 54</Text>
        </View>
      </AHCard>

      <View style={{gap: 4}}>
        <AHEyebrow>Exercise {(li % LIFTS.length) + 1} of {LIFTS.length}</AHEyebrow>
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
      <SampleNote>Sample programme · ticked sets are saved to your log when you are signed in</SampleNote>
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
      <SampleNote>Sample plan · your targets come from the interview</SampleNote>
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
