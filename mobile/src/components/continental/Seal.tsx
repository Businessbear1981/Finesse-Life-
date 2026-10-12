// Wax seal with a pressed ring and an embossed device (a monogram or the house sigil), and the sigil on
// its own: the all-seeing eye within a stepped pyramid. Used sparingly — a mark of the house, not wallpaper.
import {useMemo} from 'react';
import {View} from 'react-native';
import Svg, {Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText} from 'react-native-svg';
import {deco, fonts, polar} from '@/lib/deco';
import {MetalGradient, rng, useSvgId} from './util';

const WAX = {
  oxblood: ['#C23A4E', '#7A1626', '#3A060E', '#1C0206'],
  black: ['#4A4650', '#1A181C', '#0A090B', '#000000'],
  gold: ['#FFF0B8', '#D4A846', '#7A5414', '#3A2606'],
} as const;

/** Sigil path set in a 100×100 box: stepped pyramid, capstone with eye, rays. */
function sigilParts() {
  const rays = Array.from({length: 13}, (_, i) => {
    const a = -72 + i * 12;
    const p0 = polar(50, 30, 15, a), p1 = polar(50, 30, i % 2 ? 25 : 31, a);
    return `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }).join(' ');
  return {
    rays,
    cap: 'M50 12 L68 40 L32 40 Z',
    steps: 'M28 46 L72 46 M24 54 L76 54 M20 62 L80 62 M16 70 L84 70',
    body: 'M30 44 L70 44 L86 78 L14 78 Z',
    eye: 'M38 31 Q50 21 62 31 Q50 39 38 31 Z',
  };
}

export function Sigil({size = 40, color = deco.brassHighlight, opacity = 1}: {size?: number; color?: string; opacity?: number}) {
  const p = useMemo(sigilParts, []);
  return (
    <View style={{width: size, height: size}} accessible={false}>
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Path d={p.rays} stroke={color} strokeWidth={1.1} strokeLinecap="round" />
      <Path d={p.body} fill="none" stroke={color} strokeWidth={1.6} />
      <Path d={p.steps} stroke={color} strokeWidth={0.9} strokeOpacity={0.8} />
      <Path d={p.cap} fill="none" stroke={color} strokeWidth={1.6} />
      <Path d={p.eye} fill="none" stroke={color} strokeWidth={1.3} />
      <Circle cx={50} cy={31} r={3} fill={color} />
    </Svg>
    </View>
  );
}

export function Seal({size = 64, wax = 'oxblood', glyph = 'F', seed = 3, label}: {size?: number; wax?: keyof typeof WAX; glyph?: 'eye' | string; seed?: number; label?: string}) {
  const id = useSvgId('ws');
  const c = WAX[wax];
  const outline = useMemo(() => {
    const r = rng(seed);
    const pts: string[] = [];
    const N = 64;
    const bumps = Array.from({length: 9}, () => ({a: r() * Math.PI * 2, w: 0.25 + r() * 0.35, h: 0.03 + r() * 0.06}));
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      let rad = 46 + Math.sin(t * 7 + seed) * 0.9 + Math.sin(t * 13) * 0.5;
      bumps.forEach((b) => { const d = Math.atan2(Math.sin(t - b.a), Math.cos(t - b.a)); rad += 46 * b.h * Math.exp(-(d * d) / (b.w * b.w * 0.2)); });
      pts.push(`${(50 + rad * Math.cos(t)).toFixed(2)} ${(50 + rad * Math.sin(t)).toFixed(2)}`);
    }
    return `M${pts.join(' L')} Z`;
  }, [seed]);
  const p = useMemo(sigilParts, []);
  const dark = wax === 'gold' ? '#3A2606' : '#000';
  const hi = wax === 'gold' ? '#FFF8D8' : wax === 'black' ? '#8A8690' : '#FF8A98';
  const device = (dx: number, dy: number, col: string, op: number) => (
    <G transform={`translate(${dx} ${dy})`} opacity={op}>
      {glyph === 'eye' ? (
        <G transform="translate(22 22) scale(0.56)">
          <Path d={p.rays} stroke={col} strokeWidth={2.4} strokeLinecap="round" />
          <Path d={p.body} fill="none" stroke={col} strokeWidth={3} />
          <Path d={p.steps} stroke={col} strokeWidth={2} />
          <Path d={p.cap} fill="none" stroke={col} strokeWidth={3} />
          <Path d={p.eye} fill="none" stroke={col} strokeWidth={2.4} />
          <Circle cx={50} cy={31} r={4.5} fill={col} />
        </G>
      ) : (
        <SvgText x={50} y={63} fontSize={36} fontFamily={fonts.displayHeavy} textAnchor="middle" fill={col}>{glyph}</SvgText>
      )}
    </G>
  );
  return (
    <View style={{width: size, height: size}} accessible={!!label} accessibilityLabel={label}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${id}w`} cx="0.36" cy="0.3" r="0.8" fx="0.36" fy="0.3"><Stop offset="0" stopColor={c[0]} /><Stop offset="0.35" stopColor={c[1]} /><Stop offset="0.8" stopColor={c[2]} /><Stop offset="1" stopColor={c[3]} /></RadialGradient>
          <RadialGradient id={`${id}d`} cx="0.6" cy="0.65" r="0.6"><Stop offset="0" stopColor={c[2]} /><Stop offset="1" stopColor={c[1]} /></RadialGradient>
          <MetalGradient id={`${id}g`} metal="goldLeaf" />
        </Defs>
        <Path d={outline} fill="#000" opacity={0.45} transform="translate(1.5 2.5)" />
        <Path d={outline} fill={`url(#${id}w)`} />
        {/* pressed well */}
        <Circle cx={50} cy={50} r={33} fill={`url(#${id}d)`} />
        <Circle cx={50} cy={50} r={33} fill="none" stroke={dark} strokeOpacity={0.55} strokeWidth={2.2} />
        <Circle cx={50.6} cy={51} r={34.6} fill="none" stroke={hi} strokeOpacity={0.35} strokeWidth={1} />
        <Circle cx={50} cy={50} r={29} fill="none" stroke={hi} strokeOpacity={0.25} strokeWidth={0.6} strokeDasharray="1.2 2.2" />
        {/* embossed device: shadow, highlight, face */}
        {device(1, 1.2, dark, 0.55)}
        {device(-0.7, -0.8, hi, 0.45)}
        {device(0, 0, c[1], 1)}
        {/* specular */}
        <Path d="M24 30 Q34 16 52 14" fill="none" stroke="#FFF" strokeOpacity={0.35} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
