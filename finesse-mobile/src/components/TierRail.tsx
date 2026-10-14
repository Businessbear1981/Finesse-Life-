import { useEffect, useRef } from 'react';
import { Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { interpolate, Extrapolation, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, scrollTo, runOnUI, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { C, F } from '../theme';

type Props = { label: string; items: string[]; index: number; onIndex: (i: number) => void; cardW: number; cardH: number };

/** One turning rail (TOP, BOTTOM or DRESS). Swipe or use the arrows; snaps per piece, side pieces turn away in 3D. */
export function TierRail({ label, items, index, onIndex, cardW, cardH }: Props) {
  const { width } = useWindowDimensions();
  const railW = width - 116; // centre column between the two 58px rails
  const step = cardW + 12;
  const pad = (railW - cardW) / 2;
  const x = useSharedValue(0);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const last = useRef(index);

  useEffect(() => {
    if (last.current === index) return;
    last.current = index;
    runOnUI((to: number) => { 'worklet'; scrollTo(ref, to, 0, true); })(index * step);
  }, [index]);

  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  const settle = (off: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(off / step)));
    if (i !== last.current) { last.current = i; Haptics.selectionAsync(); onIndex(i); }
  };
  const go = (d: number) => onIndex(Math.max(0, Math.min(items.length - 1, index + d)));

  return (
    <View style={{ height: cardH + 24, justifyContent: 'center' }}>
      <Animated.ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast"
        onScroll={onScroll} scrollEventThrottle={16} onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        contentContainerStyle={{ paddingHorizontal: pad, gap: 12, alignItems: 'center' }}>
        {items.map((name, i) => <Card key={name} i={i} x={x} step={step} w={cardW} h={cardH} name={name} />)}
      </Animated.ScrollView>
      <Text style={s.tag}>{label}</Text>
      <Pressable onPress={() => go(-1)} accessibilityLabel={`Previous ${label}`} style={[s.arrow, { left: 6 }]}><Text style={s.arrowText}>←</Text></Pressable>
      <Pressable onPress={() => go(1)} accessibilityLabel={`Next ${label}`} style={[s.arrow, { right: 6 }]}><Text style={s.arrowText}>→</Text></Pressable>
    </View>
  );
}

function Card({ i, x, step, w, h, name }: { i: number; x: SharedValue<number>; step: number; w: number; h: number; name: string }) {
  const st = useAnimatedStyle(() => {
    const d = (x.value - i * step) / step;
    return {
      opacity: interpolate(Math.abs(d), [0, 1, 2], [1, 0.55, 0.2], Extrapolation.CLAMP),
      transform: [{ perspective: 800 }, { rotateY: `${interpolate(d, [-2, 0, 2], [-60, 0, 60], Extrapolation.CLAMP)}deg` }, { scale: interpolate(Math.abs(d), [0, 1], [1, 0.82], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={[{ width: w, height: h }, st]} accessibilityLabel={name}>
      <LinearGradient colors={[C.goldHi, C.brassDeep, '#F6E2A0', '#6B5028']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.frame}>
        <View style={s.photo}><Text style={s.ph}>{name}</Text></View>
      </LinearGradient>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  frame: { flex: 1, padding: 5 },
  photo: { flex: 1, backgroundColor: '#17110E', alignItems: 'center', justifyContent: 'flex-end', padding: 6 },
  ph: { fontFamily: F.sans, fontSize: 10, color: 'rgba(244,232,208,0.6)', textAlign: 'center' },
  tag: { position: 'absolute', left: 8, top: 2, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.ink, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)', fontFamily: F.mono, fontSize: 9, letterSpacing: 1.2, color: C.gold },
  arrow: { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.brass, backgroundColor: 'rgba(10,8,7,0.85)' },
  arrowText: { color: C.gold, fontSize: 16 },
});
