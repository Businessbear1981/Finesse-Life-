import { useRef, useState } from 'react';
import { Text, View, StyleSheet, useWindowDimensions, AccessibilityInfo } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Medallion } from '../src/components/Medallion';
import { Tumbler } from '../src/components/Tumbler';
import { CTA } from '../src/components/ui';
import { Pedestal } from '../src/components/Pedestal';
import { orchid, lion } from '../src/data/pedestals';
import { verifyHouseCode } from '../src/lib/api';
import { C, F } from '../src/theme';

const START = [4, 9, 0, 7, 2, 6];
const mod = (n: number) => ((n % 10) + 10) % 10;
type Status = 'idle' | 'verifying' | 'denied' | 'open';
const COPY: Record<Status, string> = {
  idle: 'Roll the six tumblers to your house code, then pull.',
  verifying: 'Checking with the front desk…',
  denied: 'Access denied.',
  open: 'Welcome to Finesse.',
};

/** 01 Entrance — the Art Deco KeyLock. Unchanged from the web prototype; the lock never hints at correctness. */
export default function Entrance() {
  const { width } = useWindowDimensions();
  const size = Math.min(260, width - 110);
  const [nums, setNums] = useState(START);
  const [rolls, setRolls] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const roll = (i: number, d: number) => {
    if (status !== 'idle') return;
    setNums((n) => n.map((v, k) => (k === i ? v + d : v)));
    setRolls((r) => r + d);
    setFlash(i);
    clearTimeout(t.current);
    t.current = setTimeout(() => setFlash(null), 450);
  };

  const pull = async () => {
    setStatus('verifying');
    const ok = await verifyHouseCode(nums.map(mod).join(''));
    if (!ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatus('denied');
      setTimeout(() => setStatus('idle'), 1400);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus('open');
    const reduce = await AccessibilityInfo.isReduceMotionEnabled();
    setTimeout(() => router.replace('/side'), reduce ? 200 : 2400);
  };

  return (
    <LinearGradient colors={['#14070B', C.ground, '#0E0608']} style={{ flex: 1 }}>
      <SafeAreaView style={s.page}>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.word}>FINESSE</Text>
          <View style={s.rule}><View style={s.line} /><View style={s.diamond} /><Text style={s.est}>EST. MMXXVI</Text><View style={s.diamond} /><View style={s.line} /></View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Medallion size={size} rolls={rolls} flash={flash} set={nums.map((v, i) => v !== START[i])} status={status} />
          <View style={s.flank}>
            <Pedestal source={orchid} label="WHITE ORCHID" tint={C.herTint} width={72} />
            <Text style={s.members}>MEMBERS ONLY</Text>
            <Pedestal source={lion} label="LION" tint={C.himTint} width={72} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={s.tumblers}>
            {nums.map((v, i) => <Tumbler key={i} index={i} value={v} onRoll={(d) => roll(i, d)} disabled={status !== 'idle'} />)}
          </View>
          <Text accessibilityLiveRegion="polite" style={[s.status, status === 'denied' && { color: '#F09AAE' }]}>{COPY[status]}</Text>
          <CTA label="PULL TO OPEN" gold onPress={pull} disabled={status !== 'idle'} />
          <Text style={s.invite}>Not a member? <Text style={{ color: C.gold, textDecorationLine: 'underline' }}>Request an invitation</Text></Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, paddingBottom: 12, justifyContent: 'space-between' },
  word: { fontFamily: F.displayReg, fontSize: 46, letterSpacing: 7, color: C.gold, marginTop: 8 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  line: { width: 36, height: 1, backgroundColor: C.brass },
  diamond: { width: 6, height: 6, backgroundColor: C.brass, transform: [{ rotate: '45deg' }] },
  est: { fontFamily: F.deco, fontSize: 10, letterSpacing: 5, color: 'rgba(201,169,97,0.75)' },
  flank: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 10 },
  members: { marginBottom: 8, fontFamily: F.deco, fontSize: 10, letterSpacing: 5, color: 'rgba(201,169,97,0.75)' },
  tumblers: { flexDirection: 'row', gap: 6 },
  status: { fontFamily: F.serif, fontSize: 19, color: 'rgba(244,232,208,0.88)' },
  invite: { fontFamily: F.sans, fontSize: 14, color: C.creamMuted },
});
