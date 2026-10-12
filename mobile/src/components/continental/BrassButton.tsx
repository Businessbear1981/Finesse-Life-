// Polished brass button: bevelled edge, brushed face, letters cut into the metal, a slow foil glint.
// `lacquer` is the quieter black-lacquer button with a brass keyline; `selected` turns it to brass.
// Disabled buttons go to dulled gunmetal — still legible, clearly not live.
import {useMemo, useState} from 'react';
import {Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {continental as Cn, deco, fonts, type Metal} from '@/lib/deco';
import {FoilSheen} from './FoilSheen';
import {MetalGradient, brushed, useSvgId} from './util';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'brass' | 'lacquer' | 'oxblood';
  selected?: boolean;
  size?: 'sm' | 'md';
  metal?: Metal;
  arrow?: boolean;
  sheen?: boolean;
  a11y?: string;
  style?: StyleProp<ViewStyle>;
  accent?: string;
};

export function BrassButton({label, onPress, disabled, variant = 'brass', selected, size = 'md', metal = 'brass', arrow = size === 'md', sheen = size === 'md', a11y, style, accent}: Props) {
  const [box, setBox] = useState<{w: number; h: number} | null>(null);
  const id = useSvgId('bb');
  const h = size === 'sm' ? 36 : 52;
  const lit = variant === 'brass' || selected;
  const m: Metal = disabled ? 'gunmetal' : metal;
  const bands = useMemo(() => (box ? brushed(box.w, h, Math.round(box.w)) : ['', '', '']), [box, h]);
  const textColor = disabled ? 'rgba(244,232,208,0.6)' : lit ? Cn.engrave : variant === 'oxblood' ? deco.brassLight : accent ?? deco.brassHighlight;
  const r = size === 'sm' ? 2 : 3;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityState={{disabled: !!disabled, selected: !!selected}}
      onLayout={(e) => { const w = Math.round(e.nativeEvent.layout.width); setBox((b) => (b?.w === w ? b : {w, h})); }}
      style={({pressed}) => [{minHeight: h, justifyContent: 'center', transform: [{scale: pressed ? 0.985 : 1}], opacity: disabled ? 0.72 : 1}, style]}>
      {({pressed}) => (
        <>
          {box ? (
            <View pointerEvents="none" style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}}>
              <Svg width={box.w} height={h}>
                <Defs>
                  <MetalGradient id={`${id}o`} metal={m} x1="0" y1="0" x2="0.25" y2="1" />
                  <MetalGradient id={`${id}i`} metal={m} x1="0" y1="0" x2="0.25" y2="1" reverse />
                  <LinearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={variant === 'oxblood' ? '#5A1222' : '#1E1A20'} /><Stop offset="0.5" stopColor={variant === 'oxblood' ? '#3A0812' : '#0A090B'} /><Stop offset="1" stopColor={variant === 'oxblood' ? '#22040A' : '#020203'} />
                  </LinearGradient>
                  <LinearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#000" stopOpacity={0.28} /><Stop offset="1" stopColor="#000" stopOpacity={0} /></LinearGradient>
                </Defs>
                <Rect x={0} y={1.5} width={box.w} height={h - 1.5} rx={r} fill="#000" opacity={0.55} />
                {lit ? (
                  <>
                    <Rect x={0} y={0} width={box.w} height={h - 1.5} rx={r} fill={`url(#${id}o)`} />
                    <Rect x={2.5} y={2.5} width={box.w - 5} height={h - 6.5} rx={r * 0.6} fill={`url(#${id}i)`} />
                    <Rect x={4} y={4} width={box.w - 8} height={h - 9.5} rx={r * 0.4} fill={`url(#${id}o)`} />
                    <Path d={bands[0]} stroke="#FFF" strokeOpacity={0.1} strokeWidth={0.35} />
                    <Path d={bands[1]} stroke="#000" strokeOpacity={0.06} strokeWidth={0.35} />
                    {pressed ? <Rect x={4} y={4} width={box.w - 8} height={h - 9.5} fill={`url(#${id}p)`} /> : null}
                  </>
                ) : (
                  <>
                    <Rect x={0} y={0} width={box.w} height={h - 1.5} rx={r} fill={`url(#${id}o)`} />
                    <Rect x={1.6} y={1.6} width={box.w - 3.2} height={h - 4.7} rx={r * 0.6} fill={`url(#${id}l)`} />
                    <Rect x={4.5} y={4.5} width={box.w - 9} height={h - 10.5} fill="none" stroke={accent ?? deco.brass} strokeOpacity={0.45} strokeWidth={0.6} />
                    <Path d={`M${box.w * 0.15} 2.2 H${box.w * 0.85}`} stroke="#FFF" strokeOpacity={0.12} />
                    {pressed ? <Rect x={1.6} y={1.6} width={box.w - 3.2} height={h - 4.7} fill="#FFF" opacity={0.05} /> : null}
                  </>
                )}
              </Svg>
            </View>
          ) : null}
          {box && lit && sheen && !disabled ? <FoilSheen period={8000} delay={1400} intensity={0.45} radius={r} /> : null}
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: arrow ? 'space-between' : 'center', paddingHorizontal: size === 'sm' ? 12 : 18, gap: 10}}>
            <Text numberOfLines={2} style={{flexShrink: 1, fontFamily: fonts.capsBold, fontSize: size === 'sm' ? 9 : 11, letterSpacing: size === 'sm' ? 1.6 : 2.6, color: textColor, textAlign: arrow ? 'left' : 'center',
              textShadowColor: lit && !disabled ? 'rgba(255,248,224,0.55)' : 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: lit && !disabled ? 0.8 : 1}, textShadowRadius: 0}}>{label}</Text>
            {arrow ? (
              <Svg width={22} height={10}>
                <Path d="M0 5 H18 M13 1 L18 5 L13 9" fill="none" stroke={textColor} strokeWidth={1.2} />
                <Path d="M2 2 V8" stroke={textColor} strokeWidth={0.8} />
              </Svg>
            ) : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

/** A wrapping row of brass toggles — drop-in for the shared Chips. */
export function BrassToggles<T extends string>({options, value, onChange, accent}: {options: T[]; value: T; onChange: (v: T) => void; accent?: string}) {
  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}} accessibilityRole="radiogroup">
      {options.map((o) => (
        <BrassButton key={o} label={o.toUpperCase()} size="sm" variant="lacquer" selected={o === value} accent={accent} onPress={() => onChange(o)} a11y={o} style={{paddingHorizontal: 0}} />
      ))}
    </View>
  );
}
