// After Hours building blocks for the room interiors (Concierge, Club, Kitchen, Starmaker, Calendar, Market,
// Lifestyle, House, Social). Thin layer over the kit in components/ah — noir cards, white/rose pills,
// serif titles, numbered rows. Nothing here holds data or talks to the server.
import type {ReactNode} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';
import Animated, {LinearTransition} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {Icon} from '@/lib/icons';
import {ah, ahFonts, radius} from '@/lib/ah';

export {ah, ahFonts};

const tap = () => { void Haptics.selectionAsync().catch(() => {}); };

/** Type scale used across the rooms. */
export const t = StyleSheet.create({
  eyebrow: {fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: ah.mute},
  meta: {fontFamily: ahFonts.sansMedium, fontSize: 12, lineHeight: 16, color: ah.mute},
  title: {fontFamily: ahFonts.serif, fontSize: 22, lineHeight: 25, color: ah.text, letterSpacing: -0.2},
  titleI: {fontFamily: ahFonts.serifItalic, fontSize: 22, lineHeight: 26, color: ah.text},
  name: {fontFamily: ahFonts.sansSemi, fontSize: 15, lineHeight: 20, color: ah.text},
  body: {fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.text},
  small: {fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: ah.mute},
  num: {fontFamily: ahFonts.sansSemi, fontSize: 15, color: ah.text, fontVariant: ['tabular-nums']},
  big: {fontFamily: ahFonts.serif, fontSize: 44, lineHeight: 46, color: ah.text, letterSpacing: -0.8},
  voice: {fontFamily: ahFonts.serifItalic, fontSize: 22, lineHeight: 28, color: ah.text},
});

/** Eyebrow with an optional right-hand action/meta. */
export function Head({children, right, style}: {children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle>}) {
  return (
    <View style={[{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10}, style]}>
      <Text style={[t.eyebrow, {flexShrink: 1}]}>{children}</Text>
      {typeof right === 'string' ? <Text style={t.meta}>{right}</Text> : right}
    </View>
  );
}

/** Horizontally scrolling tab pills (selected = solid white). */
export function TabStrip<K extends string>({tabs, value, onChange}: {tabs: Array<[K, string, string?]>; value: K; onChange: (k: K) => void}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingRight: 8}} style={{marginHorizontal: -2}}>
      {tabs.map(([k, label, icon]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => { tap(); onChange(k); }} accessibilityRole="tab" accessibilityState={{selected: on}} accessibilityLabel={label}
            style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill,
              backgroundColor: on ? ah.white : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: on ? ah.white : ah.line, opacity: pressed ? 0.85 : 1})}>
            {icon ? <Icon name={icon} size={15} color={on ? '#000' : ah.mute} /> : null}
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: on ? '#000' : ah.text}}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Small toggle/selection pill. `on` fills it (white, or rose with `rose`). */
export function Pick({label, on, onPress, rose, disabled, a11y, flex, style, role = 'button'}: {
  label: string; on?: boolean; onPress?: () => void; rose?: boolean; disabled?: boolean; a11y?: string; flex?: boolean; style?: StyleProp<ViewStyle>; role?: 'button' | 'switch' | 'checkbox' | 'tab';
}) {
  const fill = rose ? ah.rose : ah.white;
  return (
    <Pressable onPress={() => { if (disabled) return; tap(); onPress?.(); }} disabled={disabled} accessibilityRole={role} accessibilityLabel={a11y ?? label}
      accessibilityState={role === 'switch' || role === 'checkbox' ? {checked: !!on, disabled: !!disabled} : {selected: !!on, disabled: !!disabled}}
      style={({pressed}) => [{minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: on ? fill : ah.line2, backgroundColor: on ? fill : 'transparent', opacity: disabled ? 0.4 : pressed ? 0.8 : 1}, flex && {flex: 1}, style]}>
      <Text numberOfLines={1} style={{fontFamily: ahFonts.sansSemi, fontSize: 13.5, color: on ? (rose ? '#2A1014' : '#000') : ah.text, textAlign: 'center'}}>{label}</Text>
    </Pressable>
  );
}

/** Quiet text action (Save, Watch, Skip…) with a full 44pt target. */
export function TextBtn({label, onPress, on, a11y, tone}: {label: string; onPress: () => void; on?: boolean; a11y?: string; tone?: string}) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityState={{selected: !!on}}
      style={({pressed}) => ({minHeight: 44, minWidth: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1})}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13, color: tone ?? (on ? ah.rose : ah.text)}}>{label}</Text>
    </Pressable>
  );
}

/** Uppercase status tag. */
export function Tag({children, tone = ah.mute, fill}: {children: ReactNode; tone?: string; fill?: boolean}) {
  return (
    <View style={{alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: fill ? tone : 'rgba(255,255,255,0.07)'}}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: fill ? '#000' : tone}}>{children}</Text>
    </View>
  );
}

/** Thin progress line. */
export function Meter({pct, tone = ah.rose, h = 4}: {pct: number; tone?: string; h?: number}) {
  return (
    <View style={{height: h, borderRadius: h, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden'}} accessibilityRole="progressbar" accessibilityValue={{min: 0, max: 100, now: Math.round(pct)}}>
      <Animated.View layout={LinearTransition.duration(400)} style={{height: h, borderRadius: h, width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: tone}} />
    </View>
  );
}

/** Rounded icon tile (product / listing stand-in until real photos exist). */
export function Tile({icon, size = 52, tone = ah.text, round}: {icon: string; size?: number; tone?: string; round?: boolean}) {
  return (
    <View style={{width: size, height: size, borderRadius: round ? size / 2 : 16, backgroundColor: ah.ink3, borderWidth: 1, borderColor: ah.line, alignItems: 'center', justifyContent: 'center'}}>
      <Icon name={icon} size={Math.round(size * 0.4)} color={tone} strokeWidth={1.4} />
    </View>
  );
}

/** List row with a hairline under it. */
export function Row({children, last, style}: {children: ReactNode; last?: boolean; style?: StyleProp<ViewStyle>}) {
  return <View style={[{flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderColor: ah.line}, style]}>{children}</View>;
}

/** Two-digit index used for numbered lists. */
export function Num({n, on}: {n: number; on?: boolean}) {
  return <Text style={{width: 24, fontFamily: ahFonts.sansSemi, fontSize: 12, color: on ? ah.rose : ah.faint, fontVariant: ['tabular-nums']}}>{String(n).padStart(2, '0')}</Text>;
}

/** Round 44pt icon/text button. */
export function Round({label, a11y, onPress, solid, size = 44, disabled}: {label: string; a11y: string; onPress: () => void; solid?: boolean; size?: number; disabled?: boolean}) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y}
      style={({pressed}) => ({width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: solid ? ah.white : ah.line2,
        backgroundColor: solid ? ah.white : 'transparent', opacity: disabled ? 0.35 : pressed ? 0.75 : 1})}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 16, color: solid ? '#000' : ah.text}}>{label}</Text>
    </Pressable>
  );
}

/** Honest fine print under a section (not the sample label — that stays SampleNote). */
export function Fine({children, style}: {children: ReactNode; style?: StyleProp<TextStyle>}) {
  return <Text style={[t.small, style]}>{children}</Text>;
}

/** Vertical timeline item (dot + line). */
export function Step({last, on, tone = ah.rose, children}: {last?: boolean; on?: boolean; tone?: string; children: ReactNode}) {
  return (
    <View style={{flexDirection: 'row', gap: 14}}>
      <View style={{alignItems: 'center', width: 12}}>
        <View style={{width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: on === false ? 'transparent' : tone, borderWidth: 1.5, borderColor: tone}} />
        {!last ? <View style={{flex: 1, width: 1, marginTop: 4, backgroundColor: ah.line2}} /> : null}
      </View>
      <View style={{flex: 1, paddingBottom: last ? 0 : 18}}>{children}</View>
    </View>
  );
}
