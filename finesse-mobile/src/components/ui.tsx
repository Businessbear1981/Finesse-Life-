import type { ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, goldGradient } from '../theme';

type BtnProps = { label: string; onPress?: () => void; disabled?: boolean; color?: string; gold?: boolean; style?: ViewStyle };

/** Flush-left label, arrow right. Gold gradient or a solid side colour. */
export function CTA({ label, onPress, disabled, color = C.her, gold, style }: BtnProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={({ pressed }) => [s.cta, { backgroundColor: gold ? undefined : color, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}>
      {gold && <LinearGradient colors={goldGradient} style={StyleSheet.absoluteFill} />}
      <Text style={s.ctaText}>{label}</Text>
      <Text style={s.arrow}>→</Text>
    </Pressable>
  );
}

/** The guest-register sheet used through check-in. */
export function Parchment({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <View style={s.frame}>
      <LinearGradient colors={[C.parchment, C.parchmentLo]} style={s.sheet}>
        <View style={s.head}>
          <Text style={s.headTitle}>{title}</Text>
          {meta ? <Text style={s.headMeta}>{meta}</Text> : null}
        </View>
        {children}
      </LinearGradient>
    </View>
  );
}

export function Label({ children, color = C.gold }: { children: ReactNode; color?: string }) {
  return <Text style={[s.label, { color }]}>{children}</Text>;
}

export function Seg<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o, i) => (
        <Pressable key={o} onPress={() => onChange(o)} accessibilityRole="button" accessibilityState={{ selected: o === value }}
          style={[s.segOpt, i > 0 && { borderLeftWidth: 1, borderLeftColor: C.brass }, o === value && { backgroundColor: C.gold }]}>
          <Text style={[s.segText, o === value && { color: '#140E08', fontFamily: F.sansBold }]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  cta: { minHeight: 58, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  ctaText: { fontFamily: F.caps, fontSize: 14, letterSpacing: 3.6, color: '#140508' },
  arrow: { fontFamily: F.sans, fontSize: 20, color: '#140508' },
  frame: { flex: 1, borderWidth: 2, borderColor: C.brass, padding: 4, backgroundColor: C.ink },
  sheet: { flex: 1, padding: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: C.parchmentInk },
  headTitle: { fontFamily: F.caps, fontSize: 12, letterSpacing: 3.6, color: C.parchmentInk },
  headMeta: { fontFamily: F.mono, fontSize: 10, color: C.oxblood },
  label: { fontFamily: F.caps, fontSize: 11, letterSpacing: 3 },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.brass },
  segOpt: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: F.sans, fontSize: 13, color: C.cream },
});
