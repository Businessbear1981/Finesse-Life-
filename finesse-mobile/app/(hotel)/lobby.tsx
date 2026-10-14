import { Pressable, ScrollView, Text, View, StyleSheet, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { findRoom } from '../../src/data/rooms';
import { useSession } from '../../src/lib/session';
import { C, F, accent } from '../../src/theme';

const RECENT = [['closet', 'Tonight’s look is ready'], ['registry', '2 wishes routed'], ['vault', 'Rebate balance updated']] as const;

/** 08 Lobby — the centre of the shell when Lobby's lamp is on. */
export default function Lobby() {
  const { side, name } = useSession();
  const her = side !== 'him';
  const img = her ? require('../../assets/scenes/lobby-finesse.jpg') : require('../../assets/scenes/lobby-carpe.jpg');
  return (
    <ScrollView>
      <ImageBackground source={img} style={{ height: 220 }} resizeMode="cover">
        <LinearGradient colors={['rgba(10,4,6,0.2)', 'rgba(10,4,6,0.6)', C.ground]} locations={[0, 0.65, 1]} style={s.hero}>
          <Text style={s.kicker}>THE LOBBY</Text>
          <Text style={s.hello}>{her ? 'Good evening,' : (name || 'You’re back.')}</Text>
          <Text style={[s.name, { color: accent(side) }]}>{her ? `${name || 'beautiful'}.` : 'The floor knows your name.'}</Text>
        </LinearGradient>
      </ImageBackground>
      <LinearGradient colors={[C.parchment, C.parchmentLo]} style={s.note}>
        <Text style={s.noteKicker}>NOVA · TONIGHT</Text>
        <Text style={s.noteText}>Your table for two at 8:30 is held. Your shopper’s Friday box is ready.</Text>
      </LinearGradient>
      <Text style={s.section}>PICK UP WHERE YOU LEFT</Text>
      <View style={{ marginHorizontal: 12, marginBottom: 24 }}>
        {RECENT.map(([id, note]) => {
          const r = findRoom(id)!;
          return (
            <Pressable key={id} onPress={() => router.replace((id === 'closet' ? '/closet' : `/room/${id}`) as any)} style={s.row} accessibilityRole="button">
              <r.Icon size={18} color={C.gold} />
              <View style={{ flex: 1 }}><Text style={s.rowTitle}>{r.label}</Text><Text style={s.rowNote}>{note}</Text></View>
              <Text style={{ color: C.brass }}>→</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  kicker: { fontFamily: F.capsSemi, fontSize: 9, letterSpacing: 2.8, color: C.goldHi },
  hello: { fontFamily: F.displayReg, fontSize: 20, color: C.cream },
  name: { fontFamily: F.display, fontSize: 40, lineHeight: 42 },
  note: { margin: 12, marginBottom: 0, padding: 12, gap: 4 },
  noteKicker: { fontFamily: F.caps, fontSize: 9, letterSpacing: 1.8, color: C.oxblood },
  noteText: { fontFamily: F.serif, fontSize: 16, color: C.parchmentInk },
  section: { marginTop: 16, marginHorizontal: 12, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: C.brass, fontFamily: F.caps, fontSize: 10, letterSpacing: 2.4, color: C.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderBottomWidth: 1, borderBottomColor: 'rgba(201,169,97,0.25)' },
  rowTitle: { fontFamily: F.deco, fontSize: 14, color: C.cream },
  rowNote: { fontFamily: F.sans, fontSize: 11, color: 'rgba(244,232,208,0.6)' },
});
