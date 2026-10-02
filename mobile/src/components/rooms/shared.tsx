// Small building blocks shared by the room interiors (from the Finesse design).
import type {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {deco, fonts} from '@/lib/deco';

export function Segmented<T extends string>({options, value, onChange}: {options: Array<[T, string]>; value: T; onChange: (v: T) => void}) {
  return (
    <View style={s.seg}>
      {options.map(([k, label], i) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{selected: on}}
            style={[s.segItem, {backgroundColor: on ? deco.brassHighlight : 'transparent', borderLeftWidth: i ? 1 : 0}]}>
            <Text style={[s.segText, {color: on ? '#140E08' : deco.cream}]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GoldRule() {
  return (
    <Svg width="100%" height={4}>
      <Defs><LinearGradient id="gr" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={deco.brassMid} stopOpacity={0} /><Stop offset="0.15" stopColor={deco.brassMid} /><Stop offset="0.5" stopColor={deco.brassWhite} /><Stop offset="0.85" stopColor={deco.brassMid} /><Stop offset="1" stopColor={deco.brassMid} stopOpacity={0} /></LinearGradient></Defs>
      <Rect width="100%" height={4} fill="url(#gr)" />
    </Svg>
  );
}

/** Polished gold frame (design: linear-gradient 135deg #F0D88A, #8A6A2A 40%, #F6E2A0 60%, #6B5028). */
export function GoldFrame({children, pad = 6, style}: {children: ReactNode; pad?: number; style?: object}) {
  return (
    <View style={[{padding: pad}, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs><LinearGradient id="gf" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassLight} /><Stop offset="0.4" stopColor={deco.brassMid} /><Stop offset="0.6" stopColor="#F6E2A0" /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#gf)" />
      </Svg>
      {children}
    </View>
  );
}

export function ActionBar({label, onPress, color, disabled}: {label: string; onPress?: () => void; color: string; disabled?: boolean}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({pressed}) => [s.cta, {backgroundColor: color, opacity: disabled ? 0.5 : pressed ? 0.85 : 1}]}>
      <Text style={s.ctaText}>{label}</Text><Text style={[s.ctaText, {letterSpacing: 0, fontSize: 16, fontFamily: fonts.body}]}>→</Text>
    </Pressable>
  );
}

export function SectionHead({children}: {children: ReactNode}) {
  return <Text style={s.section}>{children}</Text>;
}

export function SampleNote({children}: {children: ReactNode}) {
  return <Text style={s.sample}>{children}</Text>;
}

export const s = StyleSheet.create({
  seg: {flexDirection: 'row', borderWidth: 2, borderColor: deco.brass},
  segItem: {flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(201,169,97,0.5)'},
  segText: {fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.4},
  cta: {minHeight: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  ctaText: {fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: '#140508'},
  section: {paddingBottom: 6, borderBottomWidth: 2, borderColor: deco.brass, fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2.4, color: deco.brassHighlight},
  sample: {fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.8, color: 'rgba(244,232,208,0.45)'},
  body: {fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: deco.cream},
  small: {fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: 'rgba(244,232,208,0.7)'},
});
