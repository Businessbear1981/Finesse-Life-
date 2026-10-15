// The Jazz Club — down the back stair: a smoky rose stage, one spotlight, and the house's programme
// (GET /api/jazz-club/program). The spotlight is lit only when the server says a set is genuinely live.
// Joining and tipping are wired to the real routes, which refuse honestly until the audio partner and
// performer payouts are connected (join 501/503, tips 409) — the room shows exactly that, never a fake seat.
// Store builds (RELEASE.jazzLive false) show the programme and replays only: no join or tip control that can't complete.
import {useEffect, useId, useState} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, Ellipse, LinearGradient, Polygon, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {failure, useLive} from '@/lib/live';
import {RELEASE} from '@/lib/release';
import {AHCard, AHChip, AHEyebrow, AHLiveDot, AHTitle} from '@/components/ah';
import {ActionBar, SampleNote, s} from './shared';
import {LiveGate, NumRow, OK_GREEN, RowBtn, Status} from './live';

type Session = {id: string; title: string; performers: string[] | null; starts_at: string; ends_at: string | null; state: string; replay_until: string | null; licensing_note: string | null};
type JazzData = {sessions: Session[]; live: Session | null; audioProvider: 'configured' | 'not_connected'};
type Err = {message?: string; error?: string};

const SOUND_PENDING = 'Opens when the audio partner is connected.';
const when = (iso: string) => new Date(iso).toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'});

/** The stage: rose smoke, a velvet curtain line and one spotlight that wakes only for a live set. */
function Stage({lit, children}: {lit: boolean; children?: React.ReactNode}) {
  const id = `jz${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const reduce = useReducedMotion();
  const glow = useSharedValue(lit ? 1 : 0.18);
  const drift = useSharedValue(0);
  useEffect(() => {
    glow.value = lit && !reduce ? withRepeat(withSequence(withTiming(1, {duration: 1600}), withTiming(0.7, {duration: 1600})), -1, true) : withTiming(lit ? 1 : 0.18, {duration: 400});
  }, [lit, glow, reduce]);
  useEffect(() => {
    if (!reduce) drift.value = withRepeat(withSequence(withTiming(1, {duration: 7000}), withTiming(0, {duration: 7000})), -1);
  }, [reduce, drift]);
  const beam = useAnimatedStyle(() => ({opacity: glow.value}));
  const smoke = useAnimatedStyle(() => ({transform: [{translateX: (drift.value - 0.5) * 24}], opacity: 0.75 + drift.value * 0.25}));
  return (
    <View style={{height: 330, borderRadius: radius.hero, backgroundColor: '#0A0607', overflow: 'hidden', borderWidth: 1, borderColor: ah.line}}>
      <Animated.View style={[StyleSheet.absoluteFill, {left: -20, right: -20}, smoke]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={`${id}a`} cx="0.25" cy="0.75" r="0.6"><Stop offset="0" stopColor={ah.rose3} stopOpacity={0.85} /><Stop offset="1" stopColor={ah.rose3} stopOpacity={0} /></RadialGradient>
            <RadialGradient id={`${id}b`} cx="0.8" cy="0.4" r="0.55"><Stop offset="0" stopColor={ah.rose2} stopOpacity={0.6} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient>
            <RadialGradient id={`${id}c`} cx="0.6" cy="0.95" r="0.5"><Stop offset="0" stopColor={ah.platinum} stopOpacity={0.18} /><Stop offset="1" stopColor={ah.platinum} stopOpacity={0} /></RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id}a)`} />
          <Rect width="100%" height="100%" fill={`url(#${id}b)`} />
          <Rect width="100%" height="100%" fill={`url(#${id}c)`} />
        </Svg>
      </Animated.View>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 320 330" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
        <Defs>
          <LinearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0.35" stopColor="#000" stopOpacity={0} /><Stop offset="1" stopColor="#000" stopOpacity={0.82} /></LinearGradient>
        </Defs>
        {Array.from({length: 17}, (_, i) => <Rect key={i} x={i * 20 + 4} y={0} width={0.8} height={250} fill="#FFFFFF" opacity={0.035} />)}
        <Rect width={320} height={330} fill={`url(#${id}f)`} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, beam]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 320 330" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <LinearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={ah.blush} stopOpacity={0.55} /><Stop offset="1" stopColor={ah.blush} stopOpacity={0} /></LinearGradient>
            <RadialGradient id={`${id}p`} cx="160" cy="258" r="90" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor={ah.blush} stopOpacity={0.4} /><Stop offset="1" stopColor={ah.blush} stopOpacity={0} /></RadialGradient>
          </Defs>
          <Polygon points="152,0 168,0 230,262 90,262" fill={`url(#${id}s)`} />
          <Ellipse cx={160} cy={258} rx={90} ry={18} fill={`url(#${id}p)`} />
          <Circle cx={160} cy={2} r={5} fill={ah.white} />
        </Svg>
      </Animated.View>
      <View style={{position: 'absolute', left: 22, right: 22, bottom: 22, gap: 6}}>{children}</View>
    </View>
  );
}

export function JazzClub({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload} = useLive<JazzData>('/api/jazz-club/program');
  return (
    <View style={{gap: 16}}>
      <LiveGate live={live} reload={() => void reload()} what="the Jazz Club programme" signedOut={<JazzSample />}>
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
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
      <Stage lit={!!data.live}>
        {data.live ? <AHChip label="Live now" live tone="rose" /> : <AHEyebrow color="rgba(242,201,184,0.8)">{head ? `Next · ${when(head.starts_at)}` : 'No set scheduled'}</AHEyebrow>}
        <AHTitle size={40}>{head?.title ?? 'The lamp is dark tonight.'}</AHTitle>
        {head?.performers?.length ? <Text style={[s.small, {fontSize: 13, color: 'rgba(237,235,231,0.75)'}]}>{head.performers.join(' · ')}</Text> : null}
      </Stage>

      {RELEASE.jazzLive ? (
        <AHCard pad={16} style={{flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: connected ? 'rgba(126,226,184,0.3)' : ah.line}}>
          {connected ? <AHLiveDot color={OK_GREEN} /> : <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: ah.faintLine}} />}
          <Text style={[s.small, {flex: 1, fontSize: 13, lineHeight: 19}]}>{connected ? 'House sound is connected.' : `House sound is not connected yet. ${SOUND_PENDING}`} Tips open once performer payouts are set up.</Text>
        </AHCard>
      ) : null}

      {RELEASE.jazzLive && data.live ? (
        <View style={{gap: 10}}>
          <ActionBar label={busy ? 'One moment…' : connected ? 'Join tonight’s room' : 'Join · opens with the audio partner'} color={acc} onPress={() => join(data.live!)} disabled={busy} />
          <RowBtn label="Tip the performers" onPress={tip} disabled={busy} />
        </View>
      ) : null}
      <Status msg={msg} />

      <AHEyebrow style={{marginTop: 8}}>The programme · next two weeks</AHEyebrow>
      {data.sessions.length === 0 ? <Text style={[s.small, {textAlign: 'center'}]}>No set on the programme. The lamp wakes only when a live room genuinely starts.</Text> : null}
      <View>
        {data.sessions.map((x, i) => {
          const canReplay = x.replay_until && new Date(x.replay_until) > new Date() && x.state !== 'live' && new Date(x.starts_at) < new Date();
          return (
            <NumRow key={x.id} n={i + 1} meta={when(x.starts_at)} title={x.title} last={i === data.sessions.length - 1}
              sub={!x.performers?.length && !x.licensing_note ? undefined : <>{x.performers?.length ? x.performers.join(', ') : ''}{x.licensing_note ? <Text style={{color: ah.faint, fontSize: 12}}>{x.performers?.length ? '\n' : ''}{x.licensing_note}</Text> : null}</>}
              right={canReplay ? <RowBtn label="Replay" onPress={() => replay(x)} disabled={busy} /> : <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: x.state === 'live' ? OK_GREEN : ah.mute}}>{x.state}</Text>} />
          );
        })}
      </View>
      <SampleNote>{RELEASE.jazzLive ? 'The house programme · no seat, ticket or tip is taken until the audio partner and payouts are live' : 'The house programme'}</SampleNote>
    </Animated.View>
  );
}

function JazzSample() {
  return (
    <View style={{gap: 10, opacity: 0.92}}>
      <Stage lit={false}>
        <AHEyebrow color="rgba(242,201,184,0.8)">Sample · Fri 9 PM</AHEyebrow>
        <AHTitle size={40}>The second set</AHTitle>
        <Text style={[s.small, {fontSize: 13, color: 'rgba(237,235,231,0.75)'}]}>A trio, one lamp, the members who stayed.</Text>
      </Stage>
      <SampleNote>Sample stage · sign in to see the house programme</SampleNote>
    </View>
  );
}
