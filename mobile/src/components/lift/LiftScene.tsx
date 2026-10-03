// The Private Lift: deco canopy and fanlight, floor indicator, fluted brass columns and two lacquered
// doors carrying the six tumblers (three per door). Display only — the server opens the doors.
import {useEffect} from 'react';
import {Text, View} from 'react-native';
import Animated, {Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue} from 'react-native-reanimated';
import Svg, {Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText} from 'react-native-svg';
import {arcPath, deco, fonts, polar} from '@/lib/deco';

const ROW = 30;
const ROWS = ['·', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

type Props = {
  width: number;
  digits: string;
  masked: boolean;               // enrolment: show ◆ instead of numbers
  active: boolean;               // tumblers lit (cipher showing)
  floor: SharedValue<number>;    // 0 = Lobby, 1 = Penthouse
  doors: SharedValue<number>;    // 0 = closed, 1 = open
  reduced: boolean;
};

export function LiftScene({width, digits, masked, active, floor, doors, reduced}: Props) {
  const W = width, k = W / 340;
  const H = 470 * k;
  const bayX = 46 * k, bayW = 248 * k, bayY = 150 * k, bayH = 300 * k;
  const doorW = bayW / 2;

  const needle = useAnimatedStyle(() => ({transform: [{rotate: `${-80 + 160 * floor.value}deg`}]}));
  const left = useAnimatedStyle(() => ({transform: [{translateX: -doorW * doors.value}]}));
  const right = useAnimatedStyle(() => ({transform: [{translateX: doorW * doors.value}]}));
  const inside = useAnimatedStyle(() => ({opacity: interpolate(doors.value, [0, 0.3, 1], [0, 0.6, 1])}));
  const lamp = useAnimatedStyle(() => ({opacity: 0.35 + 0.65 * floor.value}));

  return (
    <View style={{width: W, height: H, alignSelf: 'center'}}>
      {/* Architecture: canopy, fanlight, indicator, columns, frame */}
      <Svg style={{position: 'absolute'}} width={W} height={H} viewBox="0 0 340 470">
        <Defs>
          <LinearGradient id="brassV" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={deco.brassWhite} />
            <Stop offset="0.35" stopColor={deco.brassHighlight} />
            <Stop offset="0.7" stopColor={deco.brass} />
            <Stop offset="1" stopColor={deco.brassShadow} />
          </LinearGradient>
          <LinearGradient id="flute" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#2A1A0A" />
            <Stop offset="0.3" stopColor={deco.brass} />
            <Stop offset="0.5" stopColor={deco.brassWhite} />
            <Stop offset="0.7" stopColor={deco.brass} />
            <Stop offset="1" stopColor="#2A1A0A" />
          </LinearGradient>
          <RadialGradient id="fan" cx="170" cy="150" r="120" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={deco.lamp} stopOpacity={0.45} />
            <Stop offset="1" stopColor={deco.ink} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* stepped canopy */}
        <Path d="M40 30 L300 30 M58 22 L282 22 M80 14 L260 14" stroke="url(#brassV)" strokeWidth={2} />
        <Path d="M170 2 L180 12 L170 22 L160 12 Z" fill={deco.ink} stroke={deco.brassHighlight} strokeWidth={1.2} />
        {/* fanlight */}
        <Path d="M46 150 A124 110 0 0 1 294 150 Z" fill="url(#fan)" stroke="url(#brassV)" strokeWidth={2.5} />
        <Path d="M76 150 A94 82 0 0 1 264 150" stroke={deco.brass} strokeOpacity={0.5} fill="none" />
        {Array.from({length: 13}, (_, i) => {
          const a = -90 + i * 15; const p = polar(170, 150, 108, a + 90 - 90); const q = polar(170, 150, 40, a + 90 - 90);
          return <Path key={i} d={`M${q.x} ${q.y} L${p.x} ${p.y}`} stroke={deco.brass} strokeOpacity={0.35} strokeWidth={1} />;
        })}
        {/* floor indicator face */}
        <Circle cx={170} cy={112} r={34} fill={deco.ink} stroke="url(#brassV)" strokeWidth={3} />
        <Path d={arcPath(170, 112, 27, -80, 80)} stroke={deco.brass} strokeOpacity={0.6} fill="none" />
        {Array.from({length: 9}, (_, i) => {
          const a = -80 + i * 20; const p = polar(170, 112, 27, a), q = polar(170, 112, i % 4 === 0 ? 20 : 23, a);
          return <Path key={i} d={`M${p.x} ${p.y} L${q.x} ${q.y}`} stroke={deco.brassHighlight} strokeWidth={i % 4 === 0 ? 1.6 : 0.8} />;
        })}
        <SvgText x={144} y={126} fontSize={9} fill={deco.brassHighlight} fontFamily={fonts.label} textAnchor="middle">L</SvgText>
        <SvgText x={196} y={126} fontSize={9} fill={deco.brassHighlight} fontFamily={fonts.label} textAnchor="middle">P</SvgText>
        {/* fluted columns */}
        {[[14, 30], [296, 30]].map(([x, w]) => (
          <G key={x}>
            <Rect x={x} y={150} width={w} height={300} fill={deco.oxblood} />
            {Array.from({length: 5}, (_, i) => <Rect key={i} x={x + 2 + i * 5.6} y={156} width={4} height={288} rx={2} fill="url(#flute)" opacity={0.85} />)}
            <Rect x={x - 3} y={146} width={w + 6} height={6} fill="url(#brassV)" />
            <Rect x={x - 3} y={448} width={w + 6} height={8} fill="url(#brassV)" />
          </G>
        ))}
        {/* architrave */}
        <Rect x={43} y={147} width={254} height={306} fill="none" stroke="url(#brassV)" strokeWidth={3} />
      </Svg>

      {/* needle + lamp */}
      <Animated.View style={[{position: 'absolute', left: 170 * k - 30 * k, top: 112 * k - 30 * k, width: 60 * k, height: 60 * k}, needle]}>
        <Svg width={60 * k} height={60 * k} viewBox="0 0 60 60">
          <Path d="M30 30 L30 7" stroke={deco.brassWhite} strokeWidth={2} strokeLinecap="round" />
          <Path d="M30 4 L33 10 L27 10 Z" fill={deco.pink} />
          <Circle cx={30} cy={30} r={4} fill={deco.brassHighlight} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{position: 'absolute', left: 150 * k, top: 64 * k, width: 40 * k, height: 10 * k, borderRadius: 5 * k, backgroundColor: deco.lamp, shadowColor: deco.lamp, shadowOpacity: 0.9, shadowRadius: 12}, lamp]} />

      {/* The bay: interior behind the doors */}
      <View style={{position: 'absolute', left: bayX, top: bayY, width: bayW, height: bayH, overflow: 'hidden', backgroundColor: deco.ink}}>
        <Animated.View style={[{position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center'}, inside]}>
          <Svg style={{position: 'absolute'}} width={bayW} height={bayH}>
            <Defs>
              <RadialGradient id="room" cx={bayW / 2} cy={bayH * 0.35} r={bayW * 0.9} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={deco.cream} stopOpacity={0.95} />
                <Stop offset="0.35" stopColor={deco.lamp} stopOpacity={0.5} />
                <Stop offset="1" stopColor={deco.ink} stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={bayW} height={bayH} fill="url(#room)" />
          </Svg>
          <Text style={{fontFamily: fonts.display, fontSize: 30 * k, color: deco.burgundy}}>The Penthouse</Text>
          <Text style={{fontFamily: fonts.label, fontSize: 9 * k, letterSpacing: 4 * k, color: deco.burgundy, marginTop: 6}}>FLOOR XVII</Text>
        </Animated.View>
        <Animated.View style={[{position: 'absolute', left: 0, top: 0, width: doorW, height: bayH}, left]}>
          <Door w={doorW} h={bayH} k={k} side="left" digits={digits.slice(0, 3)} masked={masked} active={active} reduced={reduced} />
        </Animated.View>
        <Animated.View style={[{position: 'absolute', left: doorW, top: 0, width: doorW, height: bayH}, right]}>
          <Door w={doorW} h={bayH} k={k} side="right" digits={digits.slice(3, 6)} masked={masked} active={active} reduced={reduced} />
        </Animated.View>
      </View>
    </View>
  );
}

function Door({w, h, k, side, digits, masked, active, reduced}: {w: number; h: number; k: number; side: 'left' | 'right'; digits: string; masked: boolean; active: boolean; reduced: boolean}) {
  const id = `door${side}`;
  const vw = 124, vh = 300;
  const inner = side === 'left' ? vw : 0; // the meeting stile
  return (
    <View style={{width: w, height: h}}>
      <Svg style={{position: 'absolute'}} width={w} height={h} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#4A1A24" />
            <Stop offset="0.5" stopColor={deco.burgundy} />
            <Stop offset="1" stopColor="#12060A" />
          </LinearGradient>
          <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={deco.brassWhite} />
            <Stop offset="0.5" stopColor={deco.brass} />
            <Stop offset="1" stopColor={deco.brassShadow} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={vw} height={vh} fill={`url(#${id}l)`} />
        {/* stepped deco inlay */}
        <Path d={`M12 ${vh - 14} L12 70 L22 70 L22 54 L36 54 L36 40 L${vw - 36} 40 L${vw - 36} 54 L${vw - 22} 54 L${vw - 22} 70 L${vw - 12} 70 L${vw - 12} ${vh - 14} Z`} fill="none" stroke={`url(#${id}b)`} strokeWidth={1.4} />
        <Path d={`M22 ${vh - 24} L22 80 L32 80 L32 64 L46 64 L46 52 L${vw - 46} 52 L${vw - 46} 64 L${vw - 32} 64 L${vw - 32} 80 L${vw - 22} 80 L${vw - 22} ${vh - 24} Z`} fill="none" stroke={deco.brass} strokeOpacity={0.45} strokeWidth={0.8} />
        {/* sunburst crest */}
        {Array.from({length: 9}, (_, i) => {
          const p = polar(vw / 2, 112, 34, -60 + i * 15), q = polar(vw / 2, 112, 8, -60 + i * 15);
          return <Path key={i} d={`M${q.x} ${q.y} L${p.x} ${p.y}`} stroke={`url(#${id}b)`} strokeWidth={i % 2 ? 0.8 : 1.4} />;
        })}
        <Path d={`M${vw / 2 - 6} 112 L${vw / 2} 104 L${vw / 2 + 6} 112 L${vw / 2} 120 Z`} fill={deco.pink} opacity={0.85} />
        {/* chevrons under the tumblers */}
        {[0, 1, 2].map((i) => <Path key={i} d={`M30 ${236 + i * 10} L${vw / 2} ${246 + i * 10} L${vw - 30} ${236 + i * 10}`} stroke={deco.brass} strokeOpacity={0.5} fill="none" />)}
        {/* meeting stile + pull */}
        <Rect x={inner - (side === 'left' ? 3 : 0)} y={0} width={3} height={vh} fill={`url(#${id}b)`} />
        <Rect x={side === 'left' ? vw - 14 : 11} y={150} width={3} height={46} rx={1.5} fill={`url(#${id}b)`} />
      </Svg>
      {/* three tumblers */}
      <View style={{position: 'absolute', top: h * 0.56, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 * k}}>
        {[0, 1, 2].map((i) => <LiftTumbler key={i} k={k} value={digits[i]} masked={masked} active={active} reduced={reduced} />)}
      </View>
    </View>
  );
}

function LiftTumbler({k, value, masked, active, reduced}: {k: number; value?: string; masked: boolean; active: boolean; reduced: boolean}) {
  const row = value === undefined ? 0 : masked ? 0 : ROWS.indexOf(value);
  const y = useSharedValue(0);
  const set = useSharedValue(0);
  useEffect(() => {
    y.value = withTiming(-row * ROW, {duration: reduced ? 0 : 520, easing: Easing.out(Easing.back(1.5))});
    set.value = withTiming(value === undefined ? 0 : 1, {duration: reduced ? 0 : 300});
  }, [row, value, reduced, set, y]);
  const col = useAnimatedStyle(() => ({transform: [{translateY: y.value * k}]}));
  const ring = useAnimatedStyle(() => ({borderColor: set.value > 0.5 ? deco.brassWhite : deco.brassShadow, shadowOpacity: 0.7 * set.value}));
  return (
    <Animated.View style={[{width: 28 * k, height: 40 * k, borderRadius: 4 * k, borderWidth: 1.5, overflow: 'hidden', backgroundColor: '#0E0508',
      shadowColor: deco.brassHighlight, shadowRadius: 8, opacity: active ? 1 : 0.45}, ring]}>
      <Animated.View style={[{position: 'absolute', left: 0, right: 0, top: (40 - ROW) / 2 * k}, col]}>
        {ROWS.map((r) => (
          <Text key={r} style={{height: ROW * k, lineHeight: ROW * k, textAlign: 'center', fontFamily: fonts.label, fontSize: 20 * k,
            color: r === '·' ? deco.brassShadow : deco.brassHighlight}}>{value !== undefined && masked && r === '·' ? '◆' : r}</Text>
        ))}
      </Animated.View>
      <View pointerEvents="none" style={{position: 'absolute', left: 0, right: 0, top: 0, height: 10 * k, backgroundColor: '#000', opacity: 0.55}} />
      <View pointerEvents="none" style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 10 * k, backgroundColor: '#000', opacity: 0.55}} />
    </Animated.View>
  );
}
