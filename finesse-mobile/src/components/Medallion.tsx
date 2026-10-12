import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme';

/**
 * The Art Deco medallion from Finesse Hotel.dc.html: gear ring + 6 segments + jeweled dial.
 * Every tumbler roll turns the ring one way and the dial the other; the moved tumbler's segment flashes.
 * On open, the medallion splits into two halves (±S/2). On deny, it shakes.
 */
type Props = { size: number; rolls: number; flash: number | null; set: boolean[]; status: 'idle' | 'verifying' | 'denied' | 'open' };

const TICKS = Array.from({ length: 48 }, (_, i) => i * 7.5);
const SEGS = Array.from({ length: 6 }, (_, i) => i * 60);

function Face({ size, rolls, flash, set, status }: Props) {
  const ring = useSharedValue(0);
  const dial = useSharedValue(0);
  useEffect(() => {
    ring.value = withTiming(rolls * 12, { duration: 550, easing: Easing.bezier(0.3, 1.3, 0.5, 1) });
    dial.value = withTiming(rolls * -18, { duration: 550, easing: Easing.bezier(0.3, 1.3, 0.5, 1) });
  }, [rolls]);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${ring.value}deg` }] }));
  const dialStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${dial.value}deg` }] }));
  const R = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient colors={['#4A3416', C.goldHi, C.brassDeep, C.goldHot, C.brassDark, C.goldHi]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: R }]} />
      <View style={[s.abs, { margin: 8, borderRadius: R, backgroundColor: '#14070B' }]} />
      <Animated.View style={[StyleSheet.absoluteFill, ringStyle]}>
        {TICKS.map((deg, i) => (
          <View key={deg} style={[s.tick, { left: R - 1, top: R - (i % 4 ? 4 : 7), height: i % 4 ? 8 : 14, transform: [{ rotate: `${deg}deg` }, { translateY: -(R - 22) }] }]} />
        ))}
      </Animated.View>
      <View style={[s.abs, { margin: size * 0.2, borderRadius: R, borderWidth: 2, borderColor: 'rgba(232,200,122,0.55)' }]} />
      {SEGS.map((deg, i) => {
        const on = set[i];
        const hot = flash === i;
        return (
          <View key={deg} style={[s.seg, {
            left: R - 9, top: R - 9,
            backgroundColor: hot ? C.goldHot : on ? C.gold : '#2A1A0A',
            shadowOpacity: hot || on ? 0.9 : 0,
            transform: [{ rotate: `${deg}deg` }, { translateY: -size * 0.27 }, { rotate: '45deg' }, { scale: hot ? 1.25 : 1 }],
          }]} />
        );
      })}
      <Animated.View style={[s.abs, { margin: size * 0.36, borderRadius: R, overflow: 'hidden' }, dialStyle]}>
        <LinearGradient colors={[C.brassDeep, C.goldHot, C.brass, '#6B5028', C.goldHi]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={s.dialMark} />
      </Animated.View>
      <View style={[s.jewel, { left: R - 15, top: R - 15, transform: [{ rotate: '45deg' }, { scale: status === 'verifying' ? 1.2 : 1 }] }]} />
    </View>
  );
}

export function Medallion(p: Props) {
  const S = p.size;
  const split = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (p.status === 'open') split.value = withTiming(S * 0.5, { duration: 1100, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    if (p.status === 'denied') shake.value = withSequence(...[-10, 10, -8, 8, -4, 0].map((x) => withTiming(x, { duration: 80 })));
    if (p.status === 'idle') split.value = 0;
  }, [p.status]);
  const wrap = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const left = useAnimatedStyle(() => ({ transform: [{ translateX: -split.value }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateX: split.value }] }));
  return (
    <Animated.View style={[{ width: S, height: S, flexDirection: 'row' }, wrap]}>
      <Animated.View style={[{ width: S / 2, height: S, overflow: 'hidden' }, left]}><Face {...p} /></Animated.View>
      <Animated.View style={[{ width: S / 2, height: S, overflow: 'hidden' }, right]}><View style={{ marginLeft: -S / 2 }}><Face {...p} /></View></Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  abs: { ...StyleSheet.absoluteFillObject },
  tick: { position: 'absolute', width: 2, backgroundColor: C.brass },
  seg: { position: 'absolute', width: 18, height: 18, borderWidth: 2, borderColor: C.gold, shadowColor: C.gold, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  dialMark: { position: 'absolute', left: '50%', top: 6, width: 3, height: 14, marginLeft: -1.5, backgroundColor: C.brassShadow },
  jewel: { position: 'absolute', width: 30, height: 30, backgroundColor: C.her, borderWidth: 2, borderColor: '#FFB8C8', shadowColor: C.her, shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
});
