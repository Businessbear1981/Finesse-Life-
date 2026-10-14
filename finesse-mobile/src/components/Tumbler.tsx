import { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { C, F, brassBar } from '../theme';

const H = 116;
const ROW = 34;
const mod = (n: number, m: number) => ((n % m) + m) % m;

type Props = { value: number; onRoll: (delta: number) => void; disabled?: boolean; index: number };

/** One number tumbler. Swipe up/down to roll, or tap the top/bottom half. Haptic tick per step. */
export function Tumbler({ value, onRoll, disabled, index }: Props) {
  const drag = useSharedValue(0);
  const roll = (steps: number) => {
    if (!steps) return;
    Haptics.selectionAsync();
    onRoll(steps);
  };
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetY([-6, 6])
    .onUpdate((e) => { drag.value = e.translationY; })
    .onEnd((e) => {
      const steps = Math.max(-5, Math.min(5, Math.round(-e.translationY / ROW)));
      runOnJS(roll)(steps);
      drag.value = withSpring(0, { damping: 14, stiffness: 220 });
    });
  const tap = Gesture.Tap().enabled(!disabled).onEnd((e) => { runOnJS(roll)(e.y < H / 2 ? -1 : 1); });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: Math.max(-ROW, Math.min(ROW, drag.value * 0.6)) }] }));

  useEffect(() => { drag.value = 0; }, [value]);

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View accessible accessibilityRole="adjustable" accessibilityLabel={`Tumbler ${index + 1}`} accessibilityValue={{ now: mod(value, 10) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => roll(e.nativeEvent.actionName === 'increment' ? -1 : 1)}
        style={s.wrap}>
        <LinearGradient colors={brassBar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={[s.col, style]}>
          {[-1, 0, 1].map((k) => (
            <Text key={k} style={k === 0 ? s.cur : s.side}>{mod(value + k, 10)}</Text>
          ))}
        </Animated.View>
        <View pointerEvents="none" style={s.band} />
        <LinearGradient pointerEvents="none" colors={['rgba(10,8,7,0.85)', 'transparent', 'transparent', 'rgba(10,8,7,0.85)']} locations={[0, 0.32, 0.68, 1]} style={StyleSheet.absoluteFill} />
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, height: H, overflow: 'hidden', borderTopWidth: 3, borderTopColor: C.goldHi, borderBottomWidth: 3, borderBottomColor: C.brassDark, alignItems: 'center', justifyContent: 'center' },
  col: { alignItems: 'center' },
  side: { fontFamily: F.caps, fontSize: 18, lineHeight: ROW, color: 'rgba(240,216,138,0.32)' },
  cur: { fontFamily: F.caps, fontSize: 30, lineHeight: ROW + 8, color: C.goldHot },
  band: { position: 'absolute', left: 0, right: 0, top: H / 2 - 21, height: 42, borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.gold, backgroundColor: 'rgba(10,8,7,0.3)' },
});
