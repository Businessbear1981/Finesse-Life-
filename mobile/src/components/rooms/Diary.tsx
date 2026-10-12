// The Diary — a leather day planner: the day on one cream page, the one thing that needs the member above
// the fold, approve / hold kept visibly distinct. Reads and writes the member's own diary through
// /api/diary and /api/diary/items. Approving records the member's choice only; any partner confirmation
// stays with the room the entry came from. Signed out, a labelled sample page is shown.
import {useState} from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {DECIDABLE, DIARY_LABEL, addDays, clock, diaryAct, fromISO, localISO, readDiaryDay, type DiaryDay, type DiaryItem} from '@/lib/diary';
import {failure, useLive} from '@/lib/live';
import {ActionBar, SampleNote, s} from './shared';
import {LiveGate, RowBtn, Status} from './live';

const LEATHER = '#3A1E12', INK = '#1A120C', SEPIA = '#5A4630', OX = '#6B1424';
const SAMPLE: Array<[string, string, string]> = [['9:00 AM', 'Salon · blow-out', 'DONE'], ['11:30 AM', 'Tailor fitting', 'MOVED'], ['1:00 PM', 'Lunch table for two', 'DONE'], ['4:00 PM', 'Registry gift wrapped', 'DONE'], ['8:00 PM', 'Ballroom evening · approve the hold', 'NEEDS YOU']];

/** Cream planner page inside a leather cover. */
function Planner({children}: {children: React.ReactNode}) {
  return (
    <View style={{padding: 7, backgroundColor: LEATHER, borderWidth: 1, borderColor: deco.brassShadow}}>
      <View style={{overflow: 'hidden', borderLeftWidth: 3, borderColor: 'rgba(26,18,12,0.25)'}}>
        <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} preserveAspectRatio="none">
          <Defs><LinearGradient id="dpaper" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#F4E8D0" /><Stop offset="1" stopColor="#E8DBBE" /></LinearGradient></Defs>
          <Rect width="100%" height="100%" fill="url(#dpaper)" />
        </Svg>
        {children}
      </View>
    </View>
  );
}

function PageLine({time, title, label, tone, children}: {time: string; title: string; label: string; tone?: string; children?: React.ReactNode}) {
  return (
    <Animated.View layout={LinearTransition} style={{paddingVertical: 9, paddingHorizontal: 12, gap: 6, borderBottomWidth: 1, borderColor: 'rgba(26,18,12,0.2)'}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <Text style={{width: 62, fontFamily: fonts.mono, fontSize: 9.5, color: SEPIA}}>{time}</Text>
        <Text style={{flex: 1, fontFamily: fonts.script, fontSize: 17, lineHeight: 20, color: INK}}>{title}</Text>
        <Text style={{fontFamily: fonts.capsBold, fontSize: 8, letterSpacing: 1.2, color: tone ?? SEPIA}}>{label}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

export function Diary({side}: {side: Side}) {
  const acc = track[side].acc;
  const [day, setDay] = useState(() => localISO(new Date()));
  const {live, reload} = useLive<DiaryDay>(`diary:${day}`, () => readDiaryDay(day));
  const d = fromISO(day);
  const today = localISO(new Date());
  const heading = `${d.toLocaleDateString([], {weekday: 'long'}).toUpperCase()} ${d.getDate()} ${d.toLocaleDateString([], {month: 'short'}).toUpperCase()}`;

  return (
    <View style={{gap: 12}}>
      <View style={{flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: deco.brass}}>
        <Pressable onPress={() => setDay((x) => addDays(x, -1))} accessibilityRole="button" accessibilityLabel="Previous day" style={{width: 46, minHeight: 44, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: deco.brassHighlight, fontSize: 18}}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setDay(today)} accessibilityRole="button" accessibilityLabel="Go to today" style={{flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: deco.cream}}>{heading}</Text>
          {day !== today ? <Text style={{fontFamily: fonts.mono, fontSize: 8, color: deco.brass}}>TAP FOR TODAY</Text> : null}
        </Pressable>
        <Pressable onPress={() => setDay((x) => addDays(x, 1))} accessibilityRole="button" accessibilityLabel="Next day" style={{width: 46, minHeight: 44, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: deco.brassHighlight, fontSize: 18}}>›</Text>
        </Pressable>
      </View>

      <LiveGate live={live} reload={() => void reload()} what="your diary" signedOut={<DiarySample />}>
        {(data) => <DiaryPage data={data} acc={acc} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function DiaryPage({data, acc, reload}: {data: DiaryDay; acc: string; reload: () => Promise<void>}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const [title, setTitle] = useState('');
  const [mins, setMins] = useState(19 * 60);
  const next = data.nextDecision;

  const act = async (item: DiaryItem, verb: 'approve' | 'hold' | 'done') => {
    setBusy(item.id); setMsg(null);
    const r = await diaryAct(item.id, verb);
    setBusy(null);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body)}); if (r.status === 409) void reload(); return; }
    setMsg({ok: true, text: verb === 'approve' ? `Approved. Your choice on “${item.title}” is recorded${item.source_room === 'diary' ? '.' : ` — the ${item.source_room} desk confirms with any partner separately.`}` : verb === 'hold' ? `Held. “${item.title}” stays on the page, marked held.` : `Marked done.`});
    void reload();
  };
  const add = async () => {
    const t = title.trim();
    if (!t || busy) return;
    const when = fromISO(data.day); when.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    setBusy('new'); setMsg(null);
    const r = await api<{item?: DiaryItem; message?: string; error?: string}>('/api/diary/items', {method: 'POST', json: {title: t, startsAt: when.toISOString()}});
    setBusy(null);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was written in.')}); return; }
    setTitle(''); setMsg({ok: true, text: 'Written in on the page.'});
    void reload();
  };
  const hh = Math.floor(mins / 60), mm = mins % 60;
  const timeLabel = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
      {next ? (
        <Animated.View entering={FadeInDown.duration(400)} style={{padding: 12, gap: 8, borderWidth: 2, borderColor: acc, backgroundColor: 'rgba(232,200,122,0.05)'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: acc}}>ONE THING NEEDS YOU</Text>
          <Text style={{fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, color: deco.cream}}>{next.title}</Text>
          <Text style={s.small}>{clock(next.starts_at)} · from {next.source_room}</Text>
          <View style={{flexDirection: 'row', gap: 8}}>
            <View style={{flex: 1}}><ActionBar label={busy === next.id ? 'ONE MOMENT…' : 'APPROVE'} color={acc} onPress={() => act(next, 'approve')} disabled={!!busy} /></View>
            <View style={{flex: 1}}><ActionBar label="HOLD" color={deco.brass} onPress={() => act(next, 'hold')} disabled={!!busy} /></View>
          </View>
        </Animated.View>
      ) : null}

      <Planner>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderColor: 'rgba(107,20,36,0.4)'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 2, color: OX}}>THE PAGE</Text>
          <Text style={{fontFamily: fonts.mono, fontSize: 9, color: SEPIA}}>{data.counts.done} DONE · {data.counts.needsYou} NEED YOU</Text>
        </View>
        {data.items.length === 0 ? (
          <Text style={{padding: 16, fontFamily: fonts.script, fontSize: 18, color: SEPIA, textAlign: 'center'}}>A blank page. Nothing needs you this day.</Text>
        ) : data.items.map((i) => {
          const decidable = DECIDABLE.includes(i.state) && i.id !== next?.id;
          return (
            <PageLine key={i.id} time={clock(i.starts_at)} title={i.title} label={DIARY_LABEL[i.state] ?? i.state.toUpperCase()} tone={i.state === 'needs_member_action' ? OX : i.state === 'approved' || i.state === 'done' ? '#2F6B45' : SEPIA}>
              {i.state !== 'done' ? (
                <View style={{flexDirection: 'row', gap: 6, justifyContent: 'flex-end'}}>
                  {decidable ? <PaperBtn label="APPROVE" onPress={() => act(i, 'approve')} disabled={!!busy} /> : null}
                  {decidable && i.state !== 'held' ? <PaperBtn label="HOLD" onPress={() => act(i, 'hold')} disabled={!!busy} /> : null}
                  <PaperBtn label="DONE" onPress={() => act(i, 'done')} disabled={!!busy} />
                </View>
              ) : null}
            </PageLine>
          );
        })}
      </Planner>

      <View style={{padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)'}}>
        <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WRITE IT IN</Text>
        <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 200))} placeholder="Add to this page" placeholderTextColor="rgba(244,232,208,0.4)" accessibilityLabel="New diary entry"
          style={{minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)', fontFamily: fonts.body, fontSize: 13, color: deco.cream}} />
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <RowBtn label="−30" a11y="Thirty minutes earlier" onPress={() => setMins((m) => Math.max(0, m - 30))} />
          <Text style={{flex: 1, textAlign: 'center', fontFamily: fonts.capsBold, fontSize: 16, color: deco.brassWhite}} accessibilityLabel={`Time ${timeLabel}`}>{timeLabel}</Text>
          <RowBtn label="+30" a11y="Thirty minutes later" onPress={() => setMins((m) => Math.min(23 * 60 + 30, m + 30))} />
        </View>
        <ActionBar label={busy === 'new' ? 'WRITING…' : 'WRITE IT IN'} color={acc} onPress={add} disabled={!title.trim() || !!busy} />
      </View>
      <Status msg={msg} />
      <SampleNote>YOUR DIARY · APPROVING RECORDS YOUR CHOICE · PARTNERS CONFIRM SEPARATELY</SampleNote>
    </Animated.View>
  );
}

function PaperBtn({label, onPress, disabled}: {label: string; onPress: () => void; disabled?: boolean}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={{minHeight: 32, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(26,18,12,0.45)', justifyContent: 'center', opacity: disabled ? 0.45 : 1}}>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 8.5, letterSpacing: 1.2, color: INK}}>{label}</Text>
    </Pressable>
  );
}

function DiarySample() {
  return (
    <View style={{gap: 8, opacity: 0.85}}>
      <Planner>
        {SAMPLE.map(([t, w, st]) => <PageLine key={t} time={t} title={w} label={st} tone={st === 'NEEDS YOU' ? OX : undefined} />)}
      </Planner>
      <SampleNote>SAMPLE PAGE · NOT YOUR DIARY · SIGN IN TO SEE YOURS</SampleNote>
    </View>
  );
}
