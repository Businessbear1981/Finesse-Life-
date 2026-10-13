// 01 · The Entrance KeyLock (After Hours: the velvet-rope door). The member puts their six-digit key on
// the guest list; the server decides (no per-digit oracle, no client PIN). The door's seam warms with
// each digit — progress only. Only an `open` response opens the doors and admits them to the house.
import {useCallback, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Keyboard, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {useAnimatedStyle, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import {api} from '@/lib/api';
import {houseSession} from '@/lib/session';
import {easeCine} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {AHChip, AHClock, AHEyebrow, AHGlow, AHMark, AHPill} from '@/components/ah';
import {Door, Flood} from '@/components/keylock/Door';
import {GuestList, KeyPad, useHoldShake} from '@/components/keylock/GuestList';
import {TwoTone} from '@/components/keylock/TwoTone';
import {LegalLinks} from '@/components/legal/LegalLinks';

const PROMPT = 'Six digits, then open the door.';
const EYEBROW = 'The door · Members & their guests';

type Phase = 'arriving' | 'ready' | 'verifying' | 'open' | 'held' | 'closed';

export default function Entrance() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const input = useRef<TextInput>(null);
  const [reduced, setReduced] = useState(false);
  const [phase, setPhase] = useState<Phase>('arriving');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState(EYEBROW);
  const [status, setStatus] = useState(PROMPT);
  // Server answered `mode: 'preview'` (entrance not configured, any code opens). Dev builds only.
  const [preview, setPreview] = useState(false);

  const arrive = useSharedValue(0);
  const open = useSharedValue(0);
  const progress = useSharedValue(0);
  const {style: shakeStyle, shake} = useHoldShake();

  // Fit the door, the key and the keypad on one screen; scroll only on very short phones.
  const compact = height < 760;
  const keyH = Math.max(46, Math.min(58, Math.round((height - 615) / 4.4)));
  const doorW = Math.round(Math.max(92, Math.min(190, width * 0.42, (height - 630) * 0.72)));
  const contentW = Math.min(width, 520);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
  }, []);

  // Development builds only: when the house line is unreachable, rehearse the door locally
  // so the motion can be reviewed. Release builds (__DEV__ === false) never take this path.
  const [rehearsal, setRehearsal] = useState(false);

  const requestChallenge = useCallback(async () => {
    const r = await api<{state: string; challengeId?: string}>('/api/keylock/entrance/challenge', {method: 'POST', json: {}});
    if (r.body.state === 'ready' && r.body.challengeId) { setChallengeId(r.body.challengeId); setRehearsal(false); setMsg(EYEBROW); return true; }
    if (__DEV__ && r.status === 0) { setRehearsal(true); setMsg('Rehearsal · house line offline'); return true; }
    setMsg('The door is closed for now');
    setStatus(r.body.message ?? 'The entrance is being serviced.');
    setPhase('closed');
    return false;
  }, []);

  useEffect(() => {
    arrive.value = withTiming(1, {duration: reduced ? 0 : 1100, easing: easeCine});
    void requestChallenge().then((ok) => { if (ok) setPhase('ready'); });
  }, [arrive, reduced, requestChallenge]);

  useEffect(() => {
    progress.value = withTiming(phase === 'open' ? 1 : typed.length / 6, {duration: reduced ? 0 : 450});
  }, [typed, phase, progress, reduced]);

  const verify = useCallback(async (digits: string) => {
    setPhase('verifying');
    const r = rehearsal && __DEV__
      ? {status: 200, ok: true, body: {state: 'open', message: undefined as string | undefined}}
      : await api<{state: string; mode?: string}>('/api/keylock/entrance/verify', {method: 'POST', json: {challengeId, code: digits}});
    const isPreview = r.body.state === 'open' && 'mode' in r.body && r.body.mode === 'preview';
    if (isPreview && !__DEV__) {
      // An unconfigured server opens for any code. A release build never lets that through.
      setMsg("The front desk isn't open yet");
      setStatus("The front desk isn't open yet. Please come back soon.");
      setTyped('');
      setPhase('closed');
      return;
    }
    if (r.body.state === 'open') {
      setPreview(isPreview);
      setPhase('open');
      setMsg('You’re on the list');
      setStatus('You’re on the list. Doors opening.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility?.('You are on the list. The doors are opening.');
      open.value = withDelay(reduced ? 0 : 250, withTiming(1, {duration: reduced ? 0 : 1900, easing: easeCine}));
      // A member who has already chosen a side on this device goes straight to the hotel.
      setTimeout(() => { void houseSession.stored().then((s) => router.replace(s ? '/hotel' : '/side')); }, reduced ? 400 : 2800);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    shake(reduced);
    setStatus(r.body.message ?? 'That key isn’t on the list. Try again.');
    setPhase('held');
    setTimeout(async () => {
      setTyped('');
      const ok = r.body.state === 'invalid' ? true : await requestChallenge();
      if (ok) { setPhase('ready'); setStatus(PROMPT); }
    }, reduced ? 200 : 1300);
  }, [challengeId, open, reduced, rehearsal, requestChallenge, router, shake]);

  // Keypad, keyboard, paste and screen-reader paths all land here: digits fill the list left to right.
  const onDigits = (v: string) => {
    if (phase !== 'ready') return;
    const clean = v.replace(/\D/g, '').slice(0, 6);
    if (clean.length > typed.length) void Haptics.selectionAsync().catch(() => {});
    setTyped(clean);
    return clean;
  };
  const onTyped = (v: string) => {
    const clean = onDigits(v);
    if (clean?.length === 6) Keyboard.dismiss(); // reveal the Open key
  };
  const onDelete = () => {
    if (phase !== 'ready' || !typed) return;
    void Haptics.selectionAsync().catch(() => {});
    setTyped((t) => t.slice(0, -1));
  };
  const pull = () => { if (phase === 'ready' && typed.length === 6) void verify(typed); };
  const callDoorman = () => requestChallenge().then((ok) => { if (ok) { setPhase('ready'); setStatus(PROMPT); } });

  const headStyle = useAnimatedStyle(() => ({opacity: arrive.value, transform: [{translateY: 14 * (1 - arrive.value)}]}));
  const doorStyle = useAnimatedStyle(() => ({opacity: arrive.value, transform: [{scale: 0.94 + 0.06 * arrive.value + 0.04 * open.value}]}));

  const line = phase === 'verifying' ? 'Checking the list…' : status;
  const lineTone = phase === 'held' || phase === 'closed' ? 'error' : phase === 'open' ? 'rose' : 'mute';
  const tone = phase === 'held' ? 'error' : phase === 'open' ? 'open' : 'idle';

  return (
    <View style={styles.page}>
      <AHGlow height={520} />
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 14, paddingHorizontal: 20}}>
        <View style={{flex: 1, width: '100%', maxWidth: contentW, alignSelf: 'center'}}>
          <View style={styles.top}>
            <AHMark />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              {__DEV__ && (preview || rehearsal) ? (
                <View accessibilityLabel="Preview mode"><AHChip label={preview ? 'Preview' : 'Rehearsal'} tone="rose" /></View>
              ) : <AHClock />}
              <AHChip label="By invitation" />
            </View>
          </View>

          <Animated.View style={[{marginTop: compact ? 4 : 10}, doorStyle]}>
            <Door width={doorW} progress={progress} open={open} />
          </Animated.View>

          <Animated.View style={[{marginTop: compact ? 10 : 16}, headStyle]}>
            <AHEyebrow color={phase === 'open' ? ah.rose : phase === 'closed' ? ah.danger : ah.mute}>{msg}</AHEyebrow>
            <TwoTone lead="Say the" rose="word." size={compact ? 44 : 52} style={{marginTop: 4}} />
          </Animated.View>

          <Animated.View style={[{marginTop: compact ? 8 : 12}, shakeStyle]}>
            <GuestList digits={typed} active={phase === 'ready'} tone={tone} line={line} lineTone={lineTone} compact={compact}
              onPress={() => input.current?.focus()} />
          </Animated.View>

          <View style={{marginTop: 10}}>
            {phase === 'closed' ? (
              <View style={{gap: 10, paddingVertical: 8}}>
                <AHPill label="Call the doorman" block onPress={() => void callDoorman()} accessibilityLabel="Call the doorman to try the door again" />
              </View>
            ) : (
              <KeyPad keyH={keyH} onDigit={(d) => onDigits(typed + d)} onDelete={onDelete} onOpen={pull}
                canOpen={typed.length === 6} disabled={phase !== 'ready'} />
            )}
          </View>

          <View style={styles.foot}>
            <Text style={styles.invite}>Not on the list?{' '}
              <Text style={styles.link} accessibilityRole="link" onPress={() => void Linking.openURL('https://finesselife.vip/signup')}>Request an invitation</Text>
            </Text>
            <Pressable onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="Type the house code instead" hitSlop={8} style={styles.typeIt}>
              <Text style={styles.typeItText}>Type the code instead</Text>
            </Pressable>
          </View>
          <LegalLinks align="flex-start" color={ah.mute} />
        </View>
      </ScrollView>
      <Flood open={open} reduced={reduced} />
      <TextInput ref={input} value={typed} onChangeText={onTyped} keyboardType="number-pad" maxLength={6}
        textContentType="oneTimeCode" autoComplete="one-time-code" secureTextEntry={false}
        caretHidden contextMenuHidden={false} style={styles.hidden} accessibilityLabel="House code, six digits" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: ah.ink, overflow: 'hidden'},
  top: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44},
  foot: {marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12},
  invite: {fontFamily: ahFonts.sans, fontSize: 13, color: ah.faint, paddingVertical: 12},
  link: {color: ah.text, textDecorationLine: 'underline', textDecorationColor: 'rgba(232,180,160,0.6)'},
  typeIt: {minHeight: 44, justifyContent: 'center'},
  typeItText: {fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.rose},
  hidden: {position: 'absolute', opacity: 0, width: 1, height: 1, left: -10, top: -10},
});
