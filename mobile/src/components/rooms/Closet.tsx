// The Closet — an inside-lit walnut wardrobe with a brass rail: seven days, each dressed from pieces the
// member already owns, and the week approved in one action. Missing pieces stay separate and only go to the
// Stylist / Bag / Exchange when the member says so. Reads GET /api/closet/rotation; writes approve-week,
// looks/:id/hold and missing-piece. A drafted week is a suggestion and is not saved until approved.
import {useState} from 'react';
import {Image, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {API_BASE, api} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {ActionBar, GoldFrame, SampleNote, SectionHead, s} from './shared';
import {LiveGate, OK_GREEN, RowBtn, Status} from './live';

type Look = {id: string; photo_url: string; caption: string | null; source: 'wardrobe' | 'camera'};
type Day = {day: number; lookId: string | null};
type Missing = {id: string; description: string; route_to: string | null; created_at: string};
type ClosetData = {weekStart: string; status: 'approved' | 'draft' | 'held' | 'empty'; approvedAt: string | null; days: Day[]; looks: Look[]; missingPieces: Missing[]};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const WALNUT = '#2A160C';
const ROUTES: Array<['stylist' | 'bag' | 'exchange', string, string]> = [['stylist', 'ASK THE STYLIST', 'Stylist'], ['bag', 'FIND IN THE BAG', 'Bag'], ['exchange', 'ASK THE EXCHANGE', 'Exchange']];

/** Wardrobe looks are public URLs; Camera pieces hung here are private and need the member's key. */
const lookSource = (url: string, token?: string) => (url.startsWith('/') ? {uri: `${API_BASE}${url}`, headers: token ? {Authorization: `Bearer ${token}`} : undefined} : {uri: url});

function Walnut({children}: {children: React.ReactNode}) {
  return (
    <GoldFrame pad={3}>
      <View style={{overflow: 'hidden', backgroundColor: WALNUT}}>
        <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} preserveAspectRatio="none">
          <Defs><LinearGradient id="clamp" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFE4A0" stopOpacity={0.16} /><Stop offset="0.45" stopColor="#2A160C" stopOpacity={0} /></LinearGradient></Defs>
          <Rect width="100%" height="100%" fill="url(#clamp)" />
        </Svg>
        {children}
      </View>
    </GoldFrame>
  );
}

export function Closet({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload, member} = useLive<ClosetData>('/api/closet/rotation');
  // Kept above the rail so the confirmation survives the re-read (and remount) after a save.
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  return (
    <View style={{gap: 12}}>
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
  const statusLine = data.status === 'approved' && !changed ? `APPROVED${data.approvedAt ? ` · ${new Date(data.approvedAt).toLocaleDateString([], {month: 'short', day: 'numeric'}).toUpperCase()}` : ''}`
    : data.status === 'draft' && !changed ? 'DRAFTED FROM YOUR OWN PIECES · NOT SAVED'
    : changed ? 'YOUR CHANGES · NOT SAVED YET'
    : data.status === 'held' ? 'SAVED · NOT APPROVED' : 'NOTHING ON THE RAIL';

  if (data.looks.length === 0) {
    return (
      <View style={{gap: 12}}>
        <Walnut>
          <View style={{padding: 18, alignItems: 'center', gap: 8}}>
            <Icon name="shirt" size={34} color={deco.brass} strokeWidth={1.2} />
            <Text style={{fontFamily: fonts.script, fontSize: 18, lineHeight: 24, color: deco.cream, textAlign: 'center'}}>The rail is empty. Only pieces you own hang here.</Text>
          </View>
        </Walnut>
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
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>WEEK OF {data.weekStart}</Text>
        <Text style={{fontFamily: fonts.mono, fontSize: 9, color: data.status === 'approved' && !changed ? OK_GREEN : deco.brassHighlight}}>{statusLine}</Text>
      </View>
      <Walnut>
        <View style={{height: 3, marginHorizontal: 10, marginTop: 12, backgroundColor: deco.brassHighlight}} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{padding: 10, gap: 8}}>
          {days.map((d, i) => {
            const look = d.lookId ? byId[d.lookId] : null;
            const on = i === sel;
            return (
              <Pressable key={i} onPress={() => setSel(i)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${DAYS[i]}: ${look?.caption ?? (look ? 'owned look' : 'rest day')}`} style={{width: 78, gap: 4}}>
                <View style={{alignSelf: 'center', width: 2, height: 10, backgroundColor: deco.brass}} />
                <View style={{aspectRatio: 3 / 4, borderWidth: on ? 2 : 1, borderColor: on ? acc : 'rgba(201,169,97,0.4)', backgroundColor: '#140A06', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
                  {look ? <Image source={lookSource(look.photo_url, token)} style={{width: '100%', height: '100%'}} resizeMode="cover" accessibilityLabel={look.caption ?? 'Owned look'} /> : <Text style={{fontFamily: fonts.mono, fontSize: 8, color: 'rgba(244,232,208,0.45)'}}>REST</Text>}
                </View>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.2, color: on ? acc : deco.brassHighlight, textAlign: 'center'}}>{DAYS[i]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Walnut>

      <Animated.View key={sel} entering={FadeInDown.duration(250)} style={{gap: 8}}>
        <SectionHead>{DAYS[sel]} · {cur ? (cur.caption ?? 'OWNED LOOK').toUpperCase() : 'REST DAY'}</SectionHead>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
          <Pressable onPress={() => setDays((xs) => xs.map((x) => (x.day === sel ? {...x, lookId: null} : x)))} accessibilityRole="button" accessibilityState={{selected: !cur}}
            style={{width: 64, aspectRatio: 3 / 4, borderWidth: 1, borderColor: !cur ? deco.brassHighlight : 'rgba(201,169,97,0.35)', alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontFamily: fonts.mono, fontSize: 8, color: deco.cream}}>REST</Text>
          </Pressable>
          {data.looks.map((l) => {
            const on = cur?.id === l.id;
            return (
              <Pressable key={l.id} onPress={() => setDays((xs) => xs.map((x) => (x.day === sel ? {...x, lookId: l.id} : x)))} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={l.caption ?? 'Owned look'}
                style={{width: 64, aspectRatio: 3 / 4, borderWidth: on ? 2 : 1, borderColor: on ? deco.brassHighlight : 'rgba(201,169,97,0.35)', overflow: 'hidden'}}>
                <Image source={lookSource(l.photo_url, token)} style={{width: '100%', height: '100%'}} resizeMode="cover" />
              </Pressable>
            );
          })}
        </ScrollView>
        {cur ? <RowBtn label={`HOLD THIS LOOK FOR ${DAYS[sel]}`} onPress={hold} disabled={busy} /> : null}
      </Animated.View>

      <ActionBar label={busy ? 'ONE MOMENT…' : data.status === 'approved' && !changed ? 'APPROVED · CHANGE A DAY TO REDO' : 'APPROVE THE WEEK'} color={data.status === 'approved' && !changed ? deco.brass : acc} onPress={approve} disabled={busy || (data.status === 'approved' && !changed)} />
      <Status msg={msg} />
      <MissingPieces data={data} gap={gap} setGap={setGap} busy={busy} setBusy={setBusy} setMsg={setMsg} reload={reload} />
      <SampleNote>YOUR OWN PIECES ONLY · CAMERA PIECES STAY PRIVATE · NOTHING IS BOUGHT FROM THE CLOSET</SampleNote>
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
  return (
    <View style={{padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)'}}>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>THE MISSING PIECE</Text>
      {data.missingPieces.length ? data.missingPieces.map((m) => (
        <Text key={m.id} style={s.small}>— {m.description}{m.route_to ? ` · marked for the ${m.route_to}` : ''}</Text>
      )) : <Text style={s.small}>Nothing missing on file.</Text>}
      <TextInput value={gap} onChangeText={(v) => setGap(v.slice(0, 300))} placeholder="A camel coat that works with Thursday" placeholderTextColor="rgba(244,232,208,0.4)" accessibilityLabel="Describe the missing piece"
        style={{minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)', fontFamily: fonts.body, fontSize: 13, color: deco.cream}} />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
        <RowBtn label="JUST NOTE IT" onPress={() => note()} disabled={busy || gap.trim().length < 2} />
        {ROUTES.map(([k, l]) => <RowBtn key={k} label={l} onPress={() => note(k)} disabled={busy || gap.trim().length < 2} tone={deco.brassHighlight} />)}
      </View>
    </View>
  );
}

function ClosetSample() {
  return (
    <View style={{gap: 8, opacity: 0.85}}>
      <Walnut>
        <View style={{height: 3, marginHorizontal: 10, marginTop: 12, backgroundColor: deco.brassHighlight}} />
        <View style={{flexDirection: 'row', padding: 10, gap: 6}}>
          {DAYS.map((d) => (
            <View key={d} style={{flex: 1, gap: 4}}>
              <View style={{alignSelf: 'center', width: 2, height: 10, backgroundColor: deco.brass}} />
              <View style={{aspectRatio: 3 / 4, borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)', backgroundColor: '#140A06'}} />
              <Text style={{fontFamily: fonts.capsBold, fontSize: 8, color: deco.brassHighlight, textAlign: 'center'}}>{d}</Text>
            </View>
          ))}
        </View>
      </Walnut>
      <SampleNote>SAMPLE RAIL · SIGN IN TO DRESS YOUR WEEK FROM PIECES YOU OWN</SampleNote>
    </View>
  );
}
