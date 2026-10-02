// 01 · The Entrance KeyLock. The member sets six brass numbers; the server decides (no per-digit
// oracle, no client PIN). Only an `open` response plays the unlock and admits them to the Lobby.
import {useCallback, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {useRouter} from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming} from 'react-native-reanimated';
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
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('MEMBERS ONLY');

  const arrive = useSharedValue(0);
  const open = useSharedValue(0);
  const drift = useSharedValue(0);
  const {style: shakeStyle, shake} = useHoldShake();

  const dialSize = Math.min(width - 24, 380);
  const dialTop = Math.max(170, height * 0.2);
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility?.('The house is open.');
      open.value = withDelay(reduced ? 0 : 350, withTiming(1, {duration: reduced ? 0 : 1250, easing: easeCine}));
      setTimeout(() => router.replace('/lobby'), reduced ? 400 : 2600);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    shake(reduced);
    setMsg((r.body.message ?? 'The mechanism holds.').toUpperCase());
    setPhase('held');
    setTimeout(async () => {
      setCode('');
      const ok = r.body.state === 'invalid' ? true : await requestChallenge();
      if (ok) { setPhase('ready'); setMsg('MEMBERS ONLY'); }
    }, reduced ? 200 : 900);
  }, [challengeId, open, reduced, rehearsal, requestChallenge, router, shake]);

  const onDigits = (v: string) => {
    if (phase !== 'ready') return;
    const clean = v.replace(/\D/g, '').slice(0, 6);
    if (clean.length > code.length) void Haptics.selectionAsync().catch(() => {});
    setCode(clean);
    if (clean.length === 6) void verify(clean);
  };

  const msgStyle = useAnimatedStyle(() => ({opacity: arrive.value}));
  const headStyle = useAnimatedStyle(() => ({opacity: arrive.value, transform: [{translateY: 14 * (1 - arrive.value)}]}));
  const dialStyle = useAnimatedStyle(() => ({
    opacity: arrive.value,
    transform: [{scale: 0.9 + 0.1 * arrive.value + 0.03 * open.value}],
  }));

  const lastDigit = code.length ? Number(code[code.length - 1]) : null;

  return (
    <View style={styles.page}>
      <Backdrop centerY={centerY} arrive={arrive} open={open} drift={drift} />
      <Animated.View style={[styles.head, headStyle]}>
        <Wordmark width={width - 40} />
      </Animated.View>
      <Animated.View style={[{position: 'absolute', top: dialTop, left: (width - dialSize) / 2}, dialStyle, shakeStyle]}>
        <Pressable onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="The entrance lock. Double tap to enter the house code.">
          <VaultDial size={dialSize} setCount={code.length} lastDigit={lastDigit} arrive={arrive} open={open} reduced={reduced} />
        </Pressable>
      </Animated.View>
      <View style={[styles.bottom, {top: dialTop + dialSize + 4}]}>
        <Animated.Text style={[styles.msg, msgStyle, phase === 'open' && {color: deco.brassLight}]} accessibilityLiveRegion="polite">{msg}</Animated.Text>
        <CombinationCylinder width={width - 32} digits={code} lit={phase === 'open'} reduced={reduced}
          disabled={phase !== 'ready'} onPress={() => input.current?.focus()} />
        {phase === 'closed' ? (
          <Pressable style={styles.retry} onPress={() => requestChallenge().then((ok) => { if (ok) { setPhase('ready'); setMsg('MEMBERS ONLY'); } })} accessibilityRole="button">
            <Text style={styles.retryText}>CALL THE DOORMAN AGAIN</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput ref={input} value={code} onChangeText={onDigits} keyboardType="number-pad" maxLength={6}
        textContentType="oneTimeCode" autoComplete="one-time-code" secureTextEntry={false}
        caretHidden contextMenuHidden={false} style={styles.hidden} accessibilityLabel="House code, six digits" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: deco.ink, overflow: 'hidden'},
  head: {position: 'absolute', top: 54, left: 0, right: 0},
  bottom: {position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 14},
  msg: {fontFamily: fonts.label, fontSize: 11, letterSpacing: 5.5, color: deco.brass, opacity: 0.8, textAlign: 'center'},
  retry: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, borderWidth: 1, borderColor: deco.brass},
  retryText: {fontFamily: fonts.label, fontSize: 11, letterSpacing: 4, color: deco.brassHighlight},
  hidden: {position: 'absolute', opacity: 0, width: 1, height: 1, left: -10, top: -10},
});
