// Engraved brass plate — a room number on a door, a nameplate on a banquette, a box number on a safe
// deposit drawer. Bevelled edge, brushed face, slotted screws, letters cut into the metal.
import {useMemo} from 'react';
import {View} from 'react-native';
import Svg, {Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText} from 'react-native-svg';
import {continental as Cn, fonts, type Metal} from '@/lib/deco';
import {MetalGradient, brushed, useSvgId} from './util';

type Props = {
  /** Main engraving, e.g. "No. 07" or a name. */
  text: string;
  /** Small engraved caps above the main line. */
  caption?: string;
  width?: number;
  height?: number;
  metal?: Metal;
  /** Black enamel fill with gilt letters instead of letters cut into bare metal. */
  enamel?: boolean;
  screws?: boolean;
  font?: 'caps' | 'display';
};

export function Plate({text, caption, width = 128, height = 44, metal = 'brass', enamel, screws = true, font = 'caps'}: Props) {
  const id = useSvgId('pl');
  const bands = useMemo(() => brushed(width, height, width + height), [width, height]);
  const r = Math.min(6, height * 0.16);
  const inset = 3.2;
  const pad = screws ? height * 0.42 : 6;
  const fsMain = Math.min(height * (caption ? 0.38 : 0.44), (width - pad * 2) / Math.max(1, text.length * (font === 'caps' ? 0.92 : 0.6)));
  const fsCap = Math.min(height * 0.17, (width - pad * 2) / Math.max(1, (caption?.length ?? 1) * 1.05));
  const yMain = caption ? height * 0.74 : height / 2 + fsMain * 0.36;
  const letter = font === 'caps' ? fonts.capsBold : fonts.displayHeavy;
  const track = font === 'caps' ? fsMain * 0.22 : 0;
  const cut = enamel ? `url(#${id}g)` : Cn.engrave;
  return (
    <View style={{width, height}} accessible accessibilityLabel={caption ? `${caption} ${text}` : text}>
      <Svg width={width} height={height}>
        <Defs>
          <MetalGradient id={`${id}o`} metal={metal} />
          <MetalGradient id={`${id}i`} metal={metal} reverse />
          <MetalGradient id={`${id}g`} metal="goldLeaf" x1="0" y1="0" x2="0.2" y2="1" />
          <LinearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000" stopOpacity={0.18} /><Stop offset="0.3" stopColor="#FFF" stopOpacity={0.18} /><Stop offset="0.55" stopColor="#000" stopOpacity={0} /><Stop offset="1" stopColor="#000" stopOpacity={0.22} />
          </LinearGradient>
          <RadialGradient id={`${id}s`} cx="0.35" cy="0.3" r="0.8"><Stop offset="0" stopColor="#FFF4D0" /><Stop offset="0.5" stopColor="#B08A3E" /><Stop offset="1" stopColor="#3A2A10" /></RadialGradient>
          <LinearGradient id={`${id}e`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#1A1418" /><Stop offset="1" stopColor="#050405" /></LinearGradient>
        </Defs>
        {/* drop shadow on the wall */}
        <Rect x={1} y={2} width={width - 2} height={height - 2} rx={r} fill="#000" opacity={0.5} />
        {/* bevel: outer polished, inner reversed so the chamfer reads */}
        <Rect x={0} y={0} width={width} height={height - 1.5} rx={r} fill={`url(#${id}o)`} />
        <Rect x={inset * 0.5} y={inset * 0.5} width={width - inset} height={height - 1.5 - inset} rx={r * 0.8} fill={`url(#${id}i)`} />
        {enamel ? (
          <Rect x={inset} y={inset} width={width - inset * 2} height={height - 1.5 - inset * 2} rx={r * 0.6} fill={`url(#${id}e)`} />
        ) : (
          <G>
            <Rect x={inset} y={inset} width={width - inset * 2} height={height - 1.5 - inset * 2} rx={r * 0.6} fill={`url(#${id}o)`} />
            <Path d={bands[0]} stroke="#FFF" strokeOpacity={0.25} strokeWidth={0.4} />
            <Path d={bands[1]} stroke="#000" strokeOpacity={0.12} strokeWidth={0.4} />
            <Rect x={inset} y={inset} width={width - inset * 2} height={height - 1.5 - inset * 2} rx={r * 0.6} fill={`url(#${id}f)`} />
          </G>
        )}
        <Rect x={inset + 2.5} y={inset + 2.5} width={width - inset * 2 - 5} height={height - 1.5 - inset * 2 - 5} rx={r * 0.4} fill="none" stroke={enamel ? '#C9A961' : Cn.engrave} strokeOpacity={enamel ? 0.6 : 0.35} strokeWidth={0.6} />
        {screws ? [height * 0.28, width - height * 0.28].map((x, i) => (
          <G key={x}>
            <Circle cx={x} cy={(height - 1.5) / 2} r={height * 0.085 + 0.6} fill="#000" opacity={0.45} />
            <Circle cx={x} cy={(height - 1.5) / 2} r={height * 0.085} fill={`url(#${id}s)`} />
            <Path d={`M${x - height * 0.07} ${(height - 1.5) / 2} L${x + height * 0.07} ${(height - 1.5) / 2}`} stroke="#2A1C0E" strokeWidth={1} transform={`rotate(${i ? 38 : -22} ${x} ${(height - 1.5) / 2})`} />
          </G>
        )) : null}
        {caption ? (
          <>
            {!enamel ? <SvgText x={width / 2 + fsCap * 0.17} y={height * 0.36 + 0.7} fontSize={fsCap} letterSpacing={fsCap * 0.35} fontFamily={fonts.label} textAnchor="middle" fill="#FFF8E0" fillOpacity={0.55}>{caption.toUpperCase()}</SvgText> : null}
            <SvgText x={width / 2 + fsCap * 0.17} y={height * 0.36} fontSize={fsCap} letterSpacing={fsCap * 0.35} fontFamily={fonts.label} textAnchor="middle" fill={cut} fillOpacity={enamel ? 0.9 : 0.8}>{caption.toUpperCase()}</SvgText>
          </>
        ) : null}
        {!enamel ? <SvgText x={width / 2 + track / 2} y={yMain + 0.8} fontSize={fsMain} letterSpacing={track} fontFamily={letter} textAnchor="middle" fill="#FFF8E0" fillOpacity={0.6}>{text}</SvgText> : null}
        <SvgText x={width / 2 + track / 2} y={yMain} fontSize={fsMain} letterSpacing={track} fontFamily={letter} textAnchor="middle" fill={cut}>{text}</SvgText>
      </Svg>
    </View>
  );
}
