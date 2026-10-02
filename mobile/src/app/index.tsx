// 01 · The Entrance KeyLock. The member sets six brass numbers; the server decides (no per-digit
// oracle, no client PIN). Only an `open` response plays the unlock and admits them to the Lobby.
import {useCallback, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Linking, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import Svg, {Defs, LinearGradient as SvgLinear, RadialGradient, Rect, Stop} from 'react-native-svg';
import {useRouter} from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue} from 'react-native-reanimated';

const PROMPT = 'Roll the six tumblers to your house code, then pull.';
import {api} from '@/lib/api';
import {deco, easeCine, fonts} from '@/lib/deco';
import {Backdrop} from '@/components/keylock/Backdrop';
import {VaultDial, useHoldShake} from '@/components/keylock/VaultDial';
import {CombinationCylinder} from '@/components/keylock/CombinationCylinder';
import {Wordmark} from '@/components/keylock/Wordmark';

type Phase = 'arriving' | 'ready' | 'verifying' | 'open' | 'held' | 'closed';

export default function Entrance() {
  const router = useRouter();
  const {width, height} = useWindowDimensions();
  const input = useRef<TextInput>(null);
  const [reduced, setReduced] = useState(false);
  const [phase, setPhase] = useState<Phase>('arriving');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [values, setValues] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [touched, setTouched] = useState<boolean[]>([false, false, false, false, false, false]);
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState('MEMBERS ONLY');
  const [status, setStatus] = useState(PROMPT);
  const setCount = touched.filter(Boolean).length;

  const arrive = useSharedValue(0);
  const open = useSharedValue(0);
  const drift = useSharedValue(0);
  const {style: shakeStyle, shake} = useHoldShake();

  const dialSize = Math.min(width - 56, 340, height * 0.4);
  const dialTop = Math.max(150, height * 0.18);
  const centerY = dialTop + dialSize / 2;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
  }, []);

  // Development builds only: when the house line is unreachable, rehearse the mechanism locally
  // so the motion can be reviewed. Release builds (__DEV__ === false) never take this path.
  const [rehearsal, setRehearsal] = useState(false);

  const requestChallenge = useCallback(async () => {
    const r = await api<{state: string; challengeId?: string}>('/api/keylock/entrance/challenge', {method: 'POST', json: {}});
    if (r.body.state === 'ready' && r.body.challengeId) { setChallengeId(r.body.challengeId); setRehearsal(false); return true; }
    if (__DEV__ && r.status === 0) { setRehearsal(true); setMsg('REHEARSAL · HOUSE LINE OFFLINE'); return true; }
    setMsg((r.body.message ?? 'The entrance is being serviced.').toUpperCase());
    setPhase('closed');
    return false;
  }, []);

  useEffect(() => {
    arrive.value = withTiming(1, {duration: reduced ? 0 : 1300, easing: easeCine});
    if (!reduced) drift.value = withRepeat(withTiming(1, {duration: 24000, easing: Easing.linear}), -1, true);
    void requestChallenge().then((ok) => { if (ok) setPhase('ready'); });
  }, [arrive, drift, reduced, requestChallenge]);

  const verify = useCallback(async (digits: string) => {
    setPhase('verifying');
    const r = rehearsal && __DEV__
      ? {status: 200, ok: true, body: {state: 'open', message: undefined as string | undefined}}
      : await api<{state: string; mode?: string}>('/api/keylock/entrance/verify', {method: 'POST', json: {challengeId, code: digits}});
    if (r.body.state === 'open') {
      setPhase('open');
      setMsg('THE HOUSE IS OPEN');
      setStatus('The mechanism yields. Welcome home.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility?.('The house is open.');
      open.value = withDelay(reduced ? 0 : 350, withTiming(1, {duration: reduced ? 0 : 1800, easing: easeCine}));
      setTimeout(() => router.replace('/side'), reduced ? 400 : 2800);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    shake(reduced);
    setStatus(r.body.message ?? 'The mechanism holds.');
    setPhase('held');
    setTimeout(async () => {
      setTouched([false, false, false, false, false, false]); setTyped('');
      const ok = r.body.state === 'invalid' ? true : await requestChallenge();
      if (ok) { setPhase('ready'); setStatus(PROMPT); }
    }, reduced ? 200 : 1300);
  }, [challengeId, open, reduced, rehearsal, requestChallenge, router, shake]);

  const roll = (i: number, dir: 1 | -1) => {
    if (phase !== 'ready') return;
    void Haptics.selectionAsync().catch(() => {});
    setValues((v) => v.map((d, j) => (j === i ? (d + dir + 10) % 10 : d)));
    setTouched((t) => t.map((x, j) => (j === i ? true : x)));
  };
  // Keyboard / paste / screen-reader path: typed digits set the tumblers left to right.
  const onDigits = (v: string) => {
    if (phase !== 'ready') return;
    const clean = v.replace(/\D/g, '').slice(0, 6);
    if (clean.length > typed.length) void Haptics.selectionAsync().catch(() => {});
    setTyped(clean);
    setValues((cur) => cur.map((d, j) => (j < clean.length ? Number(clean[j]) : d)));
    setTouched((t) => t.map((x, j) => x || j < clean.length));
  };
  const pull = () => { if (phase === 'ready') void verify(values.join('')); };

  const msgStyle = useAnimatedStyle(() => ({opacity: arrive.value}));
  const headStyle = useAnimatedStyle(() => ({opacity: arrive.value, transform: [{translateY: 14 * (1 - arrive.value)}]}));
  const dialStyle = useAnimatedStyle(() => ({
    opacity: arrive.value,
    transform: [{scale: 0.9 + 0.1 * arrive.value + 0.03 * open.value}],
  }));

  const lastDigit = setCount ? values.reduce((acc, d) => acc + d, 0) % 10 : null;

  return (
    <View style={styles.page}>
      <Backdrop centerY={centerY} arrive={arrive} open={open} drift={drift} />
      <Animated.View style={[styles.head, headStyle]}>
        <Wordmark width={width - 40} />
      </Animated.View>
      <Animated.View style={[{position: 'absolute', top: dialTop, left: (width - dialSize) / 2}, dialStyle, shakeStyle]}>
        <Pressable onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="The entrance lock. Double tap to enter the house code.">
          <VaultDial size={dialSize} setCount={setCount} lastDigit={lastDigit} arrive={arrive} open={open} reduced={reduced} />
        </Pressable>
      </Animated.View>
      <View style={[styles.bottom, {top: dialTop + dialSize - 4}]}>
        <Animated.Text style={[styles.msg, msgStyle, phase === 'open' && {color: deco.brassLight}]}>{msg}</Animated.Text>
        <CombinationCylinder width={width - 24} values={values} touched={touched} onRoll={roll} lit={phase === 'open'} open={phase === 'open'}
          reduced={reduced} disabled={phase !== 'ready'} />
        <Text style={[styles.status, phase === 'held' && {color: deco.pink}]} accessibilityLiveRegion="polite">{status}</Text>
        {phase === 'closed' ? (
          <Pressable style={styles.pull} onPress={() => requestChallenge().then((ok) => { if (ok) { setPhase('ready'); setStatus(PROMPT); } })} accessibilityRole="button">
            <Text style={styles.pullText}>CALL THE DOORMAN</Text>
          </Pressable>
        ) : (
          <Pressable style={({pressed}) => [styles.pull, pressed && {backgroundColor: 'rgba(201,169,97,0.18)'}, phase !== 'ready' && {opacity: 0.5}]}
            onPress={pull} disabled={phase !== 'ready'} accessibilityRole="button" accessibilityLabel="Pull to open">
            <Text style={styles.pullText}>PULL TO OPEN</Text>
          </Pressable>
        )}
        <Text style={styles.invite}>Not a member? <Text style={{color: 'rgba(201,169,97,0.9)', textDecorationLine: 'underline'}}
          onPress={() => void Linking.openURL('https://finesselife.vip/signup')}>Request an invitation</Text></Text>
        <Pressable onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="Type the house code instead">
          <Text style={styles.typeIt}>TYPE THE CODE INSTEAD</Text>
        </Pressable>
      </View>
      <Flood open={open} reduced={reduced} />
      <TextInput ref={input} value={typed} onChangeText={onDigits} keyboardType="number-pad" maxLength={6}
        textContentType="oneTimeCode" autoComplete="one-time-code" secureTextEntry={false}
        caretHidden contextMenuHidden={false} style={styles.hidden} accessibilityLabel="House code, six digits" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: deco.ink, overflow: 'hidden'},
  head: {position: 'absolute', top: 54, left: 0, right: 0},
  bottom: {position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 11},
  status: {fontFamily: fonts.script, fontSize: 17, lineHeight: 23, color: 'rgba(244,232,208,0.85)', textAlign: 'center', paddingHorizontal: 28, minHeight: 24},
  pull: {minHeight: 48, justifyContent: 'center', paddingHorizontal: 40, borderWidth: 1, borderColor: deco.brass, backgroundColor: 'rgba(10,4,6,0.6)'},
  pullText: {fontFamily: fonts.label, fontSize: 12, letterSpacing: 4.8, color: deco.brassHighlight},
  invite: {fontFamily: fonts.script, fontSize: 14, color: 'rgba(244,232,208,0.55)'},
  typeIt: {fontFamily: fonts.label, fontSize: 9, letterSpacing: 3, color: 'rgba(201,169,97,0.55)', paddingVertical: 6},
  msg: {fontFamily: fonts.label, fontSize: 11, letterSpacing: 5.5, color: deco.brass, opacity: 0.8, textAlign: 'center'},
  hidden: {position: 'absolute', opacity: 0, width: 1, height: 1, left: -10, top: -10},
});

/** Warm flood of light and a brass sweep when the house opens (design: floodOpacity + fl-sweep). */
function Flood({open, reduced}: {open: SharedValue<number>; reduced: boolean}) {
  const {width, height} = useWindowDimensions();
  const flood = useAnimatedStyle(() => ({opacity: Math.max(0, (open.value - 0.35) / 0.65) * 0.85}));
  const sweep = useAnimatedStyle(() => ({
    opacity: open.value > 0 && open.value < 1 ? 1 : 0,
    transform: [{translateX: (-1 + 2.2 * open.value) * width}],
  }));
  if (reduced) return null;
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, flood]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="flood" cx={width / 2} cy={height / 2} r={Math.max(width, height) * 0.75} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFA96B" stopOpacity={0.9} />
              <Stop offset="0.4" stopColor="#C9A961" stopOpacity={0.6} />
              <Stop offset="1" stopColor="#0A0406" stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#flood)" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{position: 'absolute', top: -height * 0.2, width: width * 0.9, height: height * 1.4}, sweep]}>
        <Svg width={width * 0.9} height={height * 1.4}>
          <Defs>
            <SvgLinear id="sweep" x1="0" y1="0.1" x2="1" y2="0">
              <Stop offset="0.2" stopColor="#C9A961" stopOpacity={0} />
              <Stop offset="0.45" stopColor="#E8C87A" stopOpacity={0.6} />
              <Stop offset="0.5" stopColor="#FFF4C2" stopOpacity={0.95} />
              <Stop offset="0.56" stopColor="#E8C87A" stopOpacity={0.16} />
              <Stop offset="0.8" stopColor="#C9A961" stopOpacity={0} />
            </SvgLinear>
          </Defs>
          <Rect x={0} y={0} width={width * 0.9} height={height * 1.4} fill="url(#sweep)" />
        </Svg>
      </Animated.View>
    </>
  );
}
