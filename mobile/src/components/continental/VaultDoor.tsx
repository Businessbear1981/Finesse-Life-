// The vault door: a round steel door in a gunmetal frame with a brass bezel, twelve chrome locking
// bolts, an engine-turned face engraved with a sunburst and the house legend, a five-spoke brass wheel
// and a combination dial. When `open` turns true: the dial spins, the bolts draw in, the wheel turns,
// and the door swings out on its hinges while lamp light spills from inside. Slow and heavy on purpose.
// The frame paints no aperture — whatever sits behind the door shows through once it swings.
import {useEffect, useMemo} from 'react';
import {View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText, TextPath} from 'react-native-svg';
import {BEZEL_STOPS, conicRing, deco, fonts, metals, polar, weighty} from '@/lib/deco';
import {MetalGradient, useSvgId} from './util';

const V = 300, C = 150;
const GUN: Array<[number, string]> = metals.gunmetal.map(([o, c]) => [o, c]);
const FRAME = conicRing(C, C, 147, 129, GUN, 300, 96);
const BEZEL = conicRing(C, C, 129, 124, BEZEL_STOPS, 210, 96);

export function VaultDoor({size, open, calm, onOpened}: {size: number; open: boolean; calm?: boolean; onOpened?: () => void}) {
  const id = useSvgId('vd');
  const k = size / V;
  const bolts = useSharedValue(0), dial = useSharedValue(0), wheel = useSharedValue(0), swing = useSharedValue(0);

  useEffect(() => {
    if (!open) { bolts.value = 0; dial.value = 0; wheel.value = 0; swing.value = 0; return; }
    if (calm) {
      bolts.value = 1; dial.value = 1; wheel.value = 1; swing.value = 1;
      onOpened?.();
      return;
    }
    const heavy = weighty.ease;
    dial.value = withTiming(1, {duration: 1000, easing: Easing.bezier(0.3, 0, 0.2, 1)});
    bolts.value = withDelay(800, withTiming(1, {duration: weighty.bolts, easing: heavy}));
    wheel.value = withDelay(1100, withTiming(1, {duration: weighty.wheel, easing: heavy}));
    swing.value = withDelay(2150, withTiming(1, {duration: weighty.door, easing: Easing.bezier(0.5, 0, 0.3, 1)}));
    const t = setTimeout(() => onOpened?.(), 2150 + weighty.door);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, calm]);

  const art = useMemo(() => {
    const rings = ['', ''];
    for (let r = 30, i = 0; r < 118; r += 1.7, i++) rings[i % 2] += `M${C - r} ${C} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
    const rays = Array.from({length: 36}, (_, i) => { const a = polar(C, C, 60, i * 10), b = polar(C, C, i % 3 ? 96 : 104, i * 10); return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`; }).join(' ');
    const steps = Array.from({length: 48}, (_, i) => { const a = polar(C, C, 113, i * 7.5); return {x: a.x, y: a.y, a: i * 7.5}; });
    const rivets = Array.from({length: 24}, (_, i) => polar(C, C, 138, i * 15 + 7.5));
    const ticks = Array.from({length: 50}, (_, i) => { const a = polar(C, C, 21, i * 7.2), b = polar(C, C, i % 5 ? 18.5 : 16.5, i * 7.2); return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} L${b.x.toFixed(2)} ${b.y.toFixed(2)}`; }).join(' ');
    const knurl = Array.from({length: 60}, (_, i) => { const a = polar(C, C, 24.5, i * 6), b = polar(C, C, 22.5, i * 6); return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} L${b.x.toFixed(2)} ${b.y.toFixed(2)}`; }).join(' ');
    return {rings, rays, steps, rivets, ticks, knurl};
  }, []);

  const swingSt = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, (swing.value - 0.7) / 0.3),
    transform: [{perspective: 900}, {rotateY: `${-108 * swing.value}deg`}],
  }));
  const boltSt = useAnimatedStyle(() => ({transform: [{scale: 1 - 0.14 * bolts.value}]}));
  const wheelSt = useAnimatedStyle(() => ({transform: [{rotate: `${210 * wheel.value}deg`}]}));
  const dialSt = useAnimatedStyle(() => ({transform: [{rotate: `${-560 * dial.value}deg`}]}));
  const glowSt = useAnimatedStyle(() => ({opacity: Math.min(1, swing.value * 2.2)}));

  const layer = {position: 'absolute' as const, left: 0, top: 0, width: size, height: size};
  return (
    <View style={{width: size, height: size}} accessible accessibilityRole="image" accessibilityLabel={open ? 'The vault door swings open' : 'The vault door, closed'}>
      {/* light spilling from inside once the door moves */}
      <Animated.View pointerEvents="none" style={[layer, glowSt]}>
        <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Defs>
            <RadialGradient id={`${id}sp`} cx={C} cy={C} r={128} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFD9A0" stopOpacity={0.55} /><Stop offset="0.6" stopColor={deco.lamp} stopOpacity={0.18} /><Stop offset="1" stopColor={deco.lamp} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={128} fill={`url(#${id}sp)`} />
        </Svg>
      </Animated.View>

      {/* frame */}
      <Svg style={layer} width={size} height={size} viewBox={`0 0 ${V} ${V}`} pointerEvents="none">
        <Defs>
          <RadialGradient id={`${id}sh`} cx={C} cy={C + 4} r={150} gradientUnits="userSpaceOnUse"><Stop offset="0.86" stopColor="#000" stopOpacity={0} /><Stop offset="0.93" stopColor="#000" stopOpacity={0.7} /><Stop offset="1" stopColor="#000" stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`${id}rv`} cx="0.35" cy="0.3" r="0.8"><Stop offset="0" stopColor="#F4F4F2" /><Stop offset="0.5" stopColor="#8E9298" /><Stop offset="1" stopColor="#2A2A30" /></RadialGradient>
        </Defs>
        {FRAME.map((w, i) => <Path key={i} d={w.d} fill={w.fill} />)}
        <Circle cx={C} cy={C} r={147} fill="none" stroke="#000" strokeOpacity={0.8} strokeWidth={1.2} />
        <Circle cx={C} cy={C} r={145.6} fill="none" stroke="#FFF" strokeOpacity={0.12} strokeWidth={0.6} />
        {art.rivets.map((p, i) => <G key={i}><Circle cx={p.x + 0.5} cy={p.y + 0.8} r={2.6} fill="#000" opacity={0.6} /><Circle cx={p.x} cy={p.y} r={2.4} fill={`url(#${id}rv)`} /></G>)}
        {BEZEL.map((w, i) => <Path key={`b${i}`} d={w.d} fill={w.fill} />)}
        <Circle cx={C} cy={C} r={124} fill="none" stroke="#000" strokeWidth={1.4} />
      </Svg>

      {/* door */}
      <Animated.View pointerEvents="none" style={[layer, {transformOrigin: `${(22 / V) * 100}% 50%`, backfaceVisibility: 'hidden'}, swingSt]}>
        <Animated.View style={[layer, boltSt]}>
          <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
            <Defs>
              <MetalGradient id={`${id}bo`} metal="platinum" x1="0" y1="0" x2="1" y2="0" />
            </Defs>
            {Array.from({length: 12}, (_, i) => i * 30 + 15).map((a) => (
              <G key={a} transform={`rotate(${a} ${C} ${C})`}>
                <Rect x={C - 5.5} y={C - 141} width={11} height={24} rx={2} fill="#000" opacity={0.5} />
                <Rect x={C - 5} y={C - 141} width={10} height={24} rx={2} fill={`url(#${id}bo)`} />
                <Rect x={C - 5} y={C - 141} width={10} height={3} rx={1.5} fill="#FFF" opacity={0.5} />
              </G>
            ))}
          </Svg>
        </Animated.View>
        <Svg style={layer} width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Defs>
            <RadialGradient id={`${id}f`} cx="0.4" cy="0.32" r="0.75"><Stop offset="0" stopColor="#5A5A62" /><Stop offset="0.45" stopColor="#2C2C32" /><Stop offset="1" stopColor="#0E0E11" /></RadialGradient>
            <LinearGradient id={`${id}lip`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#C9C9CF" /><Stop offset="0.45" stopColor="#3A3A40" /><Stop offset="0.7" stopColor="#9A9AA2" /><Stop offset="1" stopColor="#141418" /></LinearGradient>
            <LinearGradient id={`${id}spec`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF" stopOpacity={0} /><Stop offset="0.42" stopColor="#FFF" stopOpacity={0.12} /><Stop offset="0.5" stopColor="#FFF" stopOpacity={0.02} /><Stop offset="1" stopColor="#FFF" stopOpacity={0} /></LinearGradient>
            <MetalGradient id={`${id}gl`} metal="goldLeaf" />
            <Path id={`${id}lg`} d={`M${C} ${C} m-100 0 a100 100 0 1 1 200 0 a100 100 0 1 1 -200 0`} />
          </Defs>
          <Circle cx={C + 2} cy={C + 4} r={124} fill="#000" opacity={0.6} />
          <Circle cx={C} cy={C} r={123} fill={`url(#${id}lip)`} />
          <Circle cx={C} cy={C} r={118} fill={`url(#${id}f)`} />
          <Path d={art.rings[0]} fill="none" stroke="#FFF" strokeOpacity={0.06} strokeWidth={0.8} />
          <Path d={art.rings[1]} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={0.8} />
          <Path d={art.rays} stroke={deco.brassHighlight} strokeOpacity={0.28} strokeWidth={0.7} />
          {/* stepped deco band */}
          {art.steps.map((s, i) => <Rect key={i} x={s.x - 1.6} y={s.y - (i % 2 ? 1.6 : 3)} width={3.2} height={i % 2 ? 3.2 : 6} fill={`url(#${id}gl)`} opacity={0.75} transform={`rotate(${s.a} ${s.x} ${s.y})`} />)}
          <Circle cx={C} cy={C} r={108.5} fill="none" stroke={deco.brass} strokeOpacity={0.55} strokeWidth={0.7} />
          <Circle cx={C} cy={C} r={92} fill="none" stroke={deco.brass} strokeOpacity={0.35} strokeWidth={0.6} />
          {/* engraved legend */}
          <SvgText fontSize={8.5} letterSpacing={5.2} fontFamily={fonts.capsBold} fill="#000" fillOpacity={0.7} dy={0.7}><TextPath href={`#${id}lg`} startOffset="2%">FINESSE · THE VAULT · MEMBERS ONLY · MMXXVI ·</TextPath></SvgText>
          <SvgText fontSize={8.5} letterSpacing={5.2} fontFamily={fonts.capsBold} fill={`url(#${id}gl)`}><TextPath href={`#${id}lg`} startOffset="2%">FINESSE · THE VAULT · MEMBERS ONLY · MMXXVI ·</TextPath></SvgText>
          <Circle cx={C} cy={C} r={118} fill={`url(#${id}spec)`} />
        </Svg>
        {/* wheel */}
        <Animated.View style={[layer, wheelSt]}>
          <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
            <Defs>
              <MetalGradient id={`${id}w`} metal="brass" x1="0" y1="0" x2="1" y2="1" />
              <RadialGradient id={`${id}kn`} cx="0.35" cy="0.3" r="0.8"><Stop offset="0" stopColor="#FFF8DC" /><Stop offset="0.4" stopColor="#D8B66A" /><Stop offset="1" stopColor="#4A3416" /></RadialGradient>
            </Defs>
            {Array.from({length: 5}, (_, i) => i * 72).map((a) => {
              const e = polar(C, C, 74, a);
              return (
                <G key={a}>
                  <Path d={`M${C} ${C} L${e.x} ${e.y}`} stroke="#000" strokeOpacity={0.55} strokeWidth={8} transform="translate(1.5 2.5)" strokeLinecap="round" />
                  <G transform={`rotate(${a} ${C} ${C})`}><Rect x={C - 3.4} y={C - 74} width={6.8} height={60} rx={3} fill={`url(#${id}w)`} /><Rect x={C - 1} y={C - 72} width={1.4} height={56} fill="#FFF" opacity={0.45} /></G>
                  <Circle cx={e.x + 1.2} cy={e.y + 2} r={9.5} fill="#000" opacity={0.5} />
                  <Circle cx={e.x} cy={e.y} r={9.5} fill={`url(#${id}kn)`} />
                  <Circle cx={e.x - 2.6} cy={e.y - 3} r={2.6} fill="#FFF" opacity={0.55} />
                </G>
              );
            })}
            <Circle cx={C + 1.5} cy={C + 2.5} r={32} fill="#000" opacity={0.5} />
            <Circle cx={C} cy={C} r={32} fill={`url(#${id}w)`} />
            <Circle cx={C} cy={C} r={28} fill="none" stroke="#3A2608" strokeOpacity={0.6} />
          </Svg>
        </Animated.View>
        {/* combination dial */}
        <Animated.View style={[layer, dialSt]}>
          <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
            <Defs>
              <RadialGradient id={`${id}d`} cx="0.4" cy="0.35" r="0.7"><Stop offset="0" stopColor="#2A2630" /><Stop offset="1" stopColor="#050506" /></RadialGradient>
              <MetalGradient id={`${id}k`} metal="platinum" />
            </Defs>
            <Circle cx={C} cy={C} r={25} fill={`url(#${id}k)`} />
            <Path d={art.knurl} stroke="#2A2A30" strokeWidth={0.6} />
            <Circle cx={C} cy={C} r={22} fill={`url(#${id}d)`} />
            <Path d={art.ticks} stroke={deco.brassLight} strokeWidth={0.5} />
            {[0, 10, 20, 30, 40].map((n, i) => { const p = polar(C, C, 13, i * 72); return <SvgText key={n} x={p.x} y={p.y + 1.6} fontSize={4.4} fontFamily={fonts.label} textAnchor="middle" fill={deco.brassLight}>{n}</SvgText>; })}
            <Circle cx={C} cy={C} r={6} fill={`url(#${id}k)`} />
          </Svg>
        </Animated.View>
        {/* index mark (fixed to the door) */}
        <Svg style={layer} width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Path d={`M${C - 3} ${C - 30} L${C + 3} ${C - 30} L${C} ${C - 25.5} Z`} fill={deco.brassWhite} />
        </Svg>
      </Animated.View>

      {/* hinges */}
      <Svg style={layer} width={size} height={size} viewBox={`0 0 ${V} ${V}`} pointerEvents="none">
        <Defs><MetalGradient id={`${id}h`} metal="brass" x1="0" y1="0" x2="1" y2="0" /></Defs>
        {[C - 62, C + 38].map((y) => (
          <G key={y}>
            <Rect x={10} y={y + 2} width={18} height={26} rx={4} fill="#000" opacity={0.55} />
            <Rect x={8} y={y} width={18} height={24} rx={4} fill={`url(#${id}h)`} />
            <Rect x={8} y={y + 11} width={18} height={1.2} fill="#3A2608" opacity={0.7} />
            <Rect x={12} y={y + 2} width={2} height={20} fill="#FFF" opacity={0.4} />
          </G>
        ))}
      </Svg>
    </View>
  );
}
