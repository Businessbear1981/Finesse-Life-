// Small building blocks shared by the room interiors — After Hours skin (APIs unchanged).
import type {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {deco, fonts} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';

export function Segmented<T extends string>({options, value, onChange}: {options: Array<[T, string]>; value: T; onChange: (v: T) => void}) {
  return (
    <View style={s.seg}>
      {options.map(([k, label]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{selected: on}}
            style={[s.segItem, {backgroundColor: on ? ah.white : 'transparent'}]}>
            <Text numberOfLines={1} style={[s.segText, options.length >= 4 && {fontSize: 12}, {color: on ? '#000' : ah.mute, textAlign: 'center'}]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Wrapping chip row (selected = solid white pill, or the accent when given). */
export function Chips<T extends string>({options, value, onChange, accent}: {options: T[]; value: T; onChange: (v: T) => void; accent?: string}) {
  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} accessibilityRole="button" accessibilityState={{selected: on}}
            style={{minHeight: 38, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: on ? (accent ?? ah.white) : ah.line2, backgroundColor: on ? (accent ?? ah.white) : 'transparent'}}>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13, color: on ? '#000' : ah.text}}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Monogram stand-in for a member photo until real portraits are uploaded. */
export function Monogram({name, size = 44, ring = ah.rose, fill = '#1B1B1F'}: {name: string; size?: number; ring?: string; fill?: string}) {
  return (
    <View style={{width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: ring, backgroundColor: fill, alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{fontFamily: ahFonts.serifItalic, fontSize: size * 0.46, color: ah.text}}>{name.slice(0, 1)}</Text>
    </View>
  );
}

/** Primary action: a full-width pill with an arrow. `color` tints it (white by default). */
export function ActionBar({label, onPress, color, disabled}: {label: string; onPress?: () => void; color: string; disabled?: boolean}) {
  const bg = color === deco.pink || color === ah.rose ? ah.rose : ah.white;
  const fg = bg === ah.rose ? '#2A1014' : '#000';
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => [s.cta, {backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.88 : 1, transform: [{scale: pressed ? 0.985 : 1}]}]}>
      <Text style={[s.ctaText, {color: fg}]}>{sentence(label)}</Text>
      <Text style={[s.ctaText, {color: fg, fontSize: 18}]}>→</Text>
    </Pressable>
  );
}

/** Rooms pass SHOUTED labels; After Hours speaks in sentence case. */
export function sentence(label: string) {
  if (label !== label.toUpperCase()) return label;
  const lower = label.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function SectionHead({children}: {children: ReactNode}) {
  return <Text style={s.section}>{children}</Text>;
}

export function SampleNote({children}: {children: ReactNode}) {
  return <Text style={s.sample}>{children}</Text>;
}

export const s = StyleSheet.create({
  seg: {flexDirection: 'row', padding: 4, borderRadius: 999, borderWidth: 1, borderColor: ah.line2, backgroundColor: ah.ink2, gap: 4},
  segItem: {flex: 1, minHeight: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6},
  segText: {fontFamily: ahFonts.sansSemi, fontSize: 13},
  cta: {minHeight: 52, paddingHorizontal: 22, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  ctaText: {fontFamily: ahFonts.sansSemi, fontSize: 15},
  section: {fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: ah.mute, marginTop: 4},
  sample: {fontFamily: ahFonts.sansMedium, fontSize: 12, letterSpacing: 0.3, color: ah.faint},
  body: {fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: ah.text},
  small: {fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: ah.mute},
});
