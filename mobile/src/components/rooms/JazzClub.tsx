// The Jazz Club — down the back stair: green-black walls, one brass lamp over the stage, and the house's
// programme (GET /api/jazz-club/program). The lamp is lit only when the server says a set is genuinely live.
// Joining and tipping are wired to the real routes, which refuse honestly until the audio partner and
// performer payouts are connected (join 501/503, tips 409) — the room shows exactly that, never a fake seat.
import {useEffect, useState} from 'react';
import {Linking, Text, View} from 'react-native';
import Animated, {FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Defs, Polygon, RadialGradient, Rect, Stop, Circle} from 'react-native-svg';
import {api} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {failure, useLive} from '@/lib/live';
import {ActionBar, SampleNote, SectionHead, s} from './shared';
import {LiveGate, OK_GREEN, RowBtn, Status} from './live';

type Session = {id: string; title: string; performers: string[] | null; starts_at: string; ends_at: string | null; state: string; replay_until: string | null; licensing_note: string | null};
type JazzData = {sessions: Session[]; live: Session | null; audioProvider: 'configured' | 'not_connected'};
type Err = {message?: string; error?: string};

const GREEN_BLACK = '#050806';
const SOUND_PENDING = 'Opens when the audio partner is connected.';
const when = (iso: string) => new Date(iso).toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'}).toUpperCase();

/** The stage: slatted green-black walls and one lamp that wakes only for a live set. */
function Stage({lit, acc, children}: {lit: boolean; acc: string; children?: React.ReactNode}) {
  const glow = useSharedValue(lit ? 1 : 0.15);
  useEffect(() => {
    glow.value = lit ? withRepeat(withSequence(withTiming(1, {duration: 1600}), withTiming(0.7, {duration: 1600})), -1, true) : withTiming(0.15, {duration: 400});
  }, [lit, glow]);
  const beam = useAnimatedStyle(() => ({opacity: glow.value}));
  return (
    <View style={{height: 190, backgroundColor: GREEN_BLACK, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)'}}>
      <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice">
        {Array.from({length: 23}, (_, i) => <Rect key={i} x={i * 14} y={0} width={1.4} height={190} fill="#0F1A12" />)}
        <Rect x={0} y={160} width={320} height={30} fill="#0B0705" />
        <Rect x={150} y={8} width={20} height={6} fill={deco.brassMid} />
      </Svg>
      <Animated.View style={[{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}, beam]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice">
          <Defs><RadialGradient id="jlamp" cx="160" cy="150" r="120" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor={acc} stopOpacity={0.45} /><Stop offset="1" stopColor={acc} stopOpacity={0} /></RadialGradient></Defs>
          <Polygon points="160,14 92,166 228,166" fill="url(#jlamp)" />
          <Circle cx={160} cy={15} r={4} fill={deco.brassWhite} />
        </Svg>
      </Animated.View>
      <View style={{position: 'absolute', left: 12, right: 12, bottom: 10}}>{children}</View>
    </View>
  );
}

export function JazzClub({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload} = useLive<JazzData>('/api/jazz-club/program');
  return (
    <View style={{gap: 12}}>
      <LiveGate live={live} reload={() => void reload()} what="the Jazz Club programme" signedOut={<JazzSample acc={acc} />}>
        {(data) => <JazzLive data={data} acc={acc} />}
      </LiveGate>
    </View>
  );
}

function JazzLive({data, acc}: {data: JazzData; acc: string}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const head = data.live ?? data.sessions[0] ?? null;
  const connected = data.audioProvider === 'configured';

  const join = async (sess: Session) => {
    setBusy(true); setMsg(null);
    const r = await api<Err>(`/api/jazz-club/rooms/${sess.id}/join`, {method: 'POST'});
    setBusy(false);
    // The server never hands out a seat today: 501 adapter pending, 503 no audio provider, 409 not live.
    if (r.status === 501 || r.body.error === 'audio_provider_not_connected' || r.body.error === 'adapter_pending') { setMsg({ok: false, text: `${SOUND_PENDING} ${r.body.message ?? ''}`.trim()}); return; }
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'You have not joined.')}); return; }
    setMsg({ok: false, text: r.body.message ?? 'The house answered but did not open a seat.'});
  };
  const tip = async () => {
    setBusy(true); setMsg(null);
    const r = await api<Err>('/api/jazz-club/tips', {method: 'POST'});
    setBusy(false);
    setMsg({ok: false, text: r.status === 409 ? (r.body.message ?? 'Tips open once performer payouts are set up. Nothing was charged.') : failure(r.status, r.body, 'Nothing was charged.')});
  };
  const replay = async (sess: Session) => {
    setBusy(true); setMsg(null);
    const r = await api<{replay?: {replay_url?: string | null}} & Err>(`/api/jazz-club/replays/${sess.id}`);
    setBusy(false);
    const url = r.body.replay?.replay_url;
    if (r.ok && url) { void Linking.openURL(url).catch(() => setMsg({ok: false, text: 'The replay link could not be opened on this phone.'})); return; }
    setMsg({ok: false, text: r.status === 404 ? 'There is no replay for this set.' : failure(r.status, r.body, 'Nothing was opened.')});
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
      <Stage lit={!!data.live} acc={acc}>
        <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: data.live ? OK_GREEN : deco.brass}}>{data.live ? 'LIVE NOW' : head ? `NEXT · ${when(head.starts_at)}` : 'NO SET SCHEDULED'}</Text>
        <Text style={{fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 28, color: deco.cream}}>{head?.title ?? 'The lamp is dark tonight.'}</Text>
        {head?.performers?.length ? <Text style={s.small}>{head.performers.join(' · ')}</Text> : null}
      </Stage>

      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: connected ? 'rgba(122,245,184,0.45)' : 'rgba(201,169,97,0.45)'}}>
        <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: connected ? OK_GREEN : 'rgba(201,169,97,0.55)'}} />
        <Text style={[s.small, {flex: 1}]}>{connected ? 'House sound is connected.' : `House sound is not connected yet. ${SOUND_PENDING}`} Tips open once performer payouts are set up.</Text>
      </View>

      {data.live ? (
        <View style={{gap: 8}}>
          <ActionBar label={busy ? 'ONE MOMENT…' : connected ? 'JOIN TONIGHT’S ROOM' : 'JOIN · OPENS WITH THE AUDIO PARTNER'} color={acc} onPress={() => join(data.live!)} disabled={busy} />
          <RowBtn label="TIP THE PERFORMERS" onPress={tip} disabled={busy} />
        </View>
      ) : null}
      <Status msg={msg} />

      <SectionHead>THE PROGRAMME · NEXT TWO WEEKS</SectionHead>
      {data.sessions.length === 0 ? <Text style={[s.small, {textAlign: 'center'}]}>No set on the programme. The lamp wakes only when a live room genuinely starts.</Text> : null}
      {data.sessions.map((x) => {
        const canReplay = x.replay_until && new Date(x.replay_until) > new Date() && x.state !== 'live' && new Date(x.starts_at) < new Date();
        return (
          <View key={x.id} style={{flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.25)'}}>
            <View style={{flex: 1, gap: 2}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{when(x.starts_at)}</Text>
              <Text style={{fontFamily: fonts.displayBold, fontSize: 15, color: deco.cream}}>{x.title}</Text>
              {x.performers?.length ? <Text style={s.small}>{x.performers.join(', ')}</Text> : null}
              {x.licensing_note ? <Text style={{fontFamily: fonts.mono, fontSize: 8, color: 'rgba(244,232,208,0.45)'}}>{x.licensing_note}</Text> : null}
            </View>
            {canReplay ? <RowBtn label="REPLAY" onPress={() => replay(x)} disabled={busy} /> : <Text style={{fontFamily: fonts.capsBold, fontSize: 8.5, letterSpacing: 1.2, color: x.state === 'live' ? OK_GREEN : 'rgba(244,232,208,0.55)'}}>{x.state.toUpperCase()}</Text>}
          </View>
        );
      })}
      <SampleNote>THE HOUSE PROGRAMME · NO SEAT, TICKET OR TIP IS TAKEN UNTIL THE AUDIO PARTNER AND PAYOUTS ARE LIVE</SampleNote>
    </Animated.View>
  );
}

function JazzSample({acc}: {acc: string}) {
  return (
    <View style={{gap: 8, opacity: 0.85}}>
      <Stage lit={false} acc={acc}>
        <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: deco.brass}}>SAMPLE · FRI 9 PM</Text>
        <Text style={{fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 28, color: deco.cream}}>The second set</Text>
        <Text style={s.small}>A trio, one lamp, the members who stayed.</Text>
      </Stage>
      <SampleNote>SAMPLE STAGE · SIGN IN TO SEE THE HOUSE PROGRAMME</SampleNote>
    </View>
  );
}
