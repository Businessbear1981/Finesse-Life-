// The entrance hall behind the lock: champagne sunburst, ceiling spotlight, vignette.
import {StyleSheet, useWindowDimensions} from 'react-native';
import Animated, {useAnimatedStyle, type SharedValue} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {deco} from '@/lib/deco';

type Props = {centerY: number; arrive: SharedValue<number>; open: SharedValue<number>; drift: SharedValue<number>};

export function Backdrop({centerY, arrive, open, drift}: Props) {
  const {width, height} = useWindowDimensions();
  const span = Math.max(width, height) * 1.6;
  const rays = Array.from({length: 30}, (_, i) => i * 6);

  const sunStyle = useAnimatedStyle(() => ({
    opacity: arrive.value * (0.85 + 0.15 * open.value),
    transform: [{rotate: `${-9 * drift.value}deg`}],
  }));
  const coneStyle = useAnimatedStyle(() => ({opacity: 0.45 + 0.35 * arrive.value + 0.2 * open.value}));

  return (
    <>
      <Animated.View pointerEvents="none" style={[{position: 'absolute', left: width / 2 - span / 2, top: centerY - span / 2, width: span, height: span}, sunStyle]}>
        <Svg width={span} height={span}>
          {rays.map((deg) => (
            <Rect key={deg} x={span / 2 - 0.8} y={0} width={1.6} height={span} fill={deco.champagne} opacity={0.16}
              transform={`rotate(${deg} ${span / 2} ${span / 2})`} />
          ))}
        </Svg>
      </Animated.View>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          <RadialGradient id="vig" cx={width / 2} cy={centerY} rx={width * 0.95} ry={height * 0.55} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={deco.ink} stopOpacity={0.05} />
            <Stop offset="0.38" stopColor={deco.ink} stopOpacity={0.55} />
            <Stop offset="0.62" stopColor={deco.ink} stopOpacity={0.97} />
            <Stop offset="1" stopColor={deco.ink} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#vig)" />
      </Svg>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, coneStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFECBE" stopOpacity={0.24} />
              <Stop offset="0.6" stopColor="#FFECBE" stopOpacity={0.06} />
              <Stop offset="1" stopColor="#FFECBE" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`M${width * 0.42} 0 L${width * 0.58} 0 L${width * 0.95} ${height * 0.78} L${width * 0.05} ${height * 0.78} Z`} fill="url(#cone)" />
        </Svg>
      </Animated.View>
    </>
  );
}
