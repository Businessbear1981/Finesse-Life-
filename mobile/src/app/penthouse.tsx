// The Private Lift → the Penthouse — After Hours (mirrors web src/components/hotel/private-lift.tsx).
// The doors open ONLY when POST /api/vip-keylock/verify answers "unlocked"; nothing on this screen can open them.
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'expo-router';
import {AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import {easeCine} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {AHCard, AHChip, AHDisplay, AHEyebrow, AHGlow, AHLiveDot, AHPill} from '@/components/ah';
import {FloorReadout, LiftScene} from '@/components/lift/LiftScene';
import {PenthouseFloor} from '@/components/rooms/Penthouse';
import {supabase} from '@/lib/supabase';
import {api, liftToken} from '@/lib/api';

type Phase = 'dormant' | 'calling' | 'ready' | 'confirm' | 'verifying' | 'unlocked' | 'closed';
const IDLE = 'A room above the room.';

export default function PenthouseElevator() {
  const input = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('dormant');
  const [mode, setMode] = useState<'verify' | 'enroll'>('verify');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [first, setFirst] = useState('');
  const [msg, setMsg] = useState(IDLE);
  const [closedCta, setClosedCta] = useState<string | null>(null);
  // The server said 401 (signed out / session expired): offer sign-in rather than 'being serviced'.
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Development builds only: rehearse the lift when the house line is unreachable.
  const [rehearsal, setRehearsal] = useState(false);
  const floor = useSharedValue(0);
  const doors = useSharedValue(0);
  const {width} = useWindowDimensions();
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {}); }, []);
  // The round keypad on screen replaces the system keyboard; on the web a hardware keyboard still types.
  const focusInput = () => { if (Platform.OS === 'web') setTimeout(() => input.current?.focus(), 80); };

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setSignedIn(Boolean(data.session)));
    const {data: sub} = supabase.auth.onAuthStateChange((_e, s) => { setSignedIn(Boolean(s)); if (s) setNeedsSignIn(false); });
    return () => sub.subscription.unsubscribe();
  }, []);

  // A lift token left from an earlier ride: ask the server if it is still good; forget it if not.
  useEffect(() => {
    let live = true;
    void (async () => {
      const t = await liftToken.get().catch(() => null);
      if (!t) return;
      const r = await api<{active?: boolean; destination?: string}>('/api/vip-keylock/session', {lift: true});
      if (!live) return;
      if (r.ok && r.body.active === true && r.body.destination === 'penthouse') {
        floor.value = 1; doors.value = 1;
        setMsg('The lift remembers you. Penthouse — floor 17.');
        setPhase('unlocked');
      } else if (r.status !== 0) {
        await liftToken.clear(); // inactive, expired or refused — an offline check keeps it for later
      }
    })();
    return () => { live = false; };
  }, [doors, floor]);

  const call = useCallback(async () => {
    setPhase('calling'); setCode(''); setFirst(''); setClosedCta(null); setNeedsSignIn(false);
    const r = await api<{state: string; challengeId?: string; mode?: 'verify' | 'enroll'}>('/api/vip-keylock/challenge', {method: 'POST', json: {}});
    if (__DEV__ && r.status === 0) {
      setRehearsal(true); setChallengeId(null); setMode('verify');
      setMsg('Rehearsal — the house line is offline.'); setPhase('ready');
      focusInput();
      return;
    }
    if (r.body.state === 'ready' && r.body.challengeId) {
      setChallengeId(r.body.challengeId);
      setMode(r.body.mode ?? 'verify');
      setMsg(r.body.mode === 'enroll' ? 'First ride. Choose six numbers. The lift will remember them.' : 'Your six numbers, please.');
      setPhase('ready');
      focusInput();
    } else if (r.status === 401) {
      // Middleware answers {error:'signed_out'} with no `state` — that is a sign-in problem, not a fault.
      setMsg('Sign in to call the lift.');
      setNeedsSignIn(true);
      setPhase('closed');
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
    if ('status' in r && r.status === 401) {
      setMsg('Sign in to call the lift.'); setNeedsSignIn(true);
      setCode(''); setFirst(''); setPhase('closed');
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
    if (mode === 'enroll' && phase === 'ready') { setFirst(clean); setCode(''); setMsg('Once more, to confirm.'); setPhase('confirm'); return; }
    if (mode === 'enroll' && phase === 'confirm' && clean !== first) { setMsg('The two settings differ. Choose your six numbers again.'); setCode(''); setFirst(''); setPhase('ready'); return; }
    void verify(clean);
  };

  const close = async () => {
    await api('/api/vip-keylock/lock', {method: 'POST', lift: true});
    await liftToken.clear();
    doors.value = withTiming(0, {duration: reduced ? 0 : 900, easing: easeCine});
    floor.value = withDelay(reduced ? 0 : 900, withTiming(0, {duration: reduced ? 0 : 1000, easing: easeCine}));
    setPhase('dormant'); setMsg(IDLE);
  };
  const leave = () => { setCode(''); setFirst(''); setPhase('dormant'); setMsg(IDLE); };

  const showCipher = phase === 'ready' || phase === 'confirm' || phase === 'verifying';
  const typing = phase === 'ready' || phase === 'confirm';
  const lit = phase !== 'dormant' && phase !== 'closed';
  const sceneW = Math.min(width - 40, 420);

  if (phase === 'unlocked') {
    return (
      <View style={{flex: 1, backgroundColor: ah.ink}}>
        <ScrollView contentContainerStyle={{paddingBottom: insets.bottom + 60}}>
          <PenthouseFloor />
          <View style={{paddingHorizontal: 20, width: '100%', maxWidth: 560, alignSelf: 'center'}}>
            <AHCard glass style={{marginTop: 30, gap: 14}}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <AHChip label="Lift held" live />
                <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.mute}}>Floor 17</Text>
              </View>
              <Text style={{fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: ah.mute}}>{msg} Your lift session is held for a while. Arriving here is access, not a purchase.</Text>
              <AHPill variant="ghost" block label="Close the lift" onPress={close} />
            </AHCard>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: ah.ink}}>
      <AHGlow height={520} />
      <ScrollView contentContainerStyle={[styles.page, {paddingBottom: insets.bottom + 90}]} keyboardShouldPersistTaps="handled">
        {/* head: title + floor readout */}
        <View style={{flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18}}>
          <View style={{flex: 1}}>
            <AHEyebrow>The private lift · Key holders</AHEyebrow>
            <AHDisplay size={44} style={{marginTop: 6}}>Penthouse.</AHDisplay>
            <Text style={{marginTop: 2, fontFamily: ahFonts.sans, fontSize: 13, color: ah.mute}}>{IDLE}</Text>
          </View>
          <FloorReadout floor={floor} lit={lit} />
        </View>

        <View>
          <Pressable onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="The lift doors. Double tap to type the cipher with the keyboard." disabled={!typing}>
            <LiftScene width={sceneW} digits={code} masked={mode === 'enroll'} active={showCipher}
              floor={floor} doors={doors} reduced={reduced} />
          </Pressable>
          {phase === 'closed' ? (
            <View style={{position: 'absolute', left: 22, right: 22, top: '30%'}} accessibilityRole="alert">
              <AHCard glass pad={22} style={{alignItems: 'center', gap: 8, borderColor: ah.line2}}>
                <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 24, lineHeight: 28, color: ah.text, textAlign: 'center'}}>{needsSignIn ? 'The private lift answers to members.' : 'The private lift remains closed.'}</Text>
                <Text style={{fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: ah.mute, textAlign: 'center'}}>{msg}</Text>
                {closedCta ? <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.rose, textAlign: 'center'}}>{closedCta}</Text> : null}
              </AHCard>
            </View>
          ) : null}
        </View>

        {/* status line */}
        {phase !== 'closed' ? (
          <Text style={styles.status} accessibilityLiveRegion="polite">{phase === 'verifying' ? 'Going up…' : phase === 'calling' ? '' : msg === IDLE ? '' : msg}</Text>
        ) : <Text style={[styles.status, {height: 0, marginTop: 0}]} accessibilityLiveRegion="polite">{msg}</Text>}

        {phase === 'calling' ? (
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56}}>
            <AHLiveDot />
            <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 14, color: ah.mute}}>The lift is on its way</Text>
          </View>
        ) : null}

        {typing ? (
          <View accessibilityLabel="Lift keypad" style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Back', '0', 'Leave'].map((k) => {
              const word = k.length > 1;
              return (
                <Pressable key={k}
                  onPress={() => (k === 'Back' ? setCode((c) => c.slice(0, -1)) : k === 'Leave' ? leave() : onDigits(code + k))}
                  accessibilityRole="button" accessibilityLabel={k === 'Back' ? 'Remove last digit' : k === 'Leave' ? 'Leave the lift' : `Digit ${k}`}
                  style={({pressed}) => [styles.key, word && styles.keyWord, pressed && {backgroundColor: 'rgba(232,180,160,0.16)', borderColor: 'rgba(232,180,160,0.6)'}]}>
                  <Text style={word ? styles.keyWordText : styles.keyText}>{word ? k.toUpperCase() : k}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {typing && mode === 'enroll' ? (
          <Text style={styles.fine}>Your six numbers are stored only as a one-way hash. They open the lift; they never grant membership.</Text>
        ) : null}

        {(signedIn === false || needsSignIn) && !rehearsal && (
          <Link href="/sign-in" asChild>
            <Pressable accessibilityRole="button" style={styles.solid}><Text style={styles.solidText}>Sign in to call the lift</Text></Pressable>
          </Link>
        )}
        {(signedIn || __DEV__) && (phase === 'dormant' || phase === 'closed') && (
          <Pressable onPress={call} accessibilityRole="button" accessibilityLabel="Call the Penthouse elevator"
            style={({pressed}) => [styles.call, {opacity: pressed ? 0.88 : 1, transform: [{scale: pressed ? 0.99 : 1}]}]}>
            <Text style={styles.callText}>{phase === 'closed' ? 'Call again' : 'Call the lift'}</Text>
            <View style={styles.callBtn}><Text style={{fontSize: 13, color: '#2A1014', marginTop: -2}}>▲</Text></View>
          </Pressable>
        )}
        {typing && (
          <TextInput ref={input} value={code} onChangeText={onDigits} keyboardType="number-pad" maxLength={6} secureTextEntry
            style={styles.hidden} accessibilityLabel={`VIP cipher, ${code.length} of 6 digits`} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {padding: 20, paddingTop: 22, flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center'},
  status: {marginTop: 4, minHeight: 28, textAlign: 'center', fontFamily: ahFonts.serifItalic, fontSize: 21, lineHeight: 26, color: ah.text},
  hidden: {position: 'absolute', opacity: 0, width: 1, height: 1, left: -10, top: -10},
  keypad: {marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 22, rowGap: 14, maxWidth: 300, alignSelf: 'center'},
  key: {width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: {width: 0, height: 6}},
  keyWord: {backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.08)'},
  keyText: {fontFamily: ahFonts.serif, fontSize: 32, color: ah.text, marginTop: Platform.OS === 'web' ? 0 : 2},
  keyWordText: {fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.6, color: ah.mute},
  fine: {marginTop: 16, fontFamily: ahFonts.sans, fontSize: 12, lineHeight: 18, color: ah.faint, textAlign: 'center'},
  call: {marginTop: 26, minHeight: 60, paddingLeft: 24, paddingRight: 8, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(22,22,24,0.9)', borderWidth: 1, borderColor: ah.line2},
  callText: {fontFamily: ahFonts.sansSemi, fontSize: 16, color: ah.text},
  callBtn: {width: 46, height: 46, borderRadius: 23, backgroundColor: ah.rose, alignItems: 'center', justifyContent: 'center', shadowColor: ah.rose, shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: {width: 0, height: 0}},
  solid: {marginTop: 26, minHeight: 52, borderRadius: radius.pill, backgroundColor: ah.white, alignItems: 'center', justifyContent: 'center'},
  solidText: {fontFamily: ahFonts.sansSemi, fontSize: 15, color: '#000'},
});
