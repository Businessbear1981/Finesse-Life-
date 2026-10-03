import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'expo-router';
import {AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import {colors, touchTarget} from '@/lib/tokens';
import {deco, easeCine, fonts} from '@/lib/deco';
import {LiftScene} from '@/components/lift/LiftScene';
import {supabase} from '@/lib/supabase';
import {api, liftToken} from '@/lib/api';

type Phase = 'dormant' | 'calling' | 'ready' | 'confirm' | 'verifying' | 'unlocked' | 'closed';

export default function PenthouseElevator() {
  const input = useRef<TextInput>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('dormant');
  const [mode, setMode] = useState<'verify' | 'enroll'>('verify');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [first, setFirst] = useState('');
  const [msg, setMsg] = useState('A room above the room.');
  const [closedCta, setClosedCta] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  // Development builds only: rehearse the lift when the house line is unreachable.
  const [rehearsal, setRehearsal] = useState(false);
  const floor = useSharedValue(0);
  const doors = useSharedValue(0);
  const {width} = useWindowDimensions();
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {}); }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setSignedIn(Boolean(data.session)));
    const {data: sub} = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const call = useCallback(async () => {
    setPhase('calling'); setCode(''); setFirst(''); setClosedCta(null);
    const r = await api<{state: string; challengeId?: string; mode?: 'verify' | 'enroll'}>('/api/vip-keylock/challenge', {method: 'POST', json: {}});
    if (__DEV__ && r.status === 0) {
      setRehearsal(true); setChallengeId(null); setMode('verify');
      setMsg('Rehearsal — the house line is offline.'); setPhase('ready');
      setTimeout(() => input.current?.focus(), 80);
      return;
    }
    if (r.body.state === 'ready' && r.body.challengeId) {
      setChallengeId(r.body.challengeId);
      setMode(r.body.mode ?? 'verify');
      setMsg(r.body.mode === 'enroll' ? 'First ride. Choose six brass numbers.' : 'Align the six brass numbers on the doors.');
      setPhase('ready');
      setTimeout(() => input.current?.focus(), 80);
    } else {
      setMsg(r.body.message ?? 'The private lift is being serviced.');
      setClosedCta(r.body.state === 'not_entitled' || r.body.state === 'expired' ? 'VIP access lives in your web profile.' : null);
      setPhase('closed');
    }
  }, []);

  const verify = useCallback(async (digits: string) => {
    setPhase('verifying');
    const r = rehearsal && __DEV__
      ? {body: {state: 'unlocked'} as {state: string; liftToken?: string; attemptsRemaining?: number; message?: string}}
      : await api<{state: string; liftToken?: string; expiresAt?: string; attemptsRemaining?: number}>('/api/vip-keylock/verify', {
        method: 'POST', json: {challengeId, code: digits, destination: 'penthouse'},
      });
    if (r.body.state === 'unlocked') {
      if (r.body.liftToken) await liftToken.save(r.body.liftToken);
      setMsg('The lift remembers you. Penthouse — floor 17.');
      floor.value = withTiming(1, {duration: reduced ? 0 : 1300, easing: easeCine});
      doors.value = withDelay(reduced ? 0 : 1300, withTiming(1, {duration: reduced ? 0 : 1250, easing: easeCine}));
      setTimeout(() => setPhase('unlocked'), reduced ? 0 : 2700);
      AccessibilityInfo.announceForAccessibility?.('Doors open. Penthouse, floor seventeen.');
      return;
    }
    setMsg(r.body.message ?? 'The mechanism holds.');
    setCode(''); setFirst('');
    setPhase(r.body.state === 'invalid' && (r.body.attemptsRemaining ?? 1) > 0 ? 'ready' : 'closed');
  }, [challengeId, doors, floor, reduced, rehearsal]);

  const onDigits = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 6);
    setCode(clean);
    if (clean.length < 6) return;
    if (mode === 'enroll' && phase === 'ready') { setFirst(clean); setCode(''); setMsg('Once more, to set the tumblers.'); setPhase('confirm'); return; }
    if (mode === 'enroll' && phase === 'confirm' && clean !== first) { setMsg('The two settings differ. Begin again.'); setCode(''); setFirst(''); setPhase('ready'); return; }
    void verify(clean);
  };

  const close = async () => {
    await api('/api/vip-keylock/lock', {method: 'POST', lift: true});
    await liftToken.clear();
    doors.value = withTiming(0, {duration: reduced ? 0 : 900, easing: easeCine});
    floor.value = withDelay(reduced ? 0 : 900, withTiming(0, {duration: reduced ? 0 : 1000, easing: easeCine}));
    setPhase('dormant'); setMsg('A room above the room.');
  };

  const digits = code.padEnd(6, ' ').split('');
  const showCipher = phase === 'ready' || phase === 'confirm' || phase === 'verifying';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.label}>THE PRIVATE LIFT</Text>
      <Text style={styles.title}>Penthouse</Text>
      <Text style={styles.subtitle} accessibilityLiveRegion="polite">{phase === 'verifying' ? 'The motor engages…' : msg}</Text>
      <Pressable onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="The lift doors. Double tap to enter the cipher." disabled={!showCipher}>
        <LiftScene width={Math.min(width - 32, 420)} digits={code} masked={mode === 'enroll'} active={showCipher}
          floor={floor} doors={doors} reduced={reduced} />
      </Pressable>
      {phase === 'unlocked' && (
        <View style={styles.arrived}>
          <Text style={styles.body}>The inner room, Nova after hours and Backstage are open to you. Arriving here is access, not a purchase.</Text>
          <Pressable onPress={close} accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>CLOSE THE LIFT</Text></Pressable>
        </View>
      )}

      {signedIn === false && !rehearsal && (
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>SIGN IN TO CALL THE LIFT</Text></Pressable>
        </Link>
      )}
      {(signedIn || __DEV__) && (phase === 'dormant' || phase === 'closed') && (
        <Pressable onPress={call} accessibilityRole="button" accessibilityLabel="Call the Penthouse elevator" style={styles.button}>
          <Text style={styles.buttonText}>{phase === 'closed' ? 'CALL AGAIN' : 'CALL PENTHOUSE'}</Text>
        </Pressable>
      )}
      {closedCta && <Text style={styles.notice}>{closedCta}</Text>}
      {(phase === 'ready' || phase === 'confirm') && (
        <TextInput ref={input} value={code} onChangeText={onDigits} keyboardType="number-pad" maxLength={6} secureTextEntry
          style={styles.hidden} accessibilityLabel={`VIP cipher, ${code.length} of 6 digits`} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {backgroundColor: deco.ink, padding: 16, paddingTop: 28, paddingBottom: 90, flexGrow: 1},
  label: {color: colors.brass, fontSize: 10, letterSpacing: 5, textAlign: 'center', fontFamily: fonts.label},
  title: {color: deco.brassLight, fontFamily: fonts.display, fontSize: 44, textAlign: 'center', marginTop: 8},
  subtitle: {color: colors.brassHighlight, fontSize: 15, textAlign: 'center', marginTop: 4, marginBottom: 18, fontFamily: fonts.display},
  hidden: {position: 'absolute', opacity: 0, width: 1, height: 1, left: -10, top: -10},
  canopy: {borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.brass, paddingVertical: 10, marginBottom: 16},
  canopyText: {color: colors.brassHighlight, textAlign: 'center', letterSpacing: 4, fontSize: 11},
  doors: {flexDirection: 'row', minHeight: 360, borderWidth: 1, borderColor: colors.brass, backgroundColor: colors.oxblood},
  door: {flex: 1, borderWidth: 1, borderColor: colors.brassShadow, alignItems: 'center', justifyContent: 'center', gap: 18},
  ornament: {color: colors.brass, fontSize: 22},
  digits: {flexDirection: 'row', gap: 6},
  well: {width: 34, height: 52, borderWidth: 1, borderColor: colors.brassShadow, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink},
  wellFilled: {borderColor: colors.brassHighlight},
  digit: {color: colors.brassHighlight, fontSize: 22, fontFamily: 'serif'},
  arrived: {marginTop: 18, gap: 4},
  arrivedTitle: {color: colors.cream, fontFamily: 'serif', fontSize: 30},
  body: {color: colors.cream, fontSize: 14, lineHeight: 21},
  button: {minHeight: touchTarget + 10, borderWidth: 1, borderColor: colors.brass, justifyContent: 'center', alignItems: 'center', marginTop: 22},
  buttonText: {color: colors.brassHighlight, letterSpacing: 4, fontSize: 12, fontFamily: fonts.label},
  input: {minHeight: touchTarget + 8, borderWidth: 1, borderColor: colors.brassShadow, color: colors.cream, paddingHorizontal: 14, marginTop: 18, fontSize: 18, letterSpacing: 8, textAlign: 'center'},
  notice: {color: colors.cream, opacity: 0.75, fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center'},
});
