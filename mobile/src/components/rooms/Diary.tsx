// The Diary — the day on one noir page: the one thing that needs the member above the fold, approve / hold
// kept visibly distinct. Reads and writes the member's own diary through /api/diary and /api/diary/items.
// Approving records the member's choice only; any partner confirmation stays with the room the entry came
// from. Items Nova created (source_room 'nova') open the request they came from — Nova's plan, never a booking.
// Signed out, a labelled sample page is shown.
import {useEffect, useId, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {DECIDABLE, DIARY_LABEL, addDays, clock, diaryAct, fromISO, localISO, readDiaryDay, type DiaryDay, type DiaryItem} from '@/lib/diary';
import {failure, useLive} from '@/lib/live';
import {AHCard, AHEyebrow, AHInput, AHTitle} from '@/components/ah';
import {ActionBar, SampleNote, s, sentence} from './shared';
import {LiveGate, Meta, OK_GREEN, RowBtn, Status} from './live';
import {REQUEST_STATUS, listRequests, type NovaRequest} from '@/lib/rooms/nova-plan';

const fromLabel = (room: string) => (room === 'nova' ? 'from Nova' : room === 'diary' ? '' : `from the ${room}`);

/** The Nova request a Diary item came from: what was asked and Nova's draft. Nothing in it is booked. */
function NovaRequestPanel({id}: {id: string}) {
  const [req, setReq] = useState<NovaRequest | null | 'missing'>(null);
  useEffect(() => {
    let alive = true;
    void listRequests().then((r) => { if (alive) setReq((r.ok ? r.body.requests?.find((q) => q.id === id) : undefined) ?? 'missing'); });
    return () => { alive = false; };
  }, [id]);
  if (req === null) return <Text style={s.small}>Opening Nova’s request…</Text>;
  if (req === 'missing') return <Text style={s.small}>Nova’s request could not be opened. Nothing was changed.</Text>;
  return (
    <Animated.View entering={FadeIn.duration(250)} style={{gap: 6, paddingLeft: 12, borderLeftWidth: 1, borderColor: 'rgba(232,180,160,0.4)'}}>
      <Meta color={ah.blush}>Nova’s request · {REQUEST_STATUS[req.status] ?? req.status}{req.room ? ` · ${req.room}` : ''}</Meta>
      <Text style={[s.small, {color: ah.text, fontSize: 14, lineHeight: 20}]}>{req.result?.plan ?? (req.result ? JSON.stringify(req.result).slice(0, 600) : 'No result yet.')}</Text>
      {req.result?.booked === false ? <Text style={s.small}>Nothing is booked — approving keeps the plan; you or Nova arrange it next.</Text> : null}
    </Animated.View>
  );
}

const SAMPLE: Array<[string, string, string]> = [['9:00 AM', 'Salon · blow-out', 'DONE'], ['11:30 AM', 'Tailor fitting', 'MOVED'], ['1:00 PM', 'Lunch table for two', 'DONE'], ['4:00 PM', 'Registry gift wrapped', 'DONE'], ['8:00 PM', 'Ballroom evening · approve the hold', 'NEEDS YOU']];

/** The page: a noir card with hairline rules. */
function Page({children}: {children: React.ReactNode}) {
  return <AHCard pad={0} style={{paddingHorizontal: 16}}>{children}</AHCard>;
}

function PageLine({time, title, label, tone, last, children}: {time: string; title: string; label: string; tone?: string; last?: boolean; children?: React.ReactNode}) {
  return (
    <Animated.View layout={LinearTransition} style={{paddingVertical: 14, gap: 10, borderBottomWidth: last ? 0 : 1, borderColor: ah.line}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <Text style={{width: 66, fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.mute}}>{time}</Text>
        <Text style={{flex: 1, fontFamily: ahFonts.serif, fontSize: 21, lineHeight: 24, color: ah.text}}>{title}</Text>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: tone ?? ah.faint}}>{sentence(label)}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

/** Rose-lit card for the one decision that needs the member. */
function NeedsYou({children}: {children: React.ReactNode}) {
  const id = `ny${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{borderRadius: radius.hero, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(232,180,160,0.3)', backgroundColor: '#0D0809'}}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id={`${id}a`} cx="0.85" cy="0.1" r="0.8"><Stop offset="0" stopColor={ah.rose2} stopOpacity={0.55} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`${id}b`} cx="0.1" cy="1" r="0.7"><Stop offset="0" stopColor={ah.rose3} stopOpacity={0.5} /><Stop offset="1" stopColor={ah.rose3} stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}a)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}b)`} />
      </Svg>
      <View style={{padding: 22, gap: 10}}>{children}</View>
    </View>
  );
}

export function Diary({side}: {side: Side}) {
  const acc = track[side].acc;
  const [day, setDay] = useState(() => localISO(new Date()));
  const {live, reload} = useLive<DiaryDay>(`diary:${day}`, () => readDiaryDay(day));
  const d = fromISO(day);
  const today = localISO(new Date());
  const weekday = d.toLocaleDateString([], {weekday: 'long'});
  const date = `${d.getDate()} ${d.toLocaleDateString([], {month: 'short'})}`;

  return (
    <View style={{gap: 16}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <ArrowBtn dir="‹" label="Previous day" onPress={() => setDay((x) => addDays(x, -1))} />
        <Pressable onPress={() => setDay(today)} accessibilityRole="button" accessibilityLabel={`${weekday} ${date}. Go to today`} style={{flex: 1, alignItems: 'center', minHeight: 56, justifyContent: 'center'}}>
          <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 30, lineHeight: 32, color: ah.text}}>{weekday}</Text>
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: day !== today ? ah.rose : ah.mute}}>{date}{day !== today ? ' · tap for today' : ''}</Text>
        </Pressable>
        <ArrowBtn dir="›" label="Next day" onPress={() => setDay((x) => addDays(x, 1))} />
      </View>

      <LiveGate live={live} reload={() => void reload()} what="your diary" signedOut={<DiarySample />}>
        {(data) => <DiaryPage data={data} acc={acc} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function ArrowBtn({dir, label, onPress}: {dir: string; label: string; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({pressed}) => ({width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1})}>
      <Text style={{color: ah.text, fontSize: 22, lineHeight: 24, fontFamily: ahFonts.sans}}>{dir}</Text>
    </Pressable>
  );
}

function DiaryPage({data, acc, reload}: {data: DiaryDay; acc: string; reload: () => Promise<void>}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const [title, setTitle] = useState('');
  const [mins, setMins] = useState(19 * 60);
  const [openNova, setOpenNova] = useState<string | null>(null);
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
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
      {next ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <NeedsYou>
            <AHEyebrow color={ah.blush}>One thing needs you</AHEyebrow>
            <AHTitle size={32}>{next.title}</AHTitle>
            <Text style={[s.small, {color: 'rgba(237,235,231,0.7)'}]}>{clock(next.starts_at)}{fromLabel(next.source_room) ? ` · ${fromLabel(next.source_room)}` : ''}</Text>
            {next.notes ? <Text style={[s.small, {color: 'rgba(237,235,231,0.7)'}]}>{next.notes}</Text> : null}
            {next.source_room === 'nova' && next.source_id ? (
              <>
                <RowBtn label={openNova === next.id ? 'Close Nova’s plan' : 'Open Nova’s plan'} onPress={() => setOpenNova(openNova === next.id ? null : next.id)} />
                {openNova === next.id ? <NovaRequestPanel id={next.source_id} /> : null}
              </>
            ) : null}
            <View style={{flexDirection: 'row', gap: 10, marginTop: 6}}>
              <View style={{flex: 1}}><ActionBar label={busy === next.id ? 'One moment…' : 'Approve'} color={acc} onPress={() => act(next, 'approve')} disabled={!!busy} /></View>
              <View style={{flex: 1}}>
                <Pressable onPress={() => act(next, 'hold')} disabled={!!busy} accessibilityRole="button" accessibilityLabel="Hold"
                  style={({pressed}) => ({minHeight: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.45 : pressed ? 0.8 : 1})}>
                  <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: ah.text}}>Hold</Text>
                </Pressable>
              </View>
            </View>
          </NeedsYou>
        </Animated.View>
      ) : null}

      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <AHEyebrow>The page</AHEyebrow>
        <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.mute}}>{data.counts.done} done · <Text style={{color: data.counts.needsYou ? ah.rose : ah.mute}}>{data.counts.needsYou} need you</Text></Text>
      </View>
      <Page>
        {data.items.length === 0 ? (
          <Text style={{paddingVertical: 28, fontFamily: ahFonts.serifItalic, fontSize: 22, color: ah.mute, textAlign: 'center'}}>A blank page. Nothing needs you this day.</Text>
        ) : data.items.map((i, n) => {
          const decidable = DECIDABLE.includes(i.state) && i.id !== next?.id;
          return (
            <PageLine key={i.id} last={n === data.items.length - 1} time={clock(i.starts_at)} title={i.title} label={DIARY_LABEL[i.state] ?? i.state.toUpperCase()} tone={i.state === 'needs_member_action' ? ah.rose : i.state === 'approved' || i.state === 'done' ? OK_GREEN : ah.faint}>
              {fromLabel(i.source_room) ? <Text style={[s.small, {marginLeft: 76, marginTop: -6}]}>{fromLabel(i.source_room)}</Text> : null}
              {i.source_room === 'nova' && i.source_id && i.id !== next?.id ? (
                <View style={{gap: 8, marginLeft: 76}}>
                  <RowBtn label={openNova === i.id ? 'Close Nova’s plan' : 'Open Nova’s plan'} onPress={() => setOpenNova(openNova === i.id ? null : i.id)} />
                  {openNova === i.id ? <NovaRequestPanel id={i.source_id} /> : null}
                </View>
              ) : null}
              {i.state !== 'done' ? (
                <View style={{flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap'}}>
                  {decidable ? <RowBtn label="Approve" onPress={() => act(i, 'approve')} disabled={!!busy} tone={ah.rose} /> : null}
                  {decidable && i.state !== 'held' ? <RowBtn label="Hold" onPress={() => act(i, 'hold')} disabled={!!busy} /> : null}
                  <RowBtn label="Done" onPress={() => act(i, 'done')} disabled={!!busy} />
                </View>
              ) : null}
            </PageLine>
          );
        })}
      </Page>

      <AHCard style={{gap: 14}}>
        <Meta>Write it in</Meta>
        <AHInput value={title} onChangeText={(v) => setTitle(v.slice(0, 200))} placeholder="Add to this page" accessibilityLabel="New diary entry" />
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <RowBtn label="−30" a11y="Thirty minutes earlier" onPress={() => setMins((m) => Math.max(0, m - 30))} />
          <Text style={{flex: 1, textAlign: 'center', fontFamily: ahFonts.serif, fontSize: 28, color: ah.text}} accessibilityLabel={`Time ${timeLabel}`}>{timeLabel}</Text>
          <RowBtn label="+30" a11y="Thirty minutes later" onPress={() => setMins((m) => Math.min(23 * 60 + 30, m + 30))} />
        </View>
        <ActionBar label={busy === 'new' ? 'Writing…' : 'Write it in'} color={acc} onPress={add} disabled={!title.trim() || !!busy} />
      </AHCard>
      <Status msg={msg} />
      <SampleNote>Your diary · approving records your choice · partners confirm separately</SampleNote>
    </Animated.View>
  );
}

function DiarySample() {
  return (
    <View style={{gap: 10, opacity: 0.9}}>
      <Page>
        {SAMPLE.map(([t, w, st], i) => <PageLine key={t} last={i === SAMPLE.length - 1} time={t} title={w} label={st} tone={st === 'NEEDS YOU' ? ah.rose : undefined} />)}
      </Page>
      <SampleNote>Sample page · not your diary · sign in to see yours</SampleNote>
    </View>
  );
}
