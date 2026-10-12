// The house marker: a heavy gold coin with a reeded edge, a polished rim, an engine-turned field and
// an engraved legend around the border. The face carries one figure (e.g. "12%") and a caption.
import {useMemo} from 'react';
import {View} from 'react-native';
import Svg, {Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText, TextPath} from 'react-native-svg';
import {fonts, metals, polar} from '@/lib/deco';
import {conicRing} from '@/lib/deco';
import {rosettePaths} from './Guilloche';
import {useSvgId} from './util';

const RIM_STOPS: Array<[number, string]> = metals.goldLeaf.map(([o, c]) => [o, c]);

export function Coin({size = 96, value, caption, legend = 'FINESSE · HOUSE MARKER · MMXXVI · ', a11y}: {size?: number; value: string; caption?: string; legend?: string; a11y?: string}) {
  const id = useSvgId('cn');
  const art = useMemo(() => ({
    reed: Array.from({length: 120}, (_, i) => { const a = polar(50, 50, 49.6, i * 3), b = polar(50, 50, 47.6, i * 3); return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} L${b.x.toFixed(2)} ${b.y.toFixed(2)}`; }).join(' '),
    rim: conicRing(50, 50, 47.6, 41.5, RIM_STOPS, 300, 72),
    field: rosettePaths(50, 50, 30, {lobes: 24, curves: 8, depth: 0.22, steps: 240}),
    beads: Array.from({length: 48}, (_, i) => polar(50, 50, 39.6, i * 7.5)),
  }), []);
  const small = value.length > 3;
  return (
    <View style={{width: size, height: size}} accessible accessibilityLabel={a11y ?? `${value} ${caption ?? ''}`}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${id}f`} cx="0.38" cy="0.32" r="0.75" fx="0.38" fy="0.32"><Stop offset="0" stopColor="#FFF2C4" /><Stop offset="0.35" stopColor="#E2BC5C" /><Stop offset="0.75" stopColor="#A57A22" /><Stop offset="1" stopColor="#6E4A10" /></RadialGradient>
          <RadialGradient id={`${id}e`} cx="0.5" cy="0.5" r="0.5"><Stop offset="0.9" stopColor="#3A2606" /><Stop offset="1" stopColor="#1A1002" /></RadialGradient>
          <Path id={`${id}p`} d="M50 50 m-35.2 0 a35.2 35.2 0 1 1 70.4 0 a35.2 35.2 0 1 1 -70.4 0" />
        </Defs>
        <Circle cx={51.2} cy={52.4} r={49.6} fill="#000" opacity={0.5} />
        <Circle cx={50} cy={50} r={49.8} fill={`url(#${id}e)`} />
        <Path d={art.reed} stroke="#E9C46A" strokeWidth={0.9} strokeOpacity={0.85} />
        {art.rim.map((w, i) => <Path key={i} d={w.d} fill={w.fill} />)}
        <Circle cx={50} cy={50} r={41.5} fill={`url(#${id}f)`} />
        <Circle cx={50} cy={50} r={41.3} fill="none" stroke="#5A3C0C" strokeWidth={0.8} />
        {art.beads.map((b, i) => <Circle key={i} cx={b.x} cy={b.y} r={0.55} fill="#5A3C0C" opacity={0.7} />)}
        {/* engraved legend */}
        <SvgText fontSize={5.4} letterSpacing={1.3} fontFamily={fonts.capsBold} fill="#FFF4C8" fillOpacity={0.5} dy={0.4}>
          <TextPath href={`#${id}p`} startOffset="0">{legend + legend.slice(0, Math.max(0, 40 - legend.length))}</TextPath>
        </SvgText>
        <SvgText fontSize={5.4} letterSpacing={1.3} fontFamily={fonts.capsBold} fill="#4A3008">
          <TextPath href={`#${id}p`} startOffset="0">{legend + legend.slice(0, Math.max(0, 40 - legend.length))}</TextPath>
        </SvgText>
        <Circle cx={50} cy={50} r={31.5} fill="none" stroke="#5A3C0C" strokeWidth={0.6} strokeOpacity={0.8} />
        <G opacity={0.32}>{art.field.map((d, i) => <Path key={i} d={d} fill="none" stroke="#5A3C0C" strokeWidth={0.28} />)}</G>
        {/* struck figure: cut shadow + highlight + face */}
        <SvgText x={50.6} y={(caption ? 56 : 59) + 0.9} fontSize={small ? 17 : 21} fontFamily={fonts.displayHeavy} textAnchor="middle" fill="#3A2606" fillOpacity={0.8}>{value}</SvgText>
        <SvgText x={49.6} y={(caption ? 56 : 59) - 0.5} fontSize={small ? 17 : 21} fontFamily={fonts.displayHeavy} textAnchor="middle" fill="#FFF8DC" fillOpacity={0.7}>{value}</SvgText>
        <SvgText x={50} y={caption ? 56 : 59} fontSize={small ? 17 : 21} fontFamily={fonts.displayHeavy} textAnchor="middle" fill="#B88A2E">{value}</SvgText>
        {caption ? <SvgText x={50.6} y={67} fontSize={5} letterSpacing={1.4} fontFamily={fonts.capsBold} textAnchor="middle" fill="#4A3008">{caption.toUpperCase()}</SvgText> : null}
        {/* polish */}
        <Path d="M20 34 A34 34 0 0 1 46 13" fill="none" stroke="#FFF" strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
