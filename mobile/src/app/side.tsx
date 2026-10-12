// 02 · Which floor first? — Finesse (rose) or Carpe Diem (platinum). Taste, not identity: it only sets
// what the house features first. Stored as the same side values ('her' / 'him') via houseSession.
import {useId} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Svg, {Defs, LinearGradient, RadialGradient, Rect, Stop} from 'react-native-svg';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type {Side} from '@/lib/deco';
import {houseSession} from '@/lib/session';
import {ah, ahFonts, radius} from '@/lib/ah';
import {AHBody, AHChip, AHEyebrow, AHScreen, AHTopBar} from '@/components/ah';
import {TwoTone} from '@/components/keylock/TwoTone';

const FLOORS: Array<{side: Side; n: string; name: string; sub: string; glow: [string, number]; deep: [string, number]; base: string; edge: string}> = [
  {side: 'her', n: '01', name: 'Finesse', sub: 'Handbags · shoes · beauty · spa', glow: [ah.rose, 0.75], deep: [ah.rose3, 0.85], base: '#0B0708', edge: 'rgba(232,180,160,0.32)'},
  {side: 'him', n: '02', name: 'Carpe Diem', sub: 'Watches · golf · suits · whiskey', glow: [ah.platinum, 0.5], deep: ['#3C4048', 0.9], base: '#07080A', edge: 'rgba(185,188,194,0.28)'},
];

export default function ChooseSide() {
  const router = useRouter();
  const pick = (s: Side) => {
    void Haptics.selectionAsync().catch(() => {});
    houseSession.setSide(s);
    router.replace('/hotel');
  };
  return (
    <AHScreen bottom={40}>
      <AHTopBar right={<AHChip label="You’re in" live />} />
      <Animated.View entering={FadeIn.duration(500).delay(100)} style={{marginTop: 18}}>
        <AHEyebrow>Welcome to the house</AHEyebrow>
        <TwoTone lead="Which floor" rose="first?" size={50} style={{marginTop: 8}} />
        <AHBody mute style={{marginTop: 10}}>This only sets what we feature for you. It’s taste, not identity, and every member is welcome on both.</AHBody>
      </Animated.View>
      <View style={{gap: 14, marginTop: 26}}>
        {FLOORS.map((f, i) => (
          <Animated.View key={f.side} entering={FadeInDown.duration(500).delay(280 + i * 100)}>
            <Floor f={f} onPress={() => pick(f.side)} />
          </Animated.View>
        ))}
      </View>
    </AHScreen>
  );
}

function Floor({f, onPress}: {f: (typeof FLOORS)[number]; onPress: () => void}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Floor ${f.n}, ${f.name}. ${f.sub}`}
      style={({pressed}) => [styles.card, {backgroundColor: f.base, borderColor: pressed ? f.edge : ah.line, transform: [{scale: pressed ? 0.985 : 1}]}]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id={`a${id}`} cx="0.8" cy="0.15" rx="0.7" ry="0.6">
            <Stop offset="0" stopColor={f.glow[0]} stopOpacity={f.glow[1]} />
            <Stop offset="1" stopColor={f.glow[0]} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`b${id}`} cx="0.1" cy="0.8" rx="0.6" ry="0.55">
            <Stop offset="0" stopColor={f.deep[0]} stopOpacity={f.deep[1]} />
            <Stop offset="1" stopColor={f.deep[0]} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`c${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.25" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.72} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#a${id})`} />
        <Rect width="100%" height="100%" fill={`url(#b${id})`} />
        <Rect width="100%" height="100%" fill={`url(#c${id})`} />
      </Svg>
      <View style={styles.cardTop}>
        <Text style={styles.floorNo}>Floor {f.n}</Text>
        <Text style={styles.floorNo} accessibilityElementsHidden>→</Text>
      </View>
      <Text style={styles.name}>{f.name}</Text>
      <Text style={styles.sub}>{f.sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {minHeight: 210, borderRadius: radius.card + 2, borderWidth: 1, overflow: 'hidden', padding: 22, justifyContent: 'flex-end'},
  cardTop: {position: 'absolute', top: 20, left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between'},
  floorNo: {fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)'},
  name: {fontFamily: ahFonts.serifItalic, fontSize: 46, lineHeight: 48, letterSpacing: -0.9, color: ah.white},
  sub: {marginTop: 6, fontFamily: ahFonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.72)'},
});
