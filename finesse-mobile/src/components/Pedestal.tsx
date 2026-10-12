import { View, Text, Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../theme';

/** Plinth with a transparent-PNG cut-out on top. Pass `source` once the PNG exists; until then a dashed slot shows. */
export function Pedestal({ source, label, tint, width = 84 }: { source?: ImageSourcePropType | null; label: string; tint: string; width?: number }) {
  const h = Math.round(width * 1.15);
  return (
    <View accessibilityLabel={label} style={{ width, alignItems: 'center' }}>
      <View style={[s.glow, { width: width * 1.5, height: width * 1.5, backgroundColor: tint }]} />
      <View style={{ width, height: h, alignItems: 'center', justifyContent: 'flex-end' }}>
        {source
          ? <Image source={source} resizeMode="contain" style={{ width, height: h }} />
          : <View style={s.slot}><Text style={s.slotTxt}>{label}</Text></View>}
      </View>
      <LinearGradient colors={['#D9CBA3', '#6E5C3A']} style={{ width: width * 0.9, height: 5 }} />
      <View style={[s.shaft, { width: width * 0.7 }]} />
      <LinearGradient colors={[C.brass, C.brassDark]} style={{ width: width * 0.9, height: 7 }} />
    </View>
  );
}

const s = StyleSheet.create({
  glow: { position: 'absolute', top: -8, borderRadius: 999, opacity: 0.08 },
  slot: { flex: 1, width: '100%', borderWidth: 1, borderStyle: 'dashed', borderColor: C.rule, alignItems: 'center', justifyContent: 'center', padding: 4 },
  slotTxt: { fontFamily: F.deco, fontSize: 8, letterSpacing: 2, color: C.creamMuted, textAlign: 'center' },
  shaft: { height: 30, backgroundColor: '#140E0C', borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.rule },
});
