import { useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Seg } from '../../src/components/ui';
import { useSession } from '../../src/lib/session';
import { C, F } from '../../src/theme';

const STATS = [['12', 'Rooms visited'], ['48', 'Moments'], ['3', 'Circles']];
const CAMPAIGNS = ['Scale · cashmere wrap pledge', 'Scale · gold hoops pledge', 'Registry · birthday list', 'Exchange · listing: tote', 'Scale · silk scarf pledge'];

/** 10 This Is You — outward-facing profile. Campaigns stay tucked away (private drawer). */
export default function Profile() {
  const { name, city } = useSession();
  const [lens, setLens] = useState<'Your stats' | 'As others see you' | 'Traffic'>('Your stats');
  const [open, setOpen] = useState(false);
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 14, alignItems: 'stretch' }}>
      <LinearGradient colors={[C.goldHi, C.brassDeep, '#F6E2A0', '#6B5028']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.frame}>
        <View style={s.portrait} />
      </LinearGradient>
      <Text style={s.verified}>✓ VERIFIED MEMBER</Text>
      <View style={{ alignItems: 'center' }}>
        <Text style={s.name}>{name || 'Member'}</Text>
        <Text style={s.city}>{city || 'Your city'}</Text>
      </View>
      <View style={s.stats}>
        {STATS.map(([v, l], i) => (
          <View key={l} style={[s.stat, i > 0 && { borderLeftWidth: 2, borderLeftColor: C.rule }]}>
            <Text style={s.statV}>{v}</Text><Text style={s.statL}>{l}</Text>
          </View>
        ))}
      </View>
      <Seg options={['Your stats', 'As others see you', 'Traffic']} value={lens} onChange={setLens} />
      {lens === 'Your stats' && (
        <View>
          <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.drawer}>
            <View style={s.lock} />
            <View style={{ flex: 1 }}>
              <Text style={s.drawerTitle}>YOUR CAMPAIGNS · {CAMPAIGNS.length} OPEN</Text>
              <Text style={s.drawerSub}>Private. Never shown on your profile.</Text>
            </View>
            <Text style={{ color: C.gold, fontSize: 16 }}>{open ? '−' : '+'}</Text>
          </Pressable>
          {open && CAMPAIGNS.map((c) => <Text key={c} style={s.campaign}>{c}</Text>)}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  frame: { alignSelf: 'center', width: 180, height: 230, padding: 9 },
  portrait: { flex: 1, backgroundColor: '#17110E', borderWidth: 2, borderColor: C.brassShadow },
  verified: { alignSelf: 'center', marginTop: -24, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.ink, borderWidth: 1, borderColor: C.brass, fontFamily: F.caps, fontSize: 9, letterSpacing: 2, color: C.gold },
  name: { fontFamily: F.display, fontSize: 36, color: C.cream },
  city: { fontFamily: F.sans, fontSize: 13, color: C.creamMuted },
  stats: { flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.brass },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statV: { fontFamily: F.caps, fontSize: 24, color: C.gold },
  statL: { fontFamily: F.sans, fontSize: 11, color: C.creamMuted },
  drawer: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(201,169,97,0.55)' },
  lock: { width: 10, height: 12, borderWidth: 1, borderTopWidth: 4, borderColor: C.brass },
  drawerTitle: { fontFamily: F.caps, fontSize: 10, letterSpacing: 2, color: C.brass },
  drawerSub: { fontFamily: F.sans, fontSize: 11, color: 'rgba(244,232,208,0.6)' },
  campaign: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(201,169,97,0.25)', fontFamily: F.sans, fontSize: 13, color: C.cream },
});
