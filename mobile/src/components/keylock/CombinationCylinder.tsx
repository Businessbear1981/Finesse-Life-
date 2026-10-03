// Six brass tumblers between stepped Art Deco end caps, as in the Finesse design.
// Tap the upper half of a tumbler to roll it up, the lower half to roll it down.
// Display only: the house code is checked by the server when the member pulls.
import {useEffect} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {deco, fonts} from '@/lib/deco';

const FACE = 38;
const LOOP = 3;

type Props = {
  width: number;
  values: number[];
  touched: boolean[];
  onRoll: (index: number, dir: 1 | -1) => void;
  lit: boolean;
  open: boolean;
  reduced: boolean;
  disabled?: boolean;
};

export function CombinationCylinder({width, values, touched, onRoll, lit, open, reduced, disabled}: Props) {
  const CAP = 64, W = 54, H = 140;
  const total = CAP * 2 + W * 6;
  const k = Math.min(1, width / total);
  const capX = useSharedValue(0);
  useEffect(() => { capX.value = withTiming(open ? 1 : 0, {duration: reduced ? 0 : 1100, easing: Easing.bezier(0.4, 0, 0.2, 1)}); }, [open, reduced, capX]);
  const capL = useAnimatedStyle(() => ({transform: [{translateX: -26 * k * capX.value}]}));
  const capR = useAnimatedStyle(() => ({transform: [{translateX: 26 * k * capX.value}]}));
  return (
    <View style={{alignSelf: 'center', alignItems: 'center'}}>
      <View style={{flexDirection: 'row', height: H * k}}>
        <Animated.View style={capL}><Cap k={k} side="left" /></Animated.View>
        <View style={{flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 2, borderColor: deco.brassMid,
          shadowColor: deco.brassHighlight, shadowOpacity: lit ? 0.55 : 0, shadowRadius: 22}}>
          {values.map((v, i) => (
            <Tumbler key={i} index={i} k={k} value={v} set={touched[i]} reduced={reduced} disabled={disabled} onRoll={onRoll} />
          ))}
          <View pointerEvents="none" style={{position: 'absolute', left: 0, right: 0, top: (H / 2 - 22) * k - 2, height: 44 * k,
            borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(232,200,122,0.8)'}} />
        </View>
        <Animated.View style={capR}><Cap k={k} side="right" /></Animated.View>
      </View>
      <View style={{width: total * k * 1.2, height: 14, marginTop: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)'}} />
    </View>
  );
}

function Tumbler({index, k, value, set, reduced, disabled, onRoll}: {index: number; k: number; value: number; set: boolean; reduced: boolean; disabled?: boolean; onRoll: Props['onRoll']}) {
  const W = 54, H = 140;
  const pos = useSharedValue(10 + value);
  useEffect(() => {
    const cur = pos.value;
    const target = Math.round((cur - value) / 10) * 10 + value;
    pos.value = withTiming(target, {duration: reduced ? 0 : 450, easing: Easing.out(Easing.back(1.3))}, (done) => {
      'worklet';
      if (done) pos.value = 10 + value;
    });
  }, [value, reduced, pos]);
  const strip = useAnimatedStyle(() => ({transform: [{translateY: -pos.value * FACE * k}]}));
  return (
    <View style={{width: W * k, height: H * k - 4, overflow: 'hidden', backgroundColor: '#120806',
      borderLeftWidth: 3, borderRightWidth: 3, borderLeftColor: deco.brassMid, borderRightColor: '#3A2610', opacity: set ? 1 : 0.82}}>
      <Animated.View style={[{position: 'absolute', left: 0, right: 0, top: (H / 2 - FACE / 2 - 2) * k}, strip]}>
        {Array.from({length: 10 * LOOP}, (_, r) => (
          <View key={r} style={{height: FACE * k, borderTopWidth: 1, borderColor: 'rgba(201,169,97,0.3)', backgroundColor: '#2E1E0E', alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontFamily: fonts.display, fontSize: 26 * k, color: deco.brassHighlight}}>{r % 10}</Text>
          </View>
        ))}
      </Animated.View>
      <Svg pointerEvents="none" style={{position: 'absolute'}} width={W * k} height={H * k} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`drum${index}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#050203" stopOpacity={0.94} />
            <Stop offset="0.34" stopColor="#050203" stopOpacity={0} />
            <Stop offset="0.66" stopColor="#050203" stopOpacity={0} />
            <Stop offset="1" stopColor="#050203" stopOpacity={0.94} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill={`url(#drum${index})`} />
      </Svg>
      <Pressable disabled={disabled} onPress={() => onRoll(index, 1)} accessibilityRole="button" accessibilityLabel={`Tumbler ${index + 1}, showing ${value}. Roll up.`}
        style={({pressed}) => ({position: 'absolute', left: 0, right: 0, top: 0, height: '50%', backgroundColor: pressed ? 'rgba(232,200,122,0.06)' : 'transparent'})} />
      <Pressable disabled={disabled} onPress={() => onRoll(index, -1)} accessibilityRole="button" accessibilityLabel={`Tumbler ${index + 1}, showing ${value}. Roll down.`}
        style={({pressed}) => ({position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', backgroundColor: pressed ? 'rgba(232,200,122,0.06)' : 'transparent'})} />
    </View>
  );
}

function Cap({k, side}: {k: number; side: 'left' | 'right'}) {
  const CAP = 64, H = 140;
  const L = [[0.44, 0], [1, 0], [1, 1], [0.44, 1], [0.44, 0.88], [0.22, 0.88], [0.22, 0.76], [0, 0.76], [0, 0.24], [0.22, 0.24], [0.22, 0.12], [0.44, 0.12]];
  const pts = (side === 'left' ? L : L.map(([x, y]) => [1 - x, y])).map(([x, y]) => `${(x * CAP).toFixed(1)} ${(y * H).toFixed(1)}`);
  const id = `cap${side}`;
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
      <Path d={`M${pts.join(' L')} Z`} fill={`url(#${id})`} />
      {Array.from({length: 12}, (_, i) => {
        const x = side === 'left' ? CAP - 2 - i * 5 : 2 + i * 5;
        const inner = i < 7 ? [0, 1] : i < 10 ? [0.12, 0.88] : [0.24, 0.76];
        return <Rect key={i} x={x} y={inner[0] * H} width={1} height={(inner[1] - inner[0]) * H} fill="#0A0406" opacity={0.4} />;
      })}
    </Svg>
  );
}
