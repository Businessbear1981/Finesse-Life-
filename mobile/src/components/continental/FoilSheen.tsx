// A slow foil glint that crosses a gilded surface every few seconds. Purely decorative: it never
// blocks touches, and with Reduce Motion on it is not drawn at all.
import {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {weighty} from '@/lib/deco';
import {useBox, useCalm, useSvgId} from './util';

export function FoilSheen({period = 7000, delay = 600, intensity = 0.38, color = '#FFF8E0', radius = 0, once, angle = 18}: {
  period?: number; delay?: number; intensity?: number; color?: string; radius?: number; once?: boolean; angle?: number;
}) {
  const calm = useCalm();
  const {box, onLayout} = useBox();
  const x = useSharedValue(0);
  const id = useSvgId('fs');
  useEffect(() => {
    if (calm || !box) return;
    const sweep = withTiming(1, {duration: weighty.sheen, easing: Easing.bezier(0.45, 0, 0.2, 1)});
    x.value = 0;
    x.value = once ? withDelay(delay, sweep) : withDelay(delay, withRepeat(withSequence(sweep, withTiming(1, {duration: Math.max(0, period - weighty.sheen)}), withTiming(0, {duration: 0})), -1));
    return () => cancelAnimation(x);
  }, [calm, box, period, delay, once, x]);
  const bandW = box ? Math.max(60, box.w * 0.35) : 0;
  const st = useAnimatedStyle(() => ({transform: [{translateX: -bandW * 1.6 + x.value * ((box?.w ?? 0) + bandW * 2.2)}, {rotate: `${angle}deg`}]}));
  return (
    <View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, {overflow: 'hidden', borderRadius: radius}]}>
      {box && !calm ? (
        <Animated.View style={[{position: 'absolute', top: -box.h * 0.5, width: bandW, height: box.h * 2}, st]}>
          <Svg width={bandW} height={box.h * 2}>
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={color} stopOpacity={0} />
                <Stop offset="0.42" stopColor={color} stopOpacity={intensity * 0.35} />
                <Stop offset="0.5" stopColor={color} stopOpacity={intensity} />
                <Stop offset="0.58" stopColor={color} stopOpacity={intensity * 0.35} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width={bandW} height={box.h * 2} fill={`url(#${id})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
