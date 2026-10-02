// The Gym — TRAIN (set log + rest timer), EAT (macros to target, plates, fill the gap), SCAN, WELLNESS.
// Follows the design. Sets are posted to /api/gym/sets when the member is signed in; the programme,
// plates and targets are sample content until the interview has set them.
import {useEffect, useRef, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {api} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {ActionBar, SampleNote, SectionHead, Segmented, s} from './shared';

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
    <View style={{gap: 12}}>
      <Segmented options={[['TRAIN', 'TRAIN'], ['EAT', 'EAT'], ['SCAN', 'SCAN'], ['WELLNESS', 'WELL']]} value={tab} onChange={setTab} />
      {tab === 'TRAIN' ? <Train side={side} /> : tab === 'EAT' ? <Eat side={side} /> : tab === 'SCAN' ? <Scan /> : <Wellness side={side} />}
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
  const toggle = (i: number) => {
    const on = mine.includes(i);
    setDone((d) => ({...d, [li % LIFTS.length]: on ? mine.filter((x) => x !== i) : [...mine, i]}));
    if (!on) {
      setRest(90); setRunning(true);
      const [kg, reps] = sets[i];
      void api('/api/gym/sets', {method: 'POST', json: {exercise: name, weightKg: kg, reps, restS: 90}}); // stays local if signed out
    }
  };
  const pct = rest / 90;
  return (
    <View style={{gap: 10}}>
      <View style={{flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderWidth: 1, borderColor: 'rgba(0,255,136,0.35)', backgroundColor: 'rgba(0,255,136,0.05)'}}>
        <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#00FF88'}} />
        <View><Text style={{fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, color: '#7AF5B8'}}>RECOVERY · READY</Text><Text style={s.small}>7h 40m sleep · resting HR 54</Text></View>
      </View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6, borderBottomWidth: 2, borderColor: deco.brass}}>
        <Text style={{fontFamily: fonts.label, fontSize: 16, color: deco.cream}}>{name}</Text>
        <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brass}}>EXERCISE {(li % LIFTS.length) + 1} OF {LIFTS.length}</Text>
      </View>
      {sets.map(([kg, reps], i) => {
        const on = mine.includes(i);
        return (
          <View key={i} style={{flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 6, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.2)'}}>
            <Text style={{width: 26, fontFamily: fonts.capsBold, fontSize: 16, color: deco.brassHighlight}}>{i + 1}</Text>
            <Text style={[s.body, {flex: 1}]}>{kg} kg</Text>
            <Text style={[s.body, {flex: 1}]}>{reps} reps</Text>
            <Pressable onPress={() => toggle(i)} accessibilityRole="checkbox" accessibilityState={{checked: on}} accessibilityLabel={`Set ${i + 1} done`}
              style={{width: 44, height: 40, borderWidth: 2, borderColor: deco.brass, backgroundColor: on ? deco.brassHighlight : 'transparent', alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{color: '#140E08', fontSize: 16}}>{on ? '✓' : ''}</Text>
            </Pressable>
          </View>
        );
      })}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
        <View style={{width: 64, height: 64, alignItems: 'center', justifyContent: 'center'}}>
          <Svg width={64} height={64} style={{position: 'absolute'}}>
            <Circle cx={32} cy={32} r={28} stroke="rgba(201,169,97,0.25)" strokeWidth={4} fill="none" />
            <Circle cx={32} cy={32} r={28} stroke={deco.brassHighlight} strokeWidth={4} fill="none" strokeDasharray={`${2 * Math.PI * 28 * pct} 999`} transform="rotate(-90 32 32)" strokeLinecap="round" />
          </Svg>
          <Text style={{fontFamily: fonts.mono, fontSize: 13, color: deco.cream}}>{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}</Text>
        </View>
        <View style={{gap: 6}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>REST TIMER</Text>
          <Pressable onPress={() => setRunning((r) => !r)} accessibilityRole="button" style={{borderWidth: 1, borderColor: deco.brass, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center'}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: deco.cream}}>{running ? 'PAUSE' : rest < 90 ? 'RESUME' : 'START 1:30'}</Text>
          </Pressable>
        </View>
      </View>
      <ActionBar label="NEXT EXERCISE" color={track[side].acc} onPress={() => { setRunning(false); setRest(90); setLi((x) => x + 1); }} />
      <SampleNote>SAMPLE PROGRAMME · TICKED SETS ARE SAVED TO YOUR LOG WHEN YOU ARE SIGNED IN</SampleNote>
    </View>
  );
}

function Eat({side}: {side: Side}) {
  const tgt = TGT[side], plates = PLATES[side];
  const [eaten, setEaten] = useState<number[]>([0]);
  const [gap, setGap] = useState(false);
  const sum = (k: number) => plates.reduce((a, p, i) => a + (eaten.includes(i) ? Number(p[k]) : 0), 0) + (gap ? GAP[side].mac[k - 2] : 0);
  const got = {kcal: sum(2), p: sum(3), c: sum(4), f: sum(5)};
  const rows: Array<[string, number, number, string, string]> = [['CALORIES', got.kcal, tgt.kcal, '', deco.brassHighlight], ['PROTEIN', got.p, tgt.p, 'g', '#7AF5B8'], ['CARBS', got.c, tgt.c, 'g', deco.brassLight], ['FAT', got.f, tgt.f, 'g', '#FF8FA9']];
  return (
    <View style={{gap: 10}}>
      <Text style={{fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 23, color: deco.cream}}>{got.kcal} of {tgt.kcal.toLocaleString()} kcal. Eat, don’t starve.</Text>
      <Text style={s.small}>Targets from your interview and training days. Hit protein first; the rest follows.</Text>
      {rows.map(([label, a, b, u, color]) => (
        <View key={label} style={{gap: 4}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: deco.brassHighlight}}>{label}</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.cream}}>{a}{u} / {b}{u}</Text>
          </View>
          <View style={{height: 6, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)'}}><View style={{width: `${Math.min(100, Math.round((a / b) * 100))}%`, height: '100%', backgroundColor: color}} /></View>
        </View>
      ))}
      <SectionHead>TODAY’S PLATES</SectionHead>
      {plates.map(([when, dish, k, p, c, f], i) => {
        const on = eaten.includes(i);
        return (
          <View key={when} style={{flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.2)'}}>
            <View style={{flex: 1}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{when}</Text>
              <Text style={s.body}>{dish}</Text>
              <Text style={s.small}>{k} kcal · {p}P {c}C {f}F</Text>
            </View>
            <Pressable onPress={() => setEaten((e) => (on ? e.filter((x) => x !== i) : [...e, i]))} accessibilityRole="checkbox" accessibilityState={{checked: on}} accessibilityLabel={`${dish} eaten`}
              style={{width: 44, height: 40, borderWidth: 2, borderColor: deco.brass, backgroundColor: on ? deco.brassHighlight : 'transparent', alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{color: '#140E08', fontSize: 16}}>{on ? '✓' : ''}</Text>
            </Pressable>
          </View>
        );
      })}
      <View style={{padding: 12, gap: 4, borderWidth: 2, borderColor: track[side].acc}}>
        <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: track[side].acc}}>FILL THE GAP</Text>
        <Text style={s.small}>Still to go: {Math.max(0, tgt.p - got.p)}g protein, {Math.max(0, tgt.c - got.c)}g carbs.</Text>
        <Text style={s.body}>{GAP[side].dish}</Text>
        <Text style={s.small}>{GAP[side].mac[0]} kcal · {GAP[side].mac[1]}P {GAP[side].mac[2]}C {GAP[side].mac[3]}F</Text>
        <Pressable onPress={() => setGap((g) => !g)} accessibilityRole="button" style={{marginTop: 6, minHeight: 40, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: deco.cream}}>{gap ? 'ADDED · TAP TO REMOVE' : 'ADD TO TODAY'}</Text>
        </Pressable>
      </View>
      <SampleNote>SAMPLE PLAN · YOUR TARGETS COME FROM THE INTERVIEW</SampleNote>
    </View>
  );
}

function Scan() {
  return (
    <View style={{gap: 10}}>
      <View style={{height: 200, borderWidth: 2, borderColor: deco.brass, backgroundColor: '#050302', alignItems: 'center', justifyContent: 'center', gap: 8}}>
        <Icon name="eye" size={40} color={deco.brass} strokeWidth={1.2} />
        <Text style={s.small}>Point the camera at your plate.</Text>
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
    <View style={{gap: 10}}>
      {items.map(([t, d]) => (
        <View key={t} style={{padding: 12, borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)', gap: 4}}>
          <Text style={{fontFamily: fonts.label, fontSize: 15, color: deco.cream}}>{t}</Text>
          <Text style={s.small}>{d}</Text>
        </View>
      ))}
      <Text style={s.small}>Prescription programmes need a licensed clinician visit and may need labs. Not available in every state. Supplements are not intended to diagnose or treat any condition.</Text>
    </View>
  );
}
