// The Finesse entrance KeyLock: a brass vault dial whose six tumblers lock in as the member sets
// the combination. Purely presentational — whether the doors open is decided by the server.
import {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {
  interpolate, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, {Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText} from 'react-native-svg';
import {BEZEL_STOPS, ROMAN, arcPath, conicRing, deco, easeCine, easeSlide, fonts, keystonePath, polar} from '@/lib/deco';

const V = 360; // design units
const C = V / 2;
const BEZEL = conicRing(C, C, 138.5, 131, BEZEL_STOPS);
const ROM6 = ['I', 'II', 'III', 'IV', 'V', 'VI'];

type Props = {
  size: number;
  setCount: number;          // wheels set so far (0..6) — drives the puzzle, never correctness
  lastDigit: number | null;  // spins the combination dial
  arrive: SharedValue<number>;
  open: SharedValue<number>;
  reduced: boolean;
};

export function VaultDial({size, setCount, lastDigit, arrive, open, reduced}: Props) {
  const k = size / V;
  const dur = (ms: number) => (reduced ? 0 : ms);

  // six tumblers: 0 = out of the mechanism, 1 = seated
  const t0 = useSharedValue(0), t1 = useSharedValue(0), t2 = useSharedValue(0);
  const t3 = useSharedValue(0), t4 = useSharedValue(0), t5 = useSharedValue(0);
  const tumblers = [t0, t1, t2, t3, t4, t5];
  const combo = useSharedValue(0);
  const gear = useSharedValue(0);

  useEffect(() => {
    tumblers.forEach((t, i) => { t.value = withTiming(i < setCount ? 1 : 0, {duration: dur(i < setCount ? 600 : 420), easing: easeCine}); });
    gear.value = withTiming(setCount * 10, {duration: dur(700), easing: easeSlide});
    if (lastDigit !== null) {
      const dir = setCount % 2 === 0 ? 1 : -1;
      combo.value = withTiming(dir * (lastDigit * 36 + 40), {duration: dur(520), easing: easeCine});
    } else {
      combo.value = withTiming(0, {duration: dur(520), easing: easeCine});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCount, lastDigit]);

  const roseStyle = useAnimatedStyle(() => ({
    opacity: arrive.value,
    transform: [{rotate: `${-40 * (1 - arrive.value) + 30 * open.value}deg`}],
  }));
  const glowStyle = useAnimatedStyle(() => ({opacity: 0.9 * open.value}));
  const gearStyle = useAnimatedStyle(() => ({transform: [{rotate: `${gear.value + 40 * open.value}deg`}]}));
  const comboStyle = useAnimatedStyle(() => ({transform: [{rotate: `${combo.value}deg`}]}));
  const jewelStyle = useAnimatedStyle(() => ({transform: [{rotate: `${-90 * open.value}deg`}, {scale: 1 + 0.45 * open.value}]}));
  const barStyle = useAnimatedStyle(() => ({opacity: 1 - open.value, transform: [{translateX: 150 * k * open.value}]}));

  const layer = {position: 'absolute' as const, left: 0, top: 0, width: size, height: size};
  const at = (x: number, y: number, w: number, h: number) => ({position: 'absolute' as const, left: (x - w / 2) * k, top: (y - h / 2) * k, width: w * k, height: h * k});

  return (
    <View style={{width: size, height: size}} accessible={false} importantForAccessibility="no-hide-descendants">
      {/* Compass rose: 12 petals and Roman hours */}
      <Animated.View style={[layer, roseStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Defs>
            <LinearGradient id="petal" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={deco.brassLight} stopOpacity={0.6} />
              <Stop offset="1" stopColor={deco.brassShadow} stopOpacity={0.35} />
            </LinearGradient>
          </Defs>
          <Circle cx={C} cy={C} r={176} stroke={deco.brass} strokeOpacity={0.45} fill="none" />
          <Circle cx={C} cy={C} r={150} stroke={deco.brass} strokeOpacity={0.25} fill="none" />
          {ROMAN.map((r, i) => {
            const p = polar(C, C, 164, i * 30), n = polar(C, C, 141, i * 30);
            return (
              <G key={r}>
                <Ellipse cx={p.x} cy={p.y} rx={8} ry={15} fill="url(#petal)" stroke={deco.brassHighlight} strokeOpacity={0.5} transform={`rotate(${i * 30} ${p.x} ${p.y})`} />
                <SvgText x={n.x} y={n.y + 3} fontSize={9} fill={deco.brassHighlight} fillOpacity={0.75} fontFamily={fonts.label} textAnchor="middle" transform={`rotate(${i * 30} ${n.x} ${n.y})`}>{r}</SvgText>
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* Bezel + recessed face + calibration */}
      <Svg style={layer} width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
        <Defs>
          <RadialGradient id="pool" cx={C} cy={C + 14} r={160} gradientUnits="userSpaceOnUse">
            <Stop offset="0.6" stopColor="#000" stopOpacity={0.8} />
            <Stop offset="1" stopColor="#000" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="face" cx={C} cy={C - 16} r={131} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#1E0F12" />
            <Stop offset="0.62" stopColor={deco.ink} />
          </RadialGradient>
          <LinearGradient id="lip" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity={0.9} />
            <Stop offset="0.25" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor={deco.brassHighlight} stopOpacity={0.18} />
          </LinearGradient>
        </Defs>
        <Circle cx={C} cy={C + 10} r={160} fill="url(#pool)" />
        {BEZEL.map((w, i) => <Path key={i} d={w.d} fill={w.fill} />)}
        <Circle cx={C} cy={C} r={138.5} stroke="#000" strokeOpacity={0.6} fill="none" />
        <Circle cx={C} cy={C} r={131} fill="url(#face)" />
        <Circle cx={C} cy={C} r={130} stroke="url(#lip)" strokeWidth={6} fill="none" />
        <Circle cx={C} cy={C} r={123} stroke={deco.brass} strokeOpacity={0.5} strokeWidth={3} fill="none" />
        {Array.from({length: 36}, (_, i) => {
          const major = i % 3 === 0; const a = polar(C, C, 121, i * 10), b = polar(C, C, major ? 112 : 116, i * 10);
          return <Path key={i} d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={major ? deco.brassHighlight : deco.brass} strokeOpacity={major ? 0.9 : 0.45} strokeWidth={major ? 2 : 1} />;
        })}
        <Circle cx={C} cy={C} r={110} stroke={deco.brass} strokeOpacity={0.2} fill="none" />
        <Circle cx={C} cy={C} r={105} stroke={deco.brass} strokeOpacity={0.1} fill="none" />
      </Svg>

      {/* Lamp glow behind the mechanism once the house opens */}
      <Animated.View style={[layer, glowStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Defs>
            <RadialGradient id="glow" cx={C} cy={C} r={128} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={deco.lamp} stopOpacity={0.85} />
              <Stop offset="0.5" stopColor={deco.brass} stopOpacity={0.3} />
              <Stop offset="0.72" stopColor={deco.brass} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={128} fill="url(#glow)" />
        </Svg>
      </Animated.View>

      {/* Gear ring */}
      <Animated.View style={[layer, gearStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Circle cx={C} cy={C} r={98} stroke={deco.brass} strokeOpacity={0.4} strokeWidth={4} fill="none" />
          {Array.from({length: 48}, (_, i) => {
            const a = polar(C, C, 97, i * 7.5), b = polar(C, C, 91, i * 7.5);
            return <Path key={i} d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={i % 4 === 0 ? deco.brassHighlight : deco.brassMid} strokeWidth={i % 4 === 0 ? 4 : 2.5} />;
          })}
        </Svg>
      </Animated.View>

      {/* Engraved sockets the keystones seat into */}
      <Svg style={layer} width={size} height={size} viewBox={`0 0 ${V} ${V}`} pointerEvents="none">
        <Defs>
          <RadialGradient id="socket" cx={C} cy={C} r={R_OUT} gradientUnits="userSpaceOnUse">
            <Stop offset={R_IN / R_OUT} stopColor="#000" />
            <Stop offset="0.8" stopColor="#120709" />
            <Stop offset="1" stopColor="#000" />
          </RadialGradient>
        </Defs>
        {ROM6.map((_, i) => (
          <G key={i}>
            <Path d={keystonePath(C, C, R_IN, R_OUT, i * 60, 60)} fill="url(#socket)" stroke={deco.brass} strokeOpacity={0.22} strokeWidth={0.75} />
            <Path d={arcPath(C, C, R_OUT - 1.5, i * 60 + 3, i * 60 + 57)} stroke="#000" strokeOpacity={0.9} strokeWidth={2} fill="none" />
          </G>
        ))}
      </Svg>

      {/* Brackets light as each tumbler seats */}
      <Svg style={layer} width={size} height={size} viewBox={`0 0 ${V} ${V}`} pointerEvents="none">
        {ROM6.map((_, i) => {
          const deg = i * 60 + 30; const a = polar(C, C, 89, deg - 5), b = polar(C, C, 89, deg + 5);
          return <Path key={i} d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={i < setCount ? deco.brassWhite : deco.brassShadow} strokeWidth={2.5} />;
        })}
      </Svg>

      {/* The puzzle: six tumblers */}
      {tumblers.map((t, i) => (
        <Tumbler key={i} index={i} t={t} k={k} at={at} />
      ))}

      {/* Locking bar */}
      <Animated.View style={[at(C, C, 184, 7), barStyle]} pointerEvents="none">
        <Svg width={184 * k} height={7 * k} viewBox="0 0 184 7">
          <Defs>
            <LinearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={deco.brassShadow} />
              <Stop offset="0.25" stopColor={deco.brassHighlight} />
              <Stop offset="0.5" stopColor={deco.brass} />
              <Stop offset="0.75" stopColor={deco.brassHighlight} />
              <Stop offset="1" stopColor={deco.brassShadow} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={184} height={7} rx={1} fill="url(#bar)" />
          {Array.from({length: 10}, (_, i) => <Rect key={i} x={16 + i * 15.3} y={1.5} width={1} height={4} fill={deco.ink} opacity={0.3} />)}
        </Svg>
      </Animated.View>

      {/* Bolts */}
      {([[0, -1], [0, 1], [-1, 0], [1, 0]] as const).map(([ux, uy], i) => (
        <Bolt key={i} ux={ux} uy={uy} k={k} at={at} open={open} delay={i * 0.06} />
      ))}

      {/* Combination dial + jewel */}
      <Animated.View style={[at(C, C, 64, 64), comboStyle]} pointerEvents="none">
        <Svg width={64 * k} height={64 * k} viewBox="0 0 64 64">
          <Defs>
            <RadialGradient id="cd" cx="32" cy="32" r="32" gradientUnits="userSpaceOnUse">
              <Stop offset="0.6" stopColor={deco.ink} />
              <Stop offset="1" stopColor="#1A0E10" />
            </RadialGradient>
          </Defs>
          <Circle cx={32} cy={32} r={29} fill="url(#cd)" stroke={deco.brass} strokeWidth={3} />
          {Array.from({length: 12}, (_, i) => {
            const a = polar(32, 32, 26, i * 30), b = polar(32, 32, i % 3 === 0 ? 20 : 23, i * 30);
            return <Path key={i} d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={deco.brass} strokeOpacity={i % 3 === 0 ? 0.9 : 0.5} strokeWidth={i % 3 === 0 ? 2 : 1} />;
          })}
          <Path d="M32 8 L32 56 M8 32 L56 32" stroke={deco.brass} strokeOpacity={0.2} strokeWidth={1} />
        </Svg>
        <Animated.View style={[{position: 'absolute', left: 18 * k, top: 18 * k, width: 28 * k, height: 28 * k}, jewelStyle]}>
          <Svg width={28 * k} height={28 * k} viewBox="0 0 28 28">
            <Defs>
              <LinearGradient id="jewel" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FF8FB0" />
                <Stop offset="1" stopColor="#B3264F" />
              </LinearGradient>
              <LinearGradient id="pin" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={deco.brassLight} />
                <Stop offset="1" stopColor={deco.brassShadow} />
              </LinearGradient>
            </Defs>
            <Path d="M14 3 L25 14 L14 25 L3 14 Z" fill="url(#jewel)" stroke={deco.brass} strokeOpacity={0.6} strokeWidth={1.5} />
            <Path d="M14 9.5 L18.5 14 L14 18.5 L9.5 14 Z" fill="url(#pin)" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

type At = (x: number, y: number, w: number, h: number) => {position: 'absolute'; left: number; top: number; width: number; height: number};

const R_IN = 34, R_OUT = 84;

/**
 * A keystone of the puzzle ring. Unseated it waits outside its socket, tarnished and turned off-axis;
 * as its wheel is set it screws in (rotating about the dial centre), polishes up, and a glint runs
 * along its outer edge when it locks.
 */
function Tumbler({index, t, k}: {index: number; t: SharedValue<number>; k: number; at: At}) {
  const a0 = index * 60, mid = a0 + 30;
  const dir = {x: Math.sin((mid * Math.PI) / 180), y: -Math.cos((mid * Math.PI) / 180)};
  const size = V * k;
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * t.value,
    transform: [
      {translateX: dir.x * 26 * k * (1 - t.value)},
      {translateY: dir.y * 26 * k * (1 - t.value)},
      {rotate: `${-14 * (1 - t.value)}deg`},
    ],
  }));
  const polish = useAnimatedStyle(() => ({opacity: t.value}));
  const glint = useAnimatedStyle(() => ({opacity: interpolate(t.value, [0, 0.82, 0.94, 1], [0, 0, 1, 0.3])}));
  const body = keystonePath(C, C, R_IN, R_OUT, a0, 60);
  const inner = keystonePath(C, C, R_IN, R_OUT, a0, 60, 6);
  const num = polar(C, C, 51, mid);
  const fanRoot = polar(C, C, R_OUT - 7, mid);
  const id = `ks${index}`;
  const layer = {position: 'absolute' as const, left: 0, top: 0, width: size, height: size};

  const Engraving = ({light}: {light: boolean}) => (
    <>
      {/* stepped Art Deco border, inset twice */}
      <Path d={inner} fill="none" stroke={light ? '#5A4018' : '#000'} strokeOpacity={light ? 0.9 : 0.7} strokeWidth={1.2} />
      <Path d={inner} fill="none" stroke={light ? deco.brassWhite : deco.brassShadow} strokeOpacity={light ? 0.55 : 0.4} strokeWidth={0.5} transform="translate(0.6 0.6)" />
      <Path d={keystonePath(C, C, R_IN, R_OUT, a0, 60, 10)} fill="none" stroke={light ? '#6B5028' : '#000'} strokeOpacity={0.6} strokeWidth={0.6} />
      {/* sunburst fan engraved toward the outer edge */}
      {[-14, -7, 0, 7, 14].map((d) => {
        const tip = polar(C, C, R_OUT - 21 + Math.abs(d) * 0.35, mid + d);
        return <Path key={d} d={`M${fanRoot.x} ${fanRoot.y} L${tip.x} ${tip.y}`} stroke={light ? '#5A4018' : '#000'} strokeOpacity={0.75} strokeWidth={0.9} />;
      })}
      <Path d={arcPath(C, C, R_OUT - 22, mid - 16, mid + 16)} stroke={light ? '#5A4018' : '#000'} strokeOpacity={0.6} strokeWidth={0.8} fill="none" />
      {/* inner steps */}
      <Path d={arcPath(C, C, R_IN + 9, mid - 18, mid + 18)} stroke={light ? deco.brassWhite : deco.brassShadow} strokeOpacity={light ? 0.5 : 0.35} strokeWidth={0.7} fill="none" />
      <Path d={arcPath(C, C, R_IN + 12, mid - 10, mid + 10)} stroke={light ? deco.brassWhite : deco.brassShadow} strokeOpacity={light ? 0.4 : 0.3} strokeWidth={0.7} fill="none" />
      {/* raised numeral: shadow then face */}
      <SvgText x={num.x + 0.7} y={num.y + 3.7} fontSize={10} letterSpacing={0.6} fill="#000" fillOpacity={0.55} fontFamily={fonts.label} textAnchor="middle" transform={`rotate(${mid} ${num.x} ${num.y})`}>{ROM6[index]}</SvgText>
      <SvgText x={num.x} y={num.y + 3} fontSize={10} letterSpacing={0.6} fill={light ? '#3A2610' : deco.brassMid} fontFamily={fonts.label} textAnchor="middle" transform={`rotate(${mid} ${num.x} ${num.y})`}>{ROM6[index]}</SvgText>
    </>
  );

  return (
    <Animated.View style={[layer, style]} pointerEvents="none">
      {/* tarnished, unpolished state */}
      <Svg style={{position: 'absolute'}} width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
        <Defs>
          <RadialGradient id={`${id}d`} cx={C} cy={C} r={R_OUT} gradientUnits="userSpaceOnUse">
            <Stop offset={R_IN / R_OUT} stopColor="#1C120A" />
            <Stop offset="0.72" stopColor="#3A2814" />
            <Stop offset="0.93" stopColor="#24170C" />
            <Stop offset="1" stopColor="#4A3416" />
          </RadialGradient>
        </Defs>
        <Path d={body} fill={`url(#${id}d)`} stroke="#000" strokeOpacity={0.8} strokeWidth={1} />
        <Engraving light={false} />
      </Svg>
      {/* polished brass */}
      <Animated.View style={[{position: 'absolute', left: 0, top: 0}, polish]}>
        <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Defs>
            <RadialGradient id={`${id}b`} cx={C} cy={C} r={R_OUT} gradientUnits="userSpaceOnUse">
              <Stop offset={R_IN / R_OUT} stopColor="#6B5028" />
              <Stop offset="0.55" stopColor={deco.brass} />
              <Stop offset="0.74" stopColor={deco.brassWhite} />
              <Stop offset="0.86" stopColor={deco.brassHighlight} />
              <Stop offset="0.95" stopColor={deco.brassMid} />
              <Stop offset="1" stopColor={deco.brassLight} />
            </RadialGradient>
            <LinearGradient id={`${id}s`} x1="0" y1="0" x2={V} y2={V} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.05} />
              <Stop offset="0.55" stopColor="#000000" stopOpacity={0.05} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.45} />
            </LinearGradient>
          </Defs>
          <Path d={body} fill={`url(#${id}b)`} />
          <Path d={body} fill={`url(#${id}s)`} />
          <Path d={body} fill="none" stroke="#2A1A0A" strokeWidth={1.1} />
          <Path d={arcPath(C, C, R_OUT - 1.2, a0 + 2, a0 + 58)} stroke={deco.brassWhite} strokeOpacity={0.85} strokeWidth={1} fill="none" />
          <Path d={arcPath(C, C, R_IN + 1, a0 + 3, a0 + 57)} stroke="#000" strokeOpacity={0.55} strokeWidth={1.2} fill="none" />
          <Engraving light />
        </Svg>
      </Animated.View>
      {/* glint when it locks */}
      <Animated.View style={[{position: 'absolute', left: 0, top: 0}, glint]}>
        <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Defs>
            <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={arcPath(C, C, R_OUT - 1.5, a0 + 8, a0 + 52)} stroke="#FFF8E0" strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <Path d={arcPath(C, C, R_OUT - 1.5, a0 + 18, a0 + 42)} stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.8} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

function Bolt({ux, uy, k, at, open, delay}: {ux: number; uy: number; k: number; at: At; open: SharedValue<number>; delay: number}) {
  const vertical = ux === 0;
  const w = vertical ? 10 : 20, h = vertical ? 20 : 10;
  const x = C + ux * 118, y = C + uy * 118;
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (open.value - delay) / (1 - delay)));
    return {opacity: 1 - p, transform: [{translateX: -ux * 16 * k * p}, {translateY: -uy * 16 * k * p}]};
  });
  return (
    <Animated.View style={[at(x, y, w, h), style]} pointerEvents="none">
      <Svg width={w * k} height={h * k} viewBox={`0 0 ${w} ${h}`}>
        <Defs>
          <LinearGradient id={`bolt${ux}${uy}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={deco.brassLight} />
            <Stop offset="0.5" stopColor={deco.brass} />
            <Stop offset="1" stopColor={deco.brassShadow} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} rx={1} fill={`url(#bolt${ux}${uy})`} />
      </Svg>
    </Animated.View>
  );
}

/** Shake used when the mechanism holds (server said no). */
export function useHoldShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({transform: [{translateX: x.value}]}));
  const shake = (reduced: boolean) => {
    if (reduced) return;
    x.value = withSequence(
      withTiming(-9, {duration: 60}), withTiming(8, {duration: 70}), withTiming(-6, {duration: 70}),
      withTiming(4, {duration: 70}), withTiming(0, {duration: 90}),
    );
  };
  return {style, shake};
}
