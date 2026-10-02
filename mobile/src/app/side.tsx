// 02 · Choose your side of the house — Finesse (her) or Carpe Diem (him), as in the design.
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import Animated, {FadeIn} from 'react-native-reanimated';
import {deco, fonts, type Side} from '@/lib/deco';
import {houseSession} from '@/lib/session';

const PANELS: Record<Side, {img: number; tint: string; eyebrow: string; eyebrowColor: string; name: string; size: number; color: string; line: string; bottom: number}> = {
  her: {img: require('../../assets/scenes/lobby-finesse.jpg'), tint: '#6B1424', eyebrow: 'HER · FEMININE ENERGY', eyebrowColor: '#FFB8C8', name: 'Finesse', size: 80, color: deco.pink, line: 'Handbags · shoes · beauty · spa', bottom: 22},
  him: {img: require('../../assets/scenes/lobby-carpe.jpg'), tint: '#3E220C', eyebrow: 'HIM · MASCULINE ENERGY', eyebrowColor: '#FFD2B0', name: 'Carpe Diem', size: 54, color: deco.lamp, line: 'Watches · golf · suits · whiskey', bottom: 36},
};

export default function ChooseSide() {
  const router = useRouter();
  const pick = (s: Side) => { houseSession.setSide(s); router.replace('/hotel'); };
  return (
    <View style={styles.page}>
      <Panel side="her" onPick={pick} />
      <View style={styles.rule}>
        <Svg width="100%" height={3}><Defs><LinearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#A47A34" /><Stop offset="0.5" stopColor="#FFF1C2" /><Stop offset="1" stopColor="#A47A34" /></LinearGradient></Defs><Rect width="100%" height={3} fill="url(#rule)" /></Svg>
      </View>
      <Panel side="him" onPick={pick} />
    </View>
  );
}

function Panel({side, onPick}: {side: Side; onPick: (s: Side) => void}) {
  const p = PANELS[side];
  return (
    <Pressable style={styles.panel} onPress={() => onPick(side)} accessibilityRole="button" accessibilityLabel={`${p.name}. ${p.line}`}>
      <Image source={p.img} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`t${side}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.tint} stopOpacity={0.1} />
            <Stop offset="0.55" stopColor={p.tint} stopOpacity={0.76} />
            <Stop offset="1" stopColor={p.tint} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#t${side})`} />
      </Svg>
      <Animated.View entering={FadeIn.duration(700).delay(side === 'him' ? 180 : 0)} style={[styles.copy, {bottom: p.bottom}]}>
        <Text style={[styles.eyebrow, {color: p.eyebrowColor}]}>{p.eyebrow}</Text>
        <Text style={[styles.name, {fontSize: p.size, lineHeight: p.size * 1.02, color: p.color}]}>{p.name}</Text>
        <View style={styles.lineRow}>
          <Text style={styles.line}>{p.line}</Text>
          <Text style={styles.line}>→</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#0A0807'},
  panel: {flex: 1, overflow: 'hidden'},
  rule: {height: 3},
  copy: {position: 'absolute', left: 24, right: 24},
  eyebrow: {fontFamily: fonts.caps, fontSize: 11, letterSpacing: 4},
  name: {fontFamily: fonts.displayHeavy},
  lineRow: {marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderColor: deco.brassHighlight, flexDirection: 'row', justifyContent: 'space-between'},
  line: {fontFamily: fonts.bodyStrong, fontSize: 14, color: deco.cream},
});
