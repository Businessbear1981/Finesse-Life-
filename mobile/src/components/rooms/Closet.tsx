// The Closet — a softly lit wardrobe with a chrome rail: seven days, each dressed from pieces the
// member already owns, and the week approved in one action. Missing pieces stay separate and only go to the
// Stylist / Bag / Exchange when the member says so. Reads GET /api/closet/rotation; writes approve-week,
// looks/:id/hold and missing-piece. A drafted week is a suggestion and is not saved until approved.
import {useId, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, RadialGradient, Rect, Stop} from 'react-native-svg';
import {API_BASE, api} from '@/lib/api';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {AHCard, AHChip, AHEyebrow, AHInput, AHTitle} from '@/components/ah';
import {ActionBar, SampleNote, s} from './shared';
import {LiveGate, Meta, RowBtn, Status} from './live';

type Look = {id: string; photo_url: string; caption: string | null; source: 'wardrobe' | 'camera'};
type Day = {day: number; lookId: string | null};
type Missing = {id: string; description: string; route_to: string | null; created_at: string};
type ClosetData = {weekStart: string; status: 'approved' | 'draft' | 'held' | 'empty'; approvedAt: string | null; days: Day[]; looks: Look[]; missingPieces: Missing[]};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_NAME = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROUTES: Array<['stylist' | 'bag' | 'exchange', string, string]> = [['stylist', 'Ask the Stylist', 'Stylist'], ['bag', 'Find in the Bag', 'Bag'], ['exchange', 'Ask the Exchange', 'Exchange']];

/** Wardrobe looks are public URLs; Camera pieces hung here are private and need the member's key. */
const lookSource = (url: string, token?: string) => (url.startsWith('/') ? {uri: `${API_BASE}${url}`, headers: token ? {Authorization: `Bearer ${token}`} : undefined} : {uri: url});

/** The wardrobe: noir lacquer, a warm rose light from above and a chrome rail. */
function Wardrobe({children}: {children: React.ReactNode}) {
  const id = `cl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{borderRadius: radius.hero, overflow: 'hidden', borderWidth: 1, borderColor: ah.line, backgroundColor: '#0A0809'}}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id={`${id}l`} cx="0.5" cy="0" r="0.9"><Stop offset="0" stopColor={ah.rose2} stopOpacity={0.32} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient>
          <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#6D7076" /><Stop offset="0.5" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#6D7076" /></LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}l)`} />
        <Rect x="4%" y={20} width="92%" height={3} rx={1.5} fill={`url(#${id}r)`} />
      </Svg>
      <View style={{paddingTop: 22}}>{children}</View>
    </View>
  );
}

export function Closet({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload, member} = useLive<ClosetData>('/api/closet/rotation');
  // Kept above the rail so the confirmation survives the re-read (and remount) after a save.
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  return (
    <View style={{gap: 16}}>
      <LiveGate live={live} reload={() => void reload()} what="your closet" signedOut={<ClosetSample />}>
        {(data) => <ClosetLive key={`${data.weekStart}:${data.status}:${JSON.stringify(data.days)}`} data={data} acc={acc} token={member?.token} reload={() => reload(true)} msg={msg} setMsg={setMsg} />}
      </LiveGate>
    </View>
  );
}

function ClosetLive({data, acc, token, reload, msg, setMsg}: {data: ClosetData; acc: string; token?: string; reload: () => Promise<void>; msg: {ok: boolean; text: string} | null; setMsg: (m: {ok: boolean; text: string} | null) => void}) {
  const [days, setDays] = useState<Day[]>(data.days);
  const [sel, setSel] = useState(() => (new Date().getDay() + 6) % 7);
  const [busy, setBusy] = useState(false);
  const [gap, setGap] = useState('');
  const byId = Object.fromEntries(data.looks.map((l) => [l.id, l]));
  const changed = JSON.stringify(days) !== JSON.stringify(data.days);
  const approved = data.status === 'approved' && !changed;
  const statusLine = approved ? `Approved${data.approvedAt ? ` · ${new Date(data.approvedAt).toLocaleDateString([], {month: 'short', day: 'numeric'})}` : ''}`
    : data.status === 'draft' && !changed ? 'Drafted from your own pieces · not saved'
    : changed ? 'Your changes · not saved yet'
    : data.status === 'held' ? 'Saved · not approved' : 'Nothing on the rail';

  if (data.looks.length === 0) {
    return (
      <View style={{gap: 16}}>
        <Wardrobe>
          <View style={{paddingHorizontal: 24, paddingTop: 30, paddingBottom: 30, alignItems: 'center', gap: 12}}>
            <Icon name="shirt" size={32} color={ah.platinum} strokeWidth={1.2} />
            <AHTitle size={26} style={{textAlign: 'center'}}>The rail is empty. Only pieces you own hang here.</AHTitle>
          </View>
        </Wardrobe>
        <Text style={s.small}>Scan pieces in The Camera and hang them in your Closet, or add looks in the Wardrobe.</Text>
        <MissingPieces data={data} gap={gap} setGap={setGap} busy={busy} setBusy={setBusy} setMsg={setMsg} reload={reload} />
        <Status msg={msg} />
      </View>
    );
  }

  const approve = async () => {
    setBusy(true); setMsg(null);
    const r = await api<{message?: string; error?: string}>('/api/closet/approve-week', {method: 'POST', json: {weekStart: data.weekStart, days}});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')}); return; }
    setMsg({ok: true, text: 'The week is approved and saved.'});
    void reload();
  };
  const hold = async () => {
    const lookId = days[sel]?.lookId;
    if (!lookId) return;
    setBusy(true); setMsg(null);
    const r = await api<{message?: string; error?: string}>(`/api/closet/looks/${lookId}/hold`, {method: 'POST', json: {weekStart: data.weekStart, day: sel}});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')}); return; }
    setMsg({ok: true, text: `Held for ${DAYS[sel]}. The week now needs approving again.`});
    void reload();
  };
  const cur = days[sel]?.lookId ? byId[days[sel].lookId!] : null;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
      <View style={{gap: 10}}>
        <AHEyebrow>Week of {data.weekStart}</AHEyebrow>
        <AHChip label={statusLine} tone={approved ? 'glass' : 'outline'} style={approved ? {backgroundColor: 'rgba(126,226,184,0.12)'} : undefined} />
      </View>
      <Wardrobe>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 14, paddingBottom: 16, gap: 10}}>
          {days.map((d, i) => {
            const look = d.lookId ? byId[d.lookId] : null;
            const on = i === sel;
            return (
              <Pressable key={i} onPress={() => setSel(i)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${DAYS[i]}: ${look?.caption ?? (look ? 'owned look' : 'rest day')}`} style={{width: 84, gap: 6}}>
                <View style={{alignSelf: 'center', width: 1.5, height: 12, backgroundColor: ah.platinum, opacity: 0.7}} />
                <View style={{aspectRatio: 3 / 4, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? acc : ah.line2, backgroundColor: '#141215', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
                  {look ? <Image source={lookSource(look.photo_url, token)} style={{width: '100%', height: '100%'}} resizeMode="cover" accessibilityLabel={look.caption ?? 'Owned look'} /> : <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 15, color: ah.faint}}>Rest</Text>}
                </View>
                <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, color: on ? acc : ah.mute, textAlign: 'center'}}>{DAY_NAME[i]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Wardrobe>

      <Animated.View key={sel} entering={FadeInDown.duration(250)} style={{gap: 12}}>
        <View style={{gap: 2}}>
          <AHEyebrow>{DAY_NAME[sel]}</AHEyebrow>
          <AHTitle size={30}>{cur ? (cur.caption ?? 'Owned look') : 'Rest day'}</AHTitle>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
          <Pressable onPress={() => setDays((xs) => xs.map((x) => (x.day === sel ? {...x, lookId: null} : x)))} accessibilityRole="button" accessibilityLabel="Rest day" accessibilityState={{selected: !cur}}
            style={{width: 68, aspectRatio: 3 / 4, borderRadius: 12, borderWidth: !cur ? 2 : 1, borderColor: !cur ? ah.white : ah.line2, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 15, color: ah.text}}>Rest</Text>
          </Pressable>
          {data.looks.map((l) => {
            const on = cur?.id === l.id;
            return (
              <Pressable key={l.id} onPress={() => setDays((xs) => xs.map((x) => (x.day === sel ? {...x, lookId: l.id} : x)))} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={l.caption ?? 'Owned look'}
                style={{width: 68, aspectRatio: 3 / 4, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? ah.white : ah.line2, overflow: 'hidden'}}>
                <Image source={lookSource(l.photo_url, token)} style={{width: '100%', height: '100%'}} resizeMode="cover" />
              </Pressable>
            );
          })}
        </ScrollView>
        {cur ? <RowBtn label={`Hold this look for ${DAY_NAME[sel]}`} onPress={hold} disabled={busy} /> : null}
      </Animated.View>

      <ActionBar label={busy ? 'One moment…' : approved ? 'Approved · change a day to redo' : 'Approve the week'} color={approved ? ah.platinum : acc} onPress={approve} disabled={busy || approved} />
      <Status msg={msg} />
      <MissingPieces data={data} gap={gap} setGap={setGap} busy={busy} setBusy={setBusy} setMsg={setMsg} reload={reload} />
      <SampleNote>Your own pieces only · Camera pieces stay private · nothing is bought from the Closet</SampleNote>
    </Animated.View>
  );
}

function MissingPieces({data, gap, setGap, busy, setBusy, setMsg, reload}: {data: ClosetData; gap: string; setGap: (v: string) => void; busy: boolean; setBusy: (b: boolean) => void; setMsg: (m: {ok: boolean; text: string} | null) => void; reload: () => Promise<void>}) {
  const note = async (routeTo?: 'stylist' | 'bag' | 'exchange') => {
    if (gap.trim().length < 2) return;
    setBusy(true); setMsg(null);
    const r = await api<{message?: string; error?: string}>('/api/closet/missing-piece', {method: 'POST', json: {description: gap.trim(), ...(routeTo ? {routeTo} : {})}});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was noted.')}); return; }
    const dest = ROUTES.find((x) => x[0] === routeTo)?.[2];
    setGap('');
    setMsg({ok: true, text: dest ? `Noted, and marked for the ${dest} as your request. Nothing has been bought.` : 'Noted on the missing-piece card.'});
    void reload();
  };
  const off = busy || gap.trim().length < 2;
  return (
    <AHCard style={{gap: 12}}>
      <Meta>The missing piece</Meta>
      {data.missingPieces.length ? data.missingPieces.map((m, i) => (
        <View key={m.id} style={{flexDirection: 'row', gap: 10}}>
          <Text style={{width: 22, fontFamily: ahFonts.sansSemi, fontSize: 11, color: ah.faint, marginTop: 2}}>{String(i + 1).padStart(2, '0')}</Text>
          <Text style={[s.small, {flex: 1, fontSize: 13, color: ah.text}]}>{m.description}{m.route_to ? <Text style={{color: ah.mute}}> · marked for the {m.route_to}</Text> : null}</Text>
        </View>
      )) : <Text style={s.small}>Nothing missing on file.</Text>}
      <AHInput value={gap} onChangeText={(v) => setGap(v.slice(0, 300))} placeholder="A camel coat that works with Thursday" accessibilityLabel="Describe the missing piece" />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        <RowBtn label="Just note it" onPress={() => note()} disabled={off} />
        {ROUTES.map(([k, l]) => <RowBtn key={k} label={l} onPress={() => note(k)} disabled={off} tone={ah.rose} />)}
      </View>
    </AHCard>
  );
}

function ClosetSample() {
  return (
    <View style={{gap: 10, opacity: 0.9}}>
      <Wardrobe>
        <View style={{flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, gap: 6}}>
          {DAY_NAME.map((d) => (
            <View key={d} style={{flex: 1, gap: 6}}>
              <View style={{alignSelf: 'center', width: 1.5, height: 12, backgroundColor: ah.platinum, opacity: 0.6}} />
              <View style={{aspectRatio: 3 / 4, borderRadius: 8, borderWidth: 1, borderColor: ah.line2, backgroundColor: '#141215'}} />
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, color: ah.mute, textAlign: 'center'}}>{d}</Text>
            </View>
          ))}
        </View>
      </Wardrobe>
      <SampleNote>Sample rail · sign in to dress your week from pieces you own</SampleNote>
    </View>
  );
}

