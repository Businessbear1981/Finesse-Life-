// Six brass-capped numeral wheels. Tapping the cylinder raises the keypad; each typed digit rolls
// its wheel into the reading window. The wheels are display only — the server checks the code.
import {useEffect} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {deco, fonts} from '@/lib/deco';

const ROW = 34;
const ROWS = ['◆', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

type Props = {width: number; digits: string; onPress: () => void; lit: boolean; reduced: boolean; disabled?: boolean};

export function CombinationCylinder({width, digits, onPress, lit, reduced, disabled}: Props) {
  const CAP = 46, W = 40, H = 100;
  const total = CAP * 2 + W * 6;
  const k = Math.min(1, width / total);
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      accessibilityLabel={`Combination, ${digits.length} of six set. Double tap to enter the house code.`}
      style={{width: total * k, height: H * k, flexDirection: 'row', alignSelf: 'center'}}>
      <Cap k={k} mirrored={false} />
      <View style={{flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 2, borderColor: deco.brassMid,
        shadowColor: deco.brassHighlight, shadowOpacity: lit ? 0.45 : 0, shadowRadius: 18}}>
        {Array.from({length: 6}, (_, i) => (
          <Wheel key={i} k={k} value={digits[i]} reduced={reduced} index={i} />
        ))}
        <View pointerEvents="none" style={{position: 'absolute', left: -2, right: -2, top: (H / 2 - 19) * k - 2, height: 38 * k,
          borderWidth: 1, borderColor: deco.brassHighlight, opacity: 0.7}} />
      </View>
      <Cap k={k} mirrored />
    </Pressable>
  );
}

function Wheel({k, value, reduced, index}: {k: number; value?: string; reduced: boolean; index: number}) {
  const W = 40, H = 100;
  const row = value === undefined ? 0 : ROWS.indexOf(value);
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withTiming(-row * ROW, {duration: reduced ? 0 : 560, easing: Easing.out(Easing.back(1.6))});
  }, [row, reduced, y]);
  const col = useAnimatedStyle(() => ({transform: [{translateY: y.value}]}));
  return (
    <View style={{width: W * k, height: H * k - 4, overflow: 'hidden', backgroundColor: '#2A1418', borderRightWidth: index < 5 ? 0.5 : 0, borderColor: deco.brassMid}}>
      <Animated.View style={[{position: 'absolute', left: 0, right: 0, top: (H / 2 - ROW / 2 - 2) * k}, col]}>
        {ROWS.map((r) => (
          <Text key={r} style={{height: ROW * k, lineHeight: ROW * k, textAlign: 'center', color: r === '◆' ? deco.brass : deco.cream,
            fontFamily: fonts.label, fontSize: (r === '◆' ? 12 : 24) * k}}>{r}</Text>
        ))}
      </Animated.View>
      <Svg pointerEvents="none" style={{position: 'absolute'}} width={W * k} height={H * k} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`curve${index}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={deco.ink} stopOpacity={0.95} />
            <Stop offset="0.32" stopColor={deco.ink} stopOpacity={0} />
            <Stop offset="0.68" stopColor={deco.ink} stopOpacity={0} />
            <Stop offset="1" stopColor={deco.ink} stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill={`url(#curve${index})`} />
      </Svg>
    </View>
  );
}

function Cap({k, mirrored}: {k: number; mirrored: boolean}) {
  const CAP = 46, H = 100;
  const pts = [[0.44, 0], [1, 0], [1, 1], [0.44, 1], [0.44, 0.88], [0.22, 0.88], [0.22, 0.76], [0, 0.76], [0, 0.24], [0.22, 0.24], [0.22, 0.12], [0.44, 0.12]]
    .map(([x, y]) => [(mirrored ? 1 - x : x) * CAP, y * H]);
  const d = `M${pts.map((p) => p.join(' ')).join(' L')} Z`;
  const id = mirrored ? 'capR' : 'capL';
  return (
    <Svg width={CAP * k} height={H * k} viewBox={`0 0 ${CAP} ${H}`}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A2610" />
          <Stop offset="0.22" stopColor={deco.brass} />
          <Stop offset="0.38" stopColor={deco.brassLight} />
          <Stop offset="0.55" stopColor={deco.brass} />
          <Stop offset="0.82" stopColor={deco.brassShadow} />
          <Stop offset="1" stopColor="#2A1A0A" />
        </LinearGradient>
      </Defs>
      <Path d={d} fill={`url(#${id})`} />
      {Array.from({length: 6}, (_, i) => {
        const x = mirrored ? 4 + i * 4.2 : CAP - 4 - i * 4.2;
        const top = i > 2 ? 0.24 : 0.12, h = i > 2 ? 0.52 : 0.76;
        return <Rect key={i} x={x} y={top * H} width={1} height={h * H} fill={deco.ink} opacity={0.35} />;
      })}
    </Svg>
  );
}
