// The Calendar — week strip, day timeline (7 AM–11 PM), tap an entry to move it ±30 min, mark it done or
// remove it. From the design. Signed in, the timeline is the member's own Diary (GET /api/diary; moves and
// removals PATCH /api/diary/items/:id and only show once the server confirms). Signed out, the labelled
// sample day (with Nova's suggestions and auto-arrange) is shown; nothing there is saved or booked.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {DIARY_LABEL, addDays, clock, diaryAct, fromISO, localISO, mondayOf, readDiaryDay, type DiaryDay, type DiaryItem} from '@/lib/diary';
import {failure, useLive} from '@/lib/live';
import {useMember} from '@/lib/member';
import {SampleNote, SectionHead, Segmented, s} from './shared';
import {LiveGate, Loading, SignInPrompt, Status} from './live';

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
  const member = useMember();
  if (member === undefined) return <Loading />;
  if (member === null) return <View style={{gap: 10}}><SignInPrompt what="your diary on the calendar" /><CalendarSample side={side} /></View>;
  return <CalendarLive side={side} />;
}

function CalendarSample({side}: {side: Side}) {
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
      <SampleNote>SAMPLE DAY · NOT YOUR DIARY · CHANGES HERE ARE NOT SAVED · SIGN IN TO SEE YOURS</SampleNote>
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

/* ─────────────── Live: the member's Diary on the timeline ─────────────── */
const BLOCK = 45; // diary entries carry a start time only; each is drawn as a 45-minute block
const minsOf = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes() - START; };

function CalendarLive({side}: {side: Side}) {
  const acc = track[side].acc;
  const [day, setDay] = useState(() => localISO(new Date()));
  const [view, setView] = useState<'day' | 'month'>('day');
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const {live, reload} = useLive<DiaryDay>(`calendar:${day}`, () => readDiaryDay(day));
  const monday = mondayOf(day);
  const week = Array.from({length: 7}, (_, i) => addDays(monday, i));
  const today = localISO(new Date());
  const cur = fromISO(day);
  const pick = (d: string) => { setDay(d); setSel(null); setMsg(null); };

  const act = async (item: DiaryItem, verb: 'done' | 'cancel' | number) => {
    if (busy) return;
    setBusy(true); setMsg(null);
    const r = await diaryAct(item.id, typeof verb === 'number' ? {startsAt: new Date(new Date(item.starts_at).getTime() + verb * 60_000).toISOString()} : verb);
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body)}); return; }
    setMsg({ok: true, text: verb === 'cancel' ? `Removed “${item.title}” from your diary.` : verb === 'done' ? `“${item.title}” marked done.` : `Moved to ${clock(r.body.item?.starts_at ?? item.starts_at)} — marked moved in your diary.`});
    if (verb === 'cancel') setSel(null);
    void reload(true);
  };

  // Month grid for the selected month (Monday-first).
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();

  return (
    <View style={{gap: 10}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
        <WeekArrow label="‹" a11y="Previous week" onPress={() => pick(addDays(day, -7))} />
        <View style={{flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)'}}>
          {week.map((d, i) => {
            const on = d === day; const dt = fromISO(d);
            return (
              <Pressable key={d} onPress={() => pick(d)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={dt.toLocaleDateString([], {weekday: 'long', day: 'numeric', month: 'long'})}
                style={{flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 1, backgroundColor: on ? deco.brassHighlight : 'transparent'}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 8, color: on ? '#140E08' : 'rgba(244,232,208,0.7)'}}>{DOW[i]}</Text>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 14, color: on ? '#140E08' : deco.cream}}>{dt.getDate()}</Text>
                <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: d === today ? (on ? '#140E08' : acc) : 'transparent'}} />
              </Pressable>
            );
          })}
        </View>
        <WeekArrow label="›" a11y="Next week" onPress={() => pick(addDays(day, 7))} />
      </View>
      <Segmented options={[['day', 'DAY'], ['month', 'MONTH']]} value={view} onChange={setView} />

      {view === 'month' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 6}}>
          <SectionHead>{cur.toLocaleDateString([], {month: 'long', year: 'numeric'}).toUpperCase()}</SectionHead>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {DOW.map((d) => <Text key={d} style={{width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.mono, fontSize: 8, color: deco.brass, paddingVertical: 4}}>{d[0]}</Text>)}
            {Array.from({length: Math.ceil((lead + dim) / 7) * 7}, (_, i) => {
              const n = i - lead + 1; const real = n >= 1 && n <= dim;
              const iso = real ? localISO(new Date(cur.getFullYear(), cur.getMonth(), n)) : '';
              return (
                <Pressable key={i} disabled={!real} onPress={() => { pick(iso); setView('day'); }} accessibilityLabel={real ? `Open ${iso}` : undefined}
                  style={{width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(201,169,97,0.15)', backgroundColor: iso === day ? 'rgba(232,200,122,0.15)' : 'transparent'}}>
                  <Text style={{fontFamily: fonts.body, fontSize: 11, color: real ? (iso === today ? acc : deco.cream) : 'transparent'}}>{real ? n : ''}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.small}>Tap a date to open that day of your diary.</Text>
        </Animated.View>
      ) : (
        <LiveGate live={live} reload={() => void reload()} what="your diary on the calendar">
          {(data) => {
            const inDay = data.items.filter((e) => { const m = minsOf(e.starts_at); return m >= 0 && m < SPAN; });
            const outside = data.items.filter((e) => !inDay.includes(e));
            const selEv = data.items.find((e) => e.id === sel);
            return (
              <>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>
                  {cur.toLocaleDateString([], {weekday: 'long'}).toUpperCase()} {cur.getDate()} {cur.toLocaleDateString([], {month: 'short'}).toUpperCase()} · {data.items.length ? `${data.items.length} IN YOUR DIARY` : 'NOTHING IN YOUR DIARY'}
                </Text>
                {outside.length ? (
                  <View style={{gap: 4}}>
                    {outside.map((e) => (
                      <Pressable key={e.id} onPress={() => setSel(sel === e.id ? null : e.id)} accessibilityRole="button" style={{flexDirection: 'row', gap: 8, minHeight: 36, alignItems: 'center', borderLeftWidth: 3, borderColor: deco.brass, paddingHorizontal: 8, backgroundColor: e.id === sel ? 'rgba(232,200,122,0.15)' : 'transparent'}}>
                        <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{clock(e.starts_at)}</Text>
                        <Text style={[s.body, {flex: 1}]} numberOfLines={1}>{e.title}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={{height: SPAN * PX + 10, borderLeftWidth: 1, borderColor: 'rgba(201,169,97,0.3)', marginLeft: 26}}>
                  {Array.from({length: 17}, (_, i) => (
                    <View key={i} style={{position: 'absolute', top: i * 60 * PX, left: -26, right: 0, flexDirection: 'row', alignItems: 'flex-start'}}>
                      <Text style={{width: 24, fontFamily: fonts.mono, fontSize: 8, color: 'rgba(244,232,208,0.5)', marginTop: -5}}>{((7 + i + 11) % 12) + 1}{7 + i < 12 ? 'a' : 'p'}</Text>
                      <View style={{flex: 1, height: 1, backgroundColor: 'rgba(201,169,97,0.12)'}} />
                    </View>
                  ))}
                  {inDay.map((e) => {
                    const on = e.id === sel; const t = minsOf(e.starts_at);
                    const bar = e.state === 'needs_member_action' ? acc : e.state === 'done' || e.state === 'approved' ? '#7AF5B8' : deco.brass;
                    return (
                      <Animated.View key={e.id} layout={LinearTransition.duration(300)} style={{position: 'absolute', left: 6, right: 0, top: t * PX, height: Math.max(24, Math.min(BLOCK, SPAN - t) * PX - 2)}}>
                        <Pressable onPress={() => setSel(on ? null : e.id)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${e.title}, ${clock(e.starts_at)}, ${DIARY_LABEL[e.state] ?? e.state}`}
                          style={{flex: 1, borderLeftWidth: 3, borderColor: bar, backgroundColor: on ? deco.brassHighlight : 'rgba(201,169,97,0.1)', paddingHorizontal: 6, paddingVertical: 2}}>
                          <Text numberOfLines={1} style={{fontFamily: fonts.bodyStrong, fontSize: 11, color: on ? '#140E08' : deco.cream}}>{e.title}</Text>
                          <Text style={{fontFamily: fonts.mono, fontSize: 8, color: on ? '#140E08' : 'rgba(244,232,208,0.6)'}}>{clock(e.starts_at)} · {DIARY_LABEL[e.state] ?? e.state.toUpperCase()}</Text>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
                {data.items.length === 0 ? <Text style={[s.small, {textAlign: 'center'}]}>A clear day. Add entries from the Diary.</Text> : null}
                {selEv ? (
                  <Animated.View entering={FadeInDown.duration(300)} style={{padding: 10, gap: 8, borderWidth: 2, borderColor: deco.brassHighlight}}>
                    <Text style={s.body}>{selEv.title} · {clock(selEv.starts_at)} · {DIARY_LABEL[selEv.state] ?? selEv.state.toUpperCase()}</Text>
                    <View style={{flexDirection: 'row', gap: 6}}>
                      {([['−30 MIN', -30], ['+30 MIN', 30], ...(selEv.state !== 'done' ? [['DONE', 'done']] : []), ['REMOVE', 'cancel']] as Array<[string, number | 'done' | 'cancel']>).map(([l, v]) => (
                        <Pressable key={l} onPress={() => act(selEv, v)} disabled={busy} accessibilityRole="button" style={{flex: 1, minHeight: 38, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1}}>
                          <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.cream}}>{l}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </Animated.View>
                ) : null}
                <Status msg={msg} />
              </>
            );
          }}
        </LiveGate>
      )}
      <SampleNote>YOUR DIARY · CHANGES SAVE ONLY WHEN THE HOUSE CONFIRMS · NOTHING IS BOOKED OUTSIDE THE APP</SampleNote>
    </View>
  );
}

function WeekArrow({label, a11y, onPress}: {label: string; a11y: string; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={6} style={{width: 26, minHeight: 50, alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{color: deco.brassHighlight, fontSize: 18}}>{label}</Text>
    </Pressable>
  );
}
