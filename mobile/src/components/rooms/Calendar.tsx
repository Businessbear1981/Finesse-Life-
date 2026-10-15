// The Calendar (After Hours skin) — week strip, day timeline (7 AM–11 PM), tap an entry to move it ±30 min,
// mark it done or remove it. From the design. Signed in, the timeline is the member's own Diary (GET /api/diary;
// moves and removals PATCH /api/diary/items/:id and only show once the server confirms). Signed out, the
// labelled sample day (with Nova's suggestions and auto-arrange) is shown; nothing there is saved or booked.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {DIARY_LABEL, addDays, clock, diaryAct, fromISO, localISO, mondayOf, readDiaryDay, type DiaryDay, type DiaryItem} from '@/lib/diary';
import {failure, useLive} from '@/lib/live';
import {useMember} from '@/lib/member';
import {AHCard, AHEyebrow, AHTitle} from '@/components/ah';
import {SampleNote, Segmented} from './shared';
import {LiveGate, Loading, SignInPrompt, Status} from './live';
import {Fine, Head, Pick, Round, ah, ahFonts, t} from './RoomKit';

type Kind = 'self' | 'work' | 'social';
type Ev = {id: string; title: string; t: number; d: number; kind: Kind; flex?: boolean; why?: string};
const PX = 0.8, START = 7 * 60, SPAN = 960;
const fmt = (m: number) => { const x = START + m, hh = Math.floor(x / 60), mm = x % 60; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; };
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
const cap = (x: string) => x.charAt(0) + x.slice(1).toLowerCase();

export function Calendar({side}: {side: Side}) {
  const member = useMember();
  if (member === undefined) return <Loading />;
  if (member === null) return <View style={{gap: 14}}><Intro /><SignInPrompt what="your diary on the calendar" /><CalendarSample side={side} /></View>;
  return <View style={{gap: 14}}><Intro /><CalendarLive side={side} /></View>;
}

function Intro() {
  return (
    <View style={{gap: 6}}>
      <AHTitle size={34}>Your week, on one page.</AHTitle>
    </View>
  );
}

/** One day pill in the week strip. */
function DayPill({dow, date, on, dot, onPress, a11y}: {dow: string; date: number; on: boolean; dot?: string; onPress: () => void; a11y: string}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={a11y}
      style={({pressed}) => ({flex: 1, minHeight: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? ah.white : 'rgba(255,255,255,0.05)', opacity: pressed ? 0.85 : 1})}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 0.6, color: on ? '#000' : ah.mute}}>{cap(dow).slice(0, 3)}</Text>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 16, color: on ? '#000' : ah.text, fontVariant: ['tabular-nums']}}>{date}</Text>
      <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: dot ? (on ? '#000' : dot) : 'transparent'}} />
    </Pressable>
  );
}

/** Hour grid behind the timeline. */
function Hours() {
  return (
    <>
      {Array.from({length: 17}, (_, i) => (
        <View key={i} style={{position: 'absolute', top: i * 60 * PX, left: -34, right: 0, flexDirection: 'row', alignItems: 'flex-start'}}>
          <Text style={{width: 30, fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.faint, marginTop: -6}}>{((7 + i + 11) % 12) + 1}{7 + i < 12 ? 'a' : 'p'}</Text>
          <View style={{flex: 1, height: 1, backgroundColor: ah.line}} />
        </View>
      ))}
    </>
  );
}

function Block({title, sub, bar, on, onPress, a11y, h}: {title: string; sub?: string; bar: string; on: boolean; onPress: () => void; a11y: string; h: number}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={a11y}
      style={{flex: 1, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: bar, backgroundColor: on ? ah.white : 'rgba(255,255,255,0.07)', paddingHorizontal: 9, paddingVertical: 3, justifyContent: h < 30 ? 'center' : 'flex-start', overflow: 'hidden'}}>
      <Text numberOfLines={1} style={{fontFamily: ahFonts.sansSemi, fontSize: 12, color: on ? '#000' : ah.text}}>{title}</Text>
      {sub ? <Text numberOfLines={1} style={{fontFamily: ahFonts.sans, fontSize: 12, color: on ? 'rgba(0,0,0,0.6)' : ah.mute}}>{sub}</Text> : null}
    </Pressable>
  );
}

function MonthGrid({lead, dim, isSel, isToday, onPick, dayLabel}: {lead: number; dim: number; isSel: (n: number) => boolean; isToday?: (n: number) => boolean; onPick: (n: number) => void; dayLabel?: (n: number) => string}) {
  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
      {DOW.map((d) => <Text key={d} style={{width: `${100 / 7}%`, textAlign: 'center', fontFamily: ahFonts.sansSemi, fontSize: 12, color: ah.faint, paddingVertical: 6}}>{d[0]}</Text>)}
      {Array.from({length: Math.ceil((lead + dim) / 7) * 7}, (_, i) => {
        const n = i - lead + 1; const real = n >= 1 && n <= dim; const on = real && isSel(n); const today = real && !!isToday?.(n);
        return (
          <View key={i} style={{width: `${100 / 7}%`, aspectRatio: 1, padding: 2}}>
            <Pressable disabled={!real} onPress={() => onPick(n)} accessibilityRole={real ? 'button' : undefined} accessibilityLabel={real ? (dayLabel?.(n) ?? String(n)) : undefined} accessibilityState={{selected: on}}
              style={{flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? ah.white : 'transparent', borderWidth: today && !on ? 1 : 0, borderColor: ah.rose}}>
              <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: real ? (on ? '#000' : today ? ah.rose : ah.text) : 'transparent', fontVariant: ['tabular-nums']}}>{real ? n : ''}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function CalendarSample({side}: {side: Side}) {
  const acc = track[side].acc;
  const KIND: Record<Kind, string> = {self: ah.ok, work: ah.platinum, social: acc};
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
      let x = 0;
      for (const f of [...placed].sort((a, b) => a.t - b.t)) { if (x + e.d <= f.t) break; x = Math.max(x, f.t + f.d); }
      placed.push({...e, t: Math.min(x, SPAN - e.d)});
    });
    return placed;
  });
  const sugg = SUGG.filter((g) => !handled.includes(g.id));

  return (
    <View style={{gap: 14}}>
      <View style={{flexDirection: 'row', gap: 4}}>
        {DOW.map((d, i) => <DayPill key={d} dow={d} date={13 + i} on={i === day} dot={[1, 3, 4, 5].includes(i) ? acc : undefined} onPress={() => setDay(i)} a11y={`${cap(DAYS[i])} ${13 + i} October`} />)}
      </View>
      <Segmented options={[['day', 'Day'], ['month', 'Month']]} value={view} onChange={setView} />

      {view === 'month' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 10}}>
          <Head>October 2026</Head>
          <MonthGrid lead={3} dim={31} isSel={(n) => n === 13 + day} onPick={(n) => { if (n >= 13 && n <= 19) setDay(n - 13); setView('day'); }} />
          <Fine>Tap a date to open the day.</Fine>
        </Animated.View>
      ) : (
        <>
          {sugg.length ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              <AHCard pad={16} style={{borderColor: 'rgba(232,180,160,0.3)', backgroundColor: '#100C0D'}}>
                <AHEyebrow color={ah.rose}>Nova found time</AHEyebrow>
                <View style={{marginTop: 6}}>
                  {sugg.map((g) => (
                    <Animated.View key={g.id} layout={LinearTransition} style={{flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingVertical: 6}}>
                      <View style={{flex: 1}}>
                        <Text style={t.name}>{g.title}</Text>
                        <Text style={t.meta}>{fmt(g.t)} · {g.why}</Text>
                      </View>
                      <Round label="+" solid a11y={`Add ${g.title}`} onPress={() => { setEvs((l) => [...l, {...g}]); setHandled((h) => [...h, g.id]); setSel(g.id); }} />
                      <Round label="×" a11y={`Skip ${g.title}`} onPress={() => setHandled((h) => [...h, g.id])} />
                    </Animated.View>
                  ))}
                </View>
              </AHCard>
            </Animated.View>
          ) : null}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10}}>
            <Text style={[t.title, {flexShrink: 1}]}>{cap(DAYS[day])} <Text style={{color: ah.mute}}>{13 + day} Oct</Text></Text>
            <Pick label="Auto-arrange flex" onPress={arrange} />
          </View>
          <View style={{height: SPAN * PX + 10, marginLeft: 34}}>
            <Hours />
            {evs.map((e) => {
              const on = e.id === sel;
              const h = Math.max(24, e.d * PX - 2);
              return (
                <Animated.View key={e.id} layout={LinearTransition.duration(300)} style={{position: 'absolute', left: 4, right: 0, top: e.t * PX + 1, height: h}}>
                  <Block title={`${e.title}${e.flex ? ' · flex' : ''}`} sub={e.d >= 45 ? `${fmt(e.t)}–${fmt(e.t + e.d)}` : undefined} bar={KIND[e.kind]} on={on} h={h}
                    onPress={() => setSel(on ? null : e.id)} a11y={`${e.title}, ${fmt(e.t)} to ${fmt(e.t + e.d)}`} />
                </Animated.View>
              );
            })}
          </View>
          {selEv ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <AHCard pad={16}>
                <Text style={t.title}>{selEv.title}</Text>
                <Text style={t.meta}>{fmt(selEv.t)}–{fmt(selEv.t + selEv.d)}</Text>
                <View style={{flexDirection: 'row', gap: 8, marginTop: 12}}>
                  <Pick label="−30 min" flex onPress={() => shift(-30)} />
                  <Pick label="+30 min" flex onPress={() => shift(30)} />
                  <Pick label="Remove" flex onPress={() => { setEvs((l) => l.filter((x) => x.id !== sel)); setSel(null); }} />
                </View>
              </AHCard>
            </Animated.View>
          ) : null}
        </>
      )}
      <SampleNote>Sample day · Not your diary · Changes here are not saved · Sign in to see yours</SampleNote>
    </View>
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
  const isoOf = (n: number) => localISO(new Date(cur.getFullYear(), cur.getMonth(), n));

  return (
    <View style={{gap: 14}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
        <WeekArrow label="‹" a11y="Previous week" onPress={() => pick(addDays(day, -7))} />
        <View style={{flex: 1, flexDirection: 'row', gap: 3}}>
          {week.map((d, i) => {
            const dt = fromISO(d);
            return <DayPill key={d} dow={DOW[i]} date={dt.getDate()} on={d === day} dot={d === today ? acc : undefined} onPress={() => pick(d)} a11y={dt.toLocaleDateString([], {weekday: 'long', day: 'numeric', month: 'long'})} />;
          })}
        </View>
        <WeekArrow label="›" a11y="Next week" onPress={() => pick(addDays(day, 7))} />
      </View>
      <Segmented options={[['day', 'Day'], ['month', 'Month']]} value={view} onChange={setView} />

      {view === 'month' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 10}}>
          <Head>{cur.toLocaleDateString([], {month: 'long', year: 'numeric'})}</Head>
          <MonthGrid lead={lead} dim={dim} isSel={(n) => isoOf(n) === day} isToday={(n) => isoOf(n) === today} dayLabel={(n) => `Open ${isoOf(n)}`} onPick={(n) => { pick(isoOf(n)); setView('day'); }} />
          <Fine>Tap a date to open that day of your diary.</Fine>
        </Animated.View>
      ) : (
        <LiveGate live={live} reload={() => void reload()} what="your diary on the calendar">
          {(data) => {
            const inDay = data.items.filter((e) => { const m = minsOf(e.starts_at); return m >= 0 && m < SPAN; });
            const outside = data.items.filter((e) => !inDay.includes(e));
            const selEv = data.items.find((e) => e.id === sel);
            const barOf = (e: DiaryItem) => (e.state === 'needs_member_action' ? acc : e.state === 'done' || e.state === 'approved' ? ah.ok : ah.platinum);
            return (
              <>
                <View style={{gap: 2}}>
                  <Text style={t.title}>{cur.toLocaleDateString([], {weekday: 'long'})} <Text style={{color: ah.mute}}>{cur.getDate()} {cur.toLocaleDateString([], {month: 'short'})}</Text></Text>
                  <Text style={t.meta}>{data.items.length ? `${data.items.length} in your diary` : 'Nothing in your diary'}</Text>
                </View>
                {outside.length ? (
                  <View style={{gap: 6}}>
                    {outside.map((e) => (
                      <Pressable key={e.id} onPress={() => setSel(sel === e.id ? null : e.id)} accessibilityRole="button" accessibilityState={{selected: e.id === sel}} accessibilityLabel={`${e.title}, ${clock(e.starts_at)}`}
                        style={{flexDirection: 'row', gap: 10, minHeight: 44, alignItems: 'center', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: barOf(e), paddingHorizontal: 12, backgroundColor: e.id === sel ? ah.white : 'rgba(255,255,255,0.06)'}}>
                        <Text style={[t.meta, e.id === sel && {color: 'rgba(0,0,0,0.6)'}]}>{clock(e.starts_at)}</Text>
                        <Text style={[t.name, {flex: 1, fontSize: 14}, e.id === sel && {color: '#000'}]} numberOfLines={1}>{e.title}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={{height: SPAN * PX + 10, marginLeft: 34}}>
                  <Hours />
                  {inDay.map((e) => {
                    const on = e.id === sel; const m = minsOf(e.starts_at);
                    const h = Math.max(24, Math.min(BLOCK, SPAN - m) * PX - 2);
                    return (
                      <Animated.View key={e.id} layout={LinearTransition.duration(300)} style={{position: 'absolute', left: 4, right: 0, top: m * PX + 1, height: h}}>
                        <Block title={e.title} sub={`${clock(e.starts_at)} · ${DIARY_LABEL[e.state] ?? e.state.toUpperCase()}`} bar={barOf(e)} on={on} h={h}
                          onPress={() => setSel(on ? null : e.id)} a11y={`${e.title}, ${clock(e.starts_at)}, ${DIARY_LABEL[e.state] ?? e.state}`} />
                      </Animated.View>
                    );
                  })}
                </View>
                {data.items.length === 0 ? <Fine style={{textAlign: 'center'}}>A clear day. Add entries from the Diary.</Fine> : null}
                {selEv ? (
                  <Animated.View entering={FadeInDown.duration(300)}>
                    <AHCard pad={16}>
                      <Text style={t.title}>{selEv.title}</Text>
                      <Text style={t.meta}>{clock(selEv.starts_at)} · {DIARY_LABEL[selEv.state] ?? selEv.state.toUpperCase()}</Text>
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12}}>
                        {([['−30 min', -30], ['+30 min', 30], ...(selEv.state !== 'done' ? [['Done', 'done']] : []), ['Remove', 'cancel']] as Array<[string, number | 'done' | 'cancel']>).map(([l, v]) => (
                          <Pick key={l} label={l} on={v === 'done'} flex onPress={() => void act(selEv, v)} disabled={busy} />
                        ))}
                      </View>
                    </AHCard>
                  </Animated.View>
                ) : null}
                <Status msg={msg} />
              </>
            );
          }}
        </LiveGate>
      )}
      <SampleNote>Your diary · Changes save only when the house confirms · Nothing is booked outside the app</SampleNote>
    </View>
  );
}

function WeekArrow({label, a11y, onPress}: {label: string; a11y: string; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={8} style={({pressed}) => ({width: 28, minHeight: 60, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1})}>
      <Text style={{color: ah.text, fontSize: 22, fontFamily: ahFonts.sans}}>{label}</Text>
    </Pressable>
  );
}
