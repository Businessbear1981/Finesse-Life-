// The Calendar — week strip, day timeline (7 AM–11 PM), Nova's suggestions to add or skip,
// tap an event to move it ±30 min or remove it, and auto-arrange the flexible ones. From the design.
// Sample day until Diary is connected; nothing here books anything outside the app.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {SampleNote, SectionHead, Segmented, s} from './shared';

type Kind = 'self' | 'work' | 'social';
type Ev = {id: string; title: string; t: number; d: number; kind: Kind; flex?: boolean; why?: string};
const PX = 0.8, START = 7 * 60, SPAN = 960;
const fmt = (m: number) => { const t = START + m, hh = Math.floor(t / 60), mm = t % 60; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; };
const BASE: Ev[] = [
  {id: 'gym', title: 'Gym · lower body', t: 0, d: 60, kind: 'self', flex: true},
  {id: 'stand', title: 'Team stand-up', t: 150, d: 30, kind: 'work'},
  {id: 'lunch', title: 'Lunch with Celeste', t: 300, d: 75, kind: 'social'},
  {id: 'salon', title: 'Salon · silk press', t: 540, d: 90, kind: 'self'},
  {id: 'dinner', title: 'Dinner at Lucian', t: 810, d: 120, kind: 'social'},
];
const SUGG: Ev[] = [
  {id: 'walk', title: 'Walk, 30 min', t: 405, d: 30, kind: 'self', flex: true, why: 'gap after lunch'},
  {id: 'board', title: 'Founders’ Table · Game Room', t: 690, d: 60, kind: 'social', why: '2 seats open'},
  {id: 'stretch', title: 'Stretch & breathe', t: 480, d: 15, kind: 'self', flex: true, why: 'before the salon'},
];
const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function Calendar({side}: {side: Side}) {
  const acc = track[side].acc;
  const KIND: Record<Kind, [string, string]> = {self: ['#7AF5B8', 'rgba(0,255,136,0.08)'], work: [deco.brass, 'rgba(201,169,97,0.1)'], social: [acc, 'rgba(255,77,125,0.1)']};
  const [day, setDay] = useState(3);
  const [view, setView] = useState<'day' | 'month'>('day');
  const [evs, setEvs] = useState<Ev[]>(BASE);
  const [handled, setHandled] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const selEv = evs.find((e) => e.id === sel);
  const shift = (dm: number) => setEvs((l) => l.map((e) => (e.id === sel ? {...e, t: Math.max(0, Math.min(SPAN - e.d, e.t + dm))} : e)));
  const arrange = () => setEvs((list) => {
    const placed = list.filter((e) => !e.flex).sort((a, b) => a.t - b.t);
    list.filter((e) => e.flex).forEach((e) => {
      let t = 0;
      for (const f of [...placed].sort((a, b) => a.t - b.t)) { if (t + e.d <= f.t) break; t = Math.max(t, f.t + f.d); }
      placed.push({...e, t: Math.min(t, SPAN - e.d)});
    });
    return placed;
  });
  const sugg = SUGG.filter((g) => !handled.includes(g.id));

  return (
    <View style={{gap: 10}}>
      <View style={{flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)'}}>
        {DOW.map((d, i) => {
          const on = i === day;
          return (
            <Pressable key={d} onPress={() => setDay(i)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${DAYS[i]} ${13 + i} October`}
              style={{flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 1, backgroundColor: on ? deco.brassHighlight : 'transparent'}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 8, color: on ? '#140E08' : 'rgba(244,232,208,0.7)'}}>{d}</Text>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 14, color: on ? '#140E08' : deco.cream}}>{13 + i}</Text>
              <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: [1, 3, 4, 5].includes(i) ? (on ? '#140E08' : acc) : 'transparent'}} />
            </Pressable>
          );
        })}
      </View>
      <Segmented options={[['day', 'DAY'], ['month', 'MONTH']]} value={view} onChange={setView} />

      {view === 'month' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 6}}>
          <SectionHead>OCTOBER 2026</SectionHead>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {DOW.map((d) => <Text key={d} style={{width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.mono, fontSize: 8, color: deco.brass, paddingVertical: 4}}>{d[0]}</Text>)}
            {Array.from({length: 35}, (_, i) => {
              const n = i - 2; const real = n >= 1 && n <= 31;
              return (
                <Pressable key={i} disabled={!real} onPress={() => { if (n >= 13 && n <= 19) setDay(n - 13); setView('day'); }}
                  style={{width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(201,169,97,0.15)', backgroundColor: n === 13 + day ? 'rgba(232,200,122,0.15)' : 'transparent'}}>
                  <Text style={{fontFamily: fonts.body, fontSize: 11, color: real ? deco.cream : 'transparent'}}>{real ? n : ''}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.small}>Tap a date to open the day.</Text>
        </Animated.View>
      ) : (
        <>
          {sugg.length ? (
            <Animated.View entering={FadeInDown.duration(400)} style={{padding: 10, gap: 6, borderWidth: 1, borderColor: deco.brassHighlight, backgroundColor: 'rgba(232,200,122,0.06)'}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>NOVA FOUND TIME</Text>
              {sugg.map((g) => (
                <Animated.View key={g.id} layout={LinearTransition} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <View style={{flex: 1}}>
                    <Text style={s.body}>{g.title}</Text>
                    <Text style={s.small}>{fmt(g.t)} · {g.why}</Text>
                  </View>
                  <SmallBtn label="+" a11y={`Add ${g.title}`} onPress={() => { setEvs((l) => [...l, {...g}]); setHandled((h) => [...h, g.id]); setSel(g.id); }} />
                  <SmallBtn label="×" a11y={`Skip ${g.title}`} onPress={() => setHandled((h) => [...h, g.id])} />
                </Animated.View>
              ))}
            </Animated.View>
          ) : null}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>{DAYS[day]} {13 + day} OCT</Text>
            <Pressable onPress={arrange} accessibilityRole="button" style={{borderWidth: 1, borderColor: deco.brass, paddingHorizontal: 8, minHeight: 32, justifyContent: 'center'}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.cream}}>AUTO-ARRANGE FLEX</Text>
            </Pressable>
          </View>
          <View style={{height: SPAN * PX + 10, borderLeftWidth: 1, borderColor: 'rgba(201,169,97,0.3)', marginLeft: 26}}>
            {Array.from({length: 17}, (_, i) => (
              <View key={i} style={{position: 'absolute', top: i * 60 * PX, left: -26, right: 0, flexDirection: 'row', alignItems: 'flex-start'}}>
                <Text style={{width: 24, fontFamily: fonts.mono, fontSize: 8, color: 'rgba(244,232,208,0.5)', marginTop: -5}}>{((7 + i + 11) % 12) + 1}{7 + i < 12 ? 'a' : 'p'}</Text>
                <View style={{flex: 1, height: 1, backgroundColor: 'rgba(201,169,97,0.12)'}} />
              </View>
            ))}
            {evs.map((e) => {
              const on = e.id === sel; const [bar, bg] = KIND[e.kind];
              return (
                <Animated.View key={e.id} layout={LinearTransition.duration(300)} style={{position: 'absolute', left: 6, right: 0, top: e.t * PX, height: Math.max(24, e.d * PX - 2)}}>
                  <Pressable onPress={() => setSel(on ? null : e.id)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${e.title}, ${fmt(e.t)} to ${fmt(e.t + e.d)}`}
                    style={{flex: 1, borderLeftWidth: 3, borderColor: bar, backgroundColor: on ? deco.brassHighlight : bg, paddingHorizontal: 6, paddingVertical: 2, borderWidth: on ? 2 : 0, borderRightColor: deco.brassWhite, borderTopColor: deco.brassWhite, borderBottomColor: deco.brassWhite}}>
                    <Text numberOfLines={1} style={{fontFamily: fonts.bodyStrong, fontSize: 11, color: on ? '#140E08' : deco.cream}}>{e.title}{e.flex ? ' · flex' : ''}</Text>
                    {e.d >= 45 ? <Text style={{fontFamily: fonts.mono, fontSize: 8, color: on ? '#140E08' : 'rgba(244,232,208,0.6)'}}>{fmt(e.t)}–{fmt(e.t + e.d)}</Text> : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
          {selEv ? (
            <Animated.View entering={FadeInDown.duration(300)} style={{padding: 10, gap: 8, borderWidth: 2, borderColor: deco.brassHighlight}}>
              <Text style={s.body}>{selEv.title} · {fmt(selEv.t)}–{fmt(selEv.t + selEv.d)}</Text>
              <View style={{flexDirection: 'row', gap: 6}}>
                {[['−30 MIN', () => shift(-30)], ['+30 MIN', () => shift(30)], ['REMOVE', () => { setEvs((l) => l.filter((x) => x.id !== sel)); setSel(null); }]].map(([l, f]) => (
                  <Pressable key={l as string} onPress={f as () => void} accessibilityRole="button" style={{flex: 1, minHeight: 38, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}>
                    <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.cream}}>{l as string}</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          ) : null}
        </>
      )}
      <SampleNote>SAMPLE DAY · NOT YOUR DIARY · CHANGES HERE ARE NOT SAVED</SampleNote>
    </View>
  );
}

function SmallBtn({label, a11y, onPress}: {label: string; a11y: string; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}
      style={{width: 36, height: 36, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{color: deco.brassHighlight, fontSize: 16}}>{label}</Text>
    </Pressable>
  );
}
