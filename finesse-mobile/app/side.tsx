import { Pressable, Text, View, StyleSheet, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { setSession } from '../src/lib/session';
import { C, F, type Side } from '../src/theme';

const SIDES: { side: Side; kicker: string; name: string; line: string; color: string; tint: string; wash: string; img: any }[] = [
  { side: 'her', kicker: 'HER · FEMININE ENERGY', name: 'Finesse', line: 'Handbags · shoes · beauty · spa', color: C.her, tint: '#FFB8C8', wash: '#6B1424', img: require('../assets/scenes/lobby-finesse.jpg') },
  { side: 'him', kicker: 'HIM · MASCULINE ENERGY', name: 'Carpe Diem', line: 'Watches · golf · suits · whiskey', color: C.him, tint: C.himTint, wash: '#3E220C', img: require('../assets/scenes/lobby-carpe.jpg') },
];

/** 02 Choose your side — two full-bleed halves split by a gold bar. */
export default function SideSelect() {
  const pick = (side: Side) => { setSession({ side }); router.replace('/check-in'); };
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      {SIDES.map((x, i) => (
        <View key={x.side} style={{ flex: 1 }}>
          {i === 1 && <LinearGradient colors={['#A47A34', C.goldHot, '#A47A34']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3 }} />}
          <Pressable onPress={() => pick(x.side)} accessibilityRole="button" accessibilityLabel={`${x.name}, ${x.line}`} style={{ flex: 1 }}>
            <ImageBackground source={x.img} style={{ flex: 1 }} resizeMode="cover">
              <LinearGradient colors={['rgba(0,0,0,0.1)', x.wash + 'C0', x.wash]} locations={[0, 0.55, 1]} style={s.fill}>
                <Text style={[s.kicker, { color: x.tint }]}>{x.kicker}</Text>
                <Text style={[s.name, { color: x.color }]}>{x.name}</Text>
                <View style={s.foot}><Text style={s.line}>{x.line}</Text><Text style={s.line}>→</Text></View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 30 },
  kicker: { fontFamily: F.capsSemi, fontSize: 11, letterSpacing: 4 },
  name: { fontFamily: F.display, fontSize: 76, lineHeight: 78 },
  foot: { marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderTopColor: C.gold, flexDirection: 'row', justifyContent: 'space-between' },
  line: { fontFamily: F.sansBold, fontSize: 14, color: C.cream },
});
