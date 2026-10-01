import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'expo-router';
import {AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, touchTarget} from '@/lib/tokens';
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

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setSignedIn(Boolean(data.session)));
    const {data: sub} = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const call = useCallback(async () => {
    setPhase('calling'); setCode(''); setFirst(''); setClosedCta(null);
    const r = await api<{state: string; challengeId?: string; mode?: 'verify' | 'enroll'}>('/api/vip-keylock/challenge', {method: 'POST', json: {}});
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
    const r = await api<{state: string; liftToken?: string; expiresAt?: string; attemptsRemaining?: number}>('/api/vip-keylock/verify', {
      method: 'POST', json: {challengeId, code: digits, destination: 'penthouse'},
    });
    if (r.body.state === 'unlocked') {
      if (r.body.liftToken) await liftToken.save(r.body.liftToken);
      setMsg('The lift remembers you. Penthouse — floor 17.');
      setPhase('unlocked');
      AccessibilityInfo.announceForAccessibility?.('Doors open. Penthouse, floor seventeen.');
      return;
    }
    setMsg(r.body.message ?? 'The mechanism holds.');
    setCode(''); setFirst('');
    setPhase(r.body.state === 'invalid' && (r.body.attemptsRemaining ?? 1) > 0 ? 'ready' : 'closed');
  }, [challengeId]);

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
    setPhase('dormant'); setMsg('A room above the room.');
  };

  const digits = code.padEnd(6, ' ').split('');
  const showCipher = phase === 'ready' || phase === 'confirm' || phase === 'verifying';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.label}>THE PRIVATE LIFT</Text>
      <Text style={styles.title}>Penthouse</Text>
      <Text style={styles.subtitle} accessibilityLiveRegion="polite">{phase === 'verifying' ? 'The motor engages…' : msg}</Text>
      <View style={styles.canopy}><Text style={styles.canopyText}>◈  {phase === 'unlocked' ? 'FLOOR P' : 'PRIVATE FLOOR'}  ◈</Text></View>

      {phase === 'unlocked' ? (
        <View style={styles.arrived}>
          <Text style={styles.arrivedTitle}>The Penthouse</Text>
          <Text style={styles.body}>The inner room, Nova after hours and Backstage are open to you. Arriving here is access, not a purchase.</Text>
          <Pressable onPress={close} accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>CLOSE THE LIFT</Text></Pressable>
        </View>
      ) : (
        <View style={styles.doors} accessibilityElementsHidden={!showCipher}>
          {[0, 1].map((side) => (
            <View key={side} style={styles.door}>
              <Text style={styles.ornament}>◆</Text>
              <View style={styles.digits}>
                {digits.slice(side * 3, side * 3 + 3).map((d, i) => (
                  <View key={i} style={[styles.well, d.trim() && styles.wellFilled]}>
                    <Text style={styles.digit}>{showCipher ? (d.trim() ? (mode === 'enroll' ? '◆' : d) : '·') : '·'}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {signedIn === false && (
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>SIGN IN TO CALL THE LIFT</Text></Pressable>
        </Link>
      )}
      {signedIn && (phase === 'dormant' || phase === 'closed') && (
        <Pressable onPress={call} accessibilityRole="button" accessibilityLabel="Call the Penthouse elevator" style={styles.button}>
          <Text style={styles.buttonText}>{phase === 'closed' ? 'CALL AGAIN' : 'CALL PENTHOUSE'}</Text>
        </Pressable>
      )}
      {closedCta && <Text style={styles.notice}>{closedCta}</Text>}
      {(phase === 'ready' || phase === 'confirm') && (
        <TextInput ref={input} value={code} onChangeText={onDigits} keyboardType="number-pad" maxLength={6} secureTextEntry
          style={styles.input} accessibilityLabel={`VIP cipher, ${code.length} of 6 digits`} placeholder="Six digits" placeholderTextColor={colors.brassShadow} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {backgroundColor: colors.ink, padding: 28, paddingTop: 44, paddingBottom: 90, flexGrow: 1},
  label: {color: colors.brass, fontSize: 10, letterSpacing: 4, textAlign: 'center'},
  title: {color: colors.cream, fontFamily: 'serif', fontSize: 46, textAlign: 'center', marginTop: 10},
  subtitle: {color: colors.brassHighlight, fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 22, fontStyle: 'italic'},
  canopy: {borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.brass, paddingVertical: 10, marginBottom: 16},
  canopyText: {color: colors.brassHighlight, textAlign: 'center', letterSpacing: 4, fontSize: 11},
  doors: {flexDirection: 'row', minHeight: 360, borderWidth: 1, borderColor: colors.brass, backgroundColor: colors.oxblood},
  door: {flex: 1, borderWidth: 1, borderColor: colors.brassShadow, alignItems: 'center', justifyContent: 'center', gap: 18},
  ornament: {color: colors.brass, fontSize: 22},
  digits: {flexDirection: 'row', gap: 6},
  well: {width: 34, height: 52, borderWidth: 1, borderColor: colors.brassShadow, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink},
  wellFilled: {borderColor: colors.brassHighlight},
  digit: {color: colors.brassHighlight, fontSize: 22, fontFamily: 'serif'},
  arrived: {borderWidth: 1, borderColor: colors.brass, padding: 22, gap: 14, backgroundColor: colors.burgundy},
  arrivedTitle: {color: colors.cream, fontFamily: 'serif', fontSize: 30},
  body: {color: colors.cream, fontSize: 14, lineHeight: 21},
  button: {minHeight: touchTarget + 10, borderWidth: 1, borderColor: colors.brass, justifyContent: 'center', alignItems: 'center', marginTop: 22},
  buttonText: {color: colors.brassHighlight, letterSpacing: 3, fontSize: 12},
  input: {minHeight: touchTarget + 8, borderWidth: 1, borderColor: colors.brassShadow, color: colors.cream, paddingHorizontal: 14, marginTop: 18, fontSize: 18, letterSpacing: 8, textAlign: 'center'},
  notice: {color: colors.cream, opacity: 0.75, fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center'},
});
