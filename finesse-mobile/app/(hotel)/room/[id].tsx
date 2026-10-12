import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CTA } from '../../../src/components/ui';
import { findRoom } from '../../../src/data/rooms';
import { useSession } from '../../../src/lib/session';
import { C, F, accent } from '../../../src/theme';

/** Any rail/dock room in the centre: gilt-framed scene, lamp-on label, name, purpose, one action. */
export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { side } = useSession();
  const room = findRoom(String(id));
  if (!room) return <Text style={s.missing}>This room isn’t open yet.</Text>;
  return (
    <ScrollView>
      <LinearGradient colors={[C.goldHi, C.brassDeep, '#F6E2A0', '#6B5028']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.frame}>
        <View style={s.scene}><room.Icon size={48} color="rgba(232,200,122,0.35)" /></View>
      </LinearGradient>
      <View style={s.body}>
        <View style={s.on}><View style={s.lamp} /><Text style={s.onText}>ROOM ON · {room.wing}</Text></View>
        <Text style={s.title}>{room.label}</Text>
        <Text style={s.line}>{room.line}</Text>
        <CTA label={room.cta} color={accent(side)} />
        <Text onPress={() => router.replace('/lobby')} style={s.back}>← Back to the Lobby</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  missing: { padding: 20, fontFamily: F.serif, fontSize: 18, color: C.creamMuted },
  frame: { padding: 10 },
  scene: { height: 200, backgroundColor: '#17110E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.brassShadow },
  body: { padding: 12, gap: 10 },
  on: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lamp: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.lampOn, shadowColor: C.lampOn, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  onText: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, color: '#7AF5B8' },
  title: { fontFamily: F.display, fontSize: 32, color: C.cream },
  line: { fontFamily: F.sans, fontSize: 13, lineHeight: 20, color: 'rgba(244,232,208,0.82)' },
  back: { marginTop: 4, fontFamily: F.sans, fontSize: 13, color: C.creamMuted, paddingVertical: 10 },
});
