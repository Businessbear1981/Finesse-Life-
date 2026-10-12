import { useState } from 'react';
import { ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CTA } from '../../src/components/ui';
import { redeemVip } from '../../src/lib/api';
import { setSession, useSession } from '../../src/lib/session';
import { C, F } from '../../src/theme';

const PERKS = ['Private lift to the Penthouse', 'A human concierge, around the clock', 'First access to Scale campaigns', 'Backstage: control what others see'];

/** 11 VIP — the inner room. Redeems via POST /api/vip/redeem (server validates). */
export default function Vip() {
  const { isVip } = useSession();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const redeem = async () => {
    setBusy(true);
    try {
      const r = await redeemVip(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSession({ isVip: true });
      setMsg({ ok: true, text: r.message });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMsg({ ok: false, text: e.message });
    } finally { setBusy(false); }
  };

  return (
    <LinearGradient colors={['#5A0E1E', '#2A0610', '#12030A']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 14, gap: 14 }}>
        <Text style={s.kicker}>ROOM 23 · BY INVITATION</Text>
        <Text style={s.title}>The Inner Room</Text>
        <View style={{ borderTopWidth: 2, borderTopColor: C.brass }}>
          {PERKS.map((p, i) => (
            <View key={p} style={s.perk}><Text style={s.roman}>{['I', 'II', 'III', 'IV'][i]}</Text><Text style={s.perkText}>{p}</Text></View>
          ))}
        </View>
        {isVip ? <Text style={s.ok}>You hold the key. Welcome to the inner room.</Text> : (
          <>
            <Text style={s.label}>INVITATION CODE</Text>
            <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase().slice(0, 16))} autoCapitalize="characters" autoCorrect={false}
              placeholder="ENTER CODE" placeholderTextColor="rgba(244,232,208,0.35)" style={s.input} accessibilityLabel="Invitation code" />
            {msg && <Text accessibilityLiveRegion="polite" style={msg.ok ? s.ok : s.err}>{msg.text}</Text>}
            <CTA label={busy ? 'CHECKING…' : 'REDEEM'} gold onPress={redeem} disabled={busy || code.trim().length < 4} />
            <Text style={s.ask}>No code? <Text style={{ color: C.gold, textDecorationLine: 'underline' }}>Ask the desk for an invitation</Text></Text>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  kicker: { marginTop: 8, fontFamily: F.caps, fontSize: 10, letterSpacing: 3.6, color: C.goldHi },
  title: { fontFamily: F.display, fontSize: 46, lineHeight: 48, color: C.gold },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: C.rule },
  roman: { width: 26, fontFamily: F.caps, fontSize: 13, color: C.gold },
  perkText: { flex: 1, fontFamily: F.sans, fontSize: 14, color: C.cream },
  label: { fontFamily: F.caps, fontSize: 10, letterSpacing: 2.4, color: C.gold },
  input: { minHeight: 54, borderWidth: 2, borderColor: C.brass, backgroundColor: 'rgba(10,4,6,0.6)', paddingHorizontal: 14, fontFamily: F.caps, fontSize: 20, letterSpacing: 4, color: C.goldHot },
  ok: { fontFamily: F.serif, fontSize: 18, color: C.goldHi },
  err: { fontFamily: F.sansMed, fontSize: 13, color: '#F09AAE' },
  ask: { fontFamily: F.sans, fontSize: 13, color: C.creamMuted },
});
