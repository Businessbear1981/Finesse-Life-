// The guest-list key: six slots on a glass card, a blinking caret on the next slot, a status line.
// It only ever shows how many digits are in — never whether any of them is right.
import {useEffect} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {ah, ahFonts, radius} from '@/lib/ah';
import {AHEyebrow} from '@/components/ah';

type Tone = 'idle' | 'error' | 'open';

export function GuestList({digits, active, tone, line, lineTone, onPress, compact}: {
  digits: string; active: boolean; tone: Tone; line: string; lineTone?: 'mute' | 'rose' | 'error'; onPress: () => void; compact?: boolean;
}) {
  const slotH = compact ? 46 : 54;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Opens the keyboard to type the code"
      accessibilityLabel={`Guest list, your key. ${digits.length} of 6 digits entered.`}
      style={{borderRadius: 22, borderWidth: 1, padding: 16, paddingBottom: 14, backgroundColor: 'rgba(18,18,20,0.78)',
        borderColor: tone === 'error' ? 'rgba(255,120,135,0.55)' : tone === 'open' || active ? 'rgba(232,180,160,0.45)' : ah.line}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: ah.line2}}>
        <AHEyebrow color={ah.text}>Guest list · Your key</AHEyebrow>
        <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12, letterSpacing: 1, color: ah.faint}}>{digits.length}/6</Text>
      </View>
      <View style={{flexDirection: 'row', gap: 8, marginTop: 6}}>
        {Array.from({length: 6}).map((_, i) => {
          const d = digits[i];
          const next = active && i === digits.length && tone === 'idle';
          return (
            <View key={i} style={{flex: 1, height: slotH, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1,
              borderColor: tone === 'error' ? '#FF7887' : d ? 'rgba(232,180,160,0.7)' : ah.line2}}>
              {d ? (
                <Animated.Text entering={FadeInDown.duration(220)} style={{fontFamily: ahFonts.serif, fontSize: compact ? 34 : 38, lineHeight: compact ? 40 : 46,
                  color: tone === 'error' ? '#FFC2C8' : ah.white, textShadowColor: 'rgba(242,201,184,0.6)', textShadowRadius: i === digits.length - 1 ? 14 : 0}}>{d}</Animated.Text>
              ) : next ? <Caret h={slotH * 0.48} /> : <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: ah.faint}} />}
            </View>
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={{marginTop: 10, minHeight: 18, fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 18,
        color: lineTone === 'error' ? '#FFB3BB' : lineTone === 'rose' ? ah.rose : ah.mute}}>{line}</Text>
    </Pressable>
  );
}

function Caret({h}: {h: number}) {
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.value =withRepeat(withSequence(withTiming(1, {duration: 500}), withTiming(0, {duration: 0}), withTiming(0, {duration: 500}), withTiming(1, {duration: 0})), -1);
  }, [o, reduce]);
  const st = useAnimatedStyle(() => ({opacity: o.value}));
  return <Animated.View style={[{width: 1.5, height: h, backgroundColor: ah.rose}, st]} />;
}

/** Big, thumb-friendly number pad. The last key opens the door once all six digits are in. */
export function KeyPad({onDigit, onDelete, onOpen, canOpen, disabled, keyH}: {
  onDigit: (d: string) => void; onDelete: () => void; onOpen: () => void; canOpen: boolean; disabled: boolean; keyH: number;
}) {
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['del', '0', 'open']];
  return (
    <View style={{gap: 8}}>
      {rows.map((r, ri) => (
        <View key={ri} style={{flexDirection: 'row', gap: 8}}>
          {r.map((k) => {
            if (k === 'del') {
              return (
                <Key key={k} h={keyH} disabled={disabled} onPress={onDelete} label="Delete last digit" quiet>
                  <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 15, color: ah.mute}}>Delete</Text>
                </Key>
              );
            }
            if (k === 'open') {
              const on = canOpen && !disabled;
              return (
                <Key key={k} h={keyH} disabled={!on} onPress={onOpen} label="Open the door" tone={on ? 'rose' : 'quiet'}>
                  <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: on ? '#2A1014' : ah.faint}}>Open  →</Text>
                </Key>
              );
            }
            return (
              <Key key={k} h={keyH} disabled={disabled} onPress={() => onDigit(k)} label={k}>
                <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 26, color: ah.text}}>{k}</Text>
              </Key>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Key({children, h, onPress, disabled, label, tone, quiet}: {children: React.ReactNode; h: number; onPress: () => void; disabled?: boolean; label: string; tone?: 'rose' | 'quiet'; quiet?: boolean}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => ({
        flex: 1, height: h, minHeight: 44, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center',
        backgroundColor: tone === 'rose' ? (pressed ? ah.blush : ah.rose) : pressed ? 'rgba(232,180,160,0.16)' : quiet || tone === 'quiet' ? 'transparent' : 'rgba(255,255,255,0.05)',
        borderWidth: tone === 'rose' ? 0 : 1, borderColor: pressed ? 'rgba(232,180,160,0.45)' : quiet || tone === 'quiet' ? 'transparent' : ah.line,
        opacity: disabled && tone !== 'quiet' ? 0.45 : 1, transform: [{scale: pressed ? 0.97 : 1}],
      })}
    >
      {children}
    </Pressable>
  );
}

/** Shake used when the door holds (server said no). */
export function useHoldShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({transform: [{translateX: x.value}]}));
  const shake = (reduced: boolean) => {
    if (reduced) return;
    x.value = withSequence(
      withTiming(-9, {duration: 60}), withTiming(8, {duration: 70}), withTiming(-6, {duration: 70}),
      withTiming(4, {duration: 70}), withTiming(0, {duration: 90}),
    );
  };
  return {style, shake};
}

/** Light haptic for a key press. */
export const tick = () => { void Haptics.selectionAsync().catch(() => {}); };
