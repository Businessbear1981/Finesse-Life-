// After Hours kit for React Native (mirrors web src/components/after-hours). See docs/DESIGN_AFTER_HOURS.md.
import {useEffect, useId, useState, type ReactNode} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, RadialGradient, Rect, Stop, Text as SvgText} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {ah, ahFonts, chromeStops, radius, roseStops} from '@/lib/ah';

const svgId = (raw: string, p: string) => `${p}${raw.replace(/[^a-zA-Z0-9]/g, '')}`;

/** Soft rose light at the top of a screen. */
export function AHGlow({height = 460, tone = 'rose'}: {height?: number; tone?: 'rose' | 'city'}) {
  const id = svgId(useId(), 'g');
  const [a, b] = tone === 'city' ? ['#00C8FF', '#FF2EA0'] : [ah.rose2, ah.platinum];
  return (
    <Svg pointerEvents="none" style={[StyleSheet.absoluteFill, {height}]} width="100%" height={height}>
      <Defs>
        <RadialGradient id={`${id}a`} cx="0.85" cy="0" r="0.75"><Stop offset="0" stopColor={a} stopOpacity={0.24} /><Stop offset="1" stopColor={a} stopOpacity={0} /></RadialGradient>
        <RadialGradient id={`${id}b`} cx="0" cy="0.1" r="0.5"><Stop offset="0" stopColor={b} stopOpacity={0.08} /><Stop offset="1" stopColor={b} stopOpacity={0} /></RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id}a)`} />
      <Rect width="100%" height="100%" fill={`url(#${id}b)`} />
    </Svg>
  );
}

/** Screen shell: noir ground, safe areas, glow, scroll. */
export function AHScreen({children, scroll = true, glow = true, pad = 20, bottom = 120, style}: {children: ReactNode; scroll?: boolean; glow?: boolean; pad?: number; bottom?: number; style?: StyleProp<ViewStyle>}) {
  const insets = useSafeAreaInsets();
  const inner = <View style={[{paddingHorizontal: pad, paddingTop: insets.top + 16, paddingBottom: insets.bottom + bottom, width: '100%', maxWidth: 560, alignSelf: 'center'}, style]}>{children}</View>;
  return (
    <View style={{flex: 1, backgroundColor: ah.ink}}>
      {glow && <AHGlow />}
      {scroll ? <ScrollView contentContainerStyle={{flexGrow: 1}} showsVerticalScrollIndicator={false}>{inner}</ScrollView> : inner}
    </View>
  );
}

/** Chrome wordmark. */
export function AHMark({label = 'FINESSE', size = 12}: {label?: string; size?: number}) {
  return <Text style={{fontFamily: ahFonts.sansBold, fontSize: size, letterSpacing: size * 0.42, color: ah.text}}>{label}</Text>;
}

export function AHTopBar({left, right}: {left?: ReactNode; right?: ReactNode}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26, minHeight: 44}}>
      {left ?? <AHMark />}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>{right}</View>
    </View>
  );
}

export function AHEyebrow({children, style, color = ah.mute}: {children: ReactNode; style?: StyleProp<TextStyle>; color?: string}) {
  return <Text style={[{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color}, style]}>{children}</Text>;
}

/**
 * Chrome serif-italic headline (SVG gradient text). One line; size it to fit.
 * `rose` switches to the rose-gold gradient.
 */
export function AHDisplay({children, size = 56, rose, style, accessibilityRole = 'header'}: {children: string; size?: number; rose?: boolean; style?: StyleProp<ViewStyle>; accessibilityRole?: 'header' | 'text'}) {
  const id = svgId(useId(), 'd');
  const h = Math.round(size * 1.12);
  const stops = rose ? roseStops : chromeStops;
  return (
    <View style={style} accessible accessibilityRole={accessibilityRole} accessibilityLabel={children}>
      <Svg width="100%" height={h} accessibilityElementsHidden>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2={rose ? '1' : '0'} y2={rose ? '0' : '1'}>
            {stops.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}
          </LinearGradient>
        </Defs>
        <SvgText x={2} y={size * 0.88} fill={`url(#${id})`} fontFamily={ahFonts.serifItalic} fontSize={size} letterSpacing={-size * 0.02}>{children}</SvgText>
      </Svg>
    </View>
  );
}

/** Serif headline that wraps (solid colour) — for long titles. */
export function AHTitle({children, size = 40, italic = true, color = ah.text, style}: {children: ReactNode; size?: number; italic?: boolean; color?: string; style?: StyleProp<TextStyle>}) {
  return <Text accessibilityRole="header" style={[{fontFamily: italic ? ahFonts.serifItalic : ahFonts.serif, fontSize: size, lineHeight: size * 1.02, color, letterSpacing: -size * 0.015}, style]}>{children}</Text>;
}

export function AHBody({children, style, mute}: {children: ReactNode; style?: StyleProp<TextStyle>; mute?: boolean}) {
  return <Text style={[{fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: mute ? ah.mute : ah.text}, style]}>{children}</Text>;
}

export function AHSection({title, action, children, style}: {title: ReactNode; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle>}) {
  return (
    <View style={[{marginTop: 32}, style]}>
      <View style={{flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14}}>
        <AHEyebrow>{title}</AHEyebrow>
        {action}
      </View>
      {children}
    </View>
  );
}

type PillVariant = 'solid' | 'rose' | 'ghost';
export function AHPill({label, onPress, variant = 'solid', block, disabled, small, icon, accessibilityLabel, style}: {
  label: string; onPress?: () => void; variant?: PillVariant; block?: boolean; disabled?: boolean; small?: boolean; icon?: ReactNode; accessibilityLabel?: string; style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'solid' ? ah.white : variant === 'rose' ? ah.rose : 'transparent';
  const fg = variant === 'ghost' ? ah.text : variant === 'rose' ? '#2A1014' : '#000';
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        void Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => [{
        minHeight: small ? 38 : 48, paddingHorizontal: small ? 16 : 22, borderRadius: radius.pill, backgroundColor: bg,
        borderWidth: variant === 'ghost' ? 1 : 0, borderColor: ah.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        alignSelf: block ? 'stretch' : 'flex-start', opacity: disabled ? 0.45 : 1, transform: [{scale: pressed ? 0.98 : 1}],
      }, style]}
    >
      {icon}
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: small ? 13 : 15, color: fg}}>{label}</Text>
    </Pressable>
  );
}

export function AHLiveDot({color = ah.rose, pulse = true, size = 7}: {color?: string; pulse?: boolean; size?: number}) {
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (pulse && !reduce) o.value = withRepeat(withSequence(withTiming(0.3, {duration: 800}), withTiming(1, {duration: 800})), -1);
  }, [pulse, reduce, o]);
  const st = useAnimatedStyle(() => ({opacity: o.value}));
  return <Animated.View style={[{width: size, height: size, borderRadius: size, backgroundColor: color, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: {width: 0, height: 0}}, st]} />;
}

export function AHChip({label, live, tone = 'glass', style}: {label: string; live?: boolean; tone?: 'glass' | 'rose' | 'outline'; style?: StyleProp<ViewStyle>}) {
  return (
    <View style={[{flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
      backgroundColor: tone === 'glass' ? 'rgba(255,255,255,0.1)' : tone === 'rose' ? 'rgba(232,180,160,0.16)' : 'transparent',
      borderWidth: tone === 'outline' ? 1 : 0, borderColor: ah.line2}, style]}>
      {live && <AHLiveDot />}
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: tone === 'rose' ? ah.blush : ah.text}}>{label}</Text>
    </View>
  );
}

export function AHCard({children, style, glass, pad = 20}: {children: ReactNode; style?: StyleProp<ViewStyle>; glass?: boolean; pad?: number}) {
  return <View style={[{borderRadius: radius.card, backgroundColor: glass ? 'rgba(22,22,24,0.78)' : ah.ink2, borderWidth: 1, borderColor: ah.line, padding: pad, overflow: 'hidden'}, style]}>{children}</View>;
}

/** Hero card with smoky rose (or neon-city) light; content anchored to the bottom. */
export function AHSmoke({children, tone = 'rose', aspect = 1 / 1.05, top, style}: {children: ReactNode; tone?: 'rose' | 'city'; aspect?: number; top?: ReactNode; style?: StyleProp<ViewStyle>}) {
  const id = svgId(useId(), 's');
  const c = tone === 'city'
    ? [['#00C8FF', 0.45, '0.75', '0.2'], ['#FF2EA0', 0.4, '0.15', '0.8'], ['#E6FF00', 0.18, '0.85', '0.85']] as const
    : [['#B76E79', 0.85, '0.7', '0.25'], ['#8E4B55', 0.9, '0.2', '0.7'], ['#B9BCC2', 0.35, '0.85', '0.85']] as const;
  return (
    <View style={[{borderRadius: radius.hero, overflow: 'hidden', borderWidth: 1, borderColor: ah.line, aspectRatio: aspect, backgroundColor: tone === 'city' ? '#03070D' : '#0B0708'}, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          {c.map(([col, op, cx, cy], i) => (
            <RadialGradient key={i} id={`${id}${i}`} cx={cx} cy={cy} r="0.6"><Stop offset="0" stopColor={col} stopOpacity={op} /><Stop offset="1" stopColor={col} stopOpacity={0} /></RadialGradient>
          ))}
          <LinearGradient id={`${id}sh`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0.3" stopColor="#000" stopOpacity={0} /><Stop offset="1" stopColor="#000" stopOpacity={0.78} /></LinearGradient>
        </Defs>
        {c.map((_, i) => <Rect key={i} width="100%" height="100%" fill={`url(#${id}${i})`} />)}
        <Rect width="100%" height="100%" fill={`url(#${id}sh)`} />
      </Svg>
      {top && <View style={{position: 'absolute', top: 18, left: 18, right: 18}}>{top}</View>}
      <View style={{position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22}}>{children}</View>
    </View>
  );
}

/** Avatar in a chrome/rose story ring. */
export function AHRing({name, size = 60, label = true, quiet, onPress}: {name: string; size?: number; label?: boolean; quiet?: boolean; onPress?: () => void}) {
  const id = svgId(useId(), 'r');
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '·';
  const ring = (
    <View style={{width: size, height: size}}>
      <Svg style={StyleSheet.absoluteFill} width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F4F4F2" /><Stop offset="0.35" stopColor={ah.rose2} /><Stop offset="0.65" stopColor={ah.rose} /><Stop offset="1" stopColor="#8E9298" /></LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={size / 2} fill={quiet ? '#26262B' : `url(#${id})`} />
      </Svg>
      <View style={{position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, borderRadius: size, borderWidth: 3, borderColor: ah.ink, backgroundColor: '#1B1B1F', alignItems: 'center', justifyContent: 'center'}}>
        <Text style={{fontFamily: ahFonts.sansBold, fontSize: size * 0.24, color: ah.white}}>{initials}</Text>
      </View>
    </View>
  );
  return (
    <View style={{width: size, alignItems: 'center'}}>
      {onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>{ring}</Pressable> : ring}
      {label && <Text numberOfLines={1} style={{marginTop: 6, maxWidth: size + 8, fontFamily: ahFonts.sans, fontSize: 11, color: ah.mute}}>{name}</Text>}
    </View>
  );
}

export type AHIndexItem = {key: string; name: string; sub?: string; tag?: string; tagTone?: 'live' | 'key'; number?: number; onPress?: () => void};

/** Numbered editorial index (rooms, menus). */
export function AHIndex({items}: {items: AHIndexItem[]}) {
  return (
    <View>
      {items.map((it, i) => (
        <Pressable key={it.key} onPress={it.onPress} accessibilityRole="button" accessibilityLabel={`${it.name}${it.sub ? `, ${it.sub}` : ''}`}
          style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 13, borderBottomWidth: 1, borderColor: ah.line, opacity: pressed ? 0.7 : 1})}>
          <Text style={{width: 26, fontFamily: ahFonts.sansSemi, fontSize: 11, color: ah.faint}}>{String(it.number ?? i + 1).padStart(2, '0')}</Text>
          <View style={{flex: 1}}>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 24, lineHeight: 26, color: ah.text}}>{it.name}</Text>
            {it.sub ? <Text style={{marginTop: 2, fontFamily: ahFonts.sans, fontSize: 12, color: ah.mute}}>{it.sub}</Text> : null}
          </View>
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: it.tagTone === 'live' ? ah.ok : it.tagTone === 'key' ? ah.rose : ah.mute}}>{it.tag ?? '→'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export type Finish = 'nano_black' | 'platinum' | 'rose_gold';
export const FINISHES: Record<Finish, {label: string; stops: [string, string, string, string]; ink: string; inkSoft: string; glow: string}> = {
  nano_black: {label: 'Nano Black', stops: ['#2B2B2E', '#0B0B0D', '#1C1C1F', '#050506'], ink: 'rgba(232,230,224,0.92)', inkSoft: 'rgba(232,230,224,0.45)', glow: 'rgba(183,110,121,0.2)'},
  platinum: {label: 'Platinum', stops: ['#F4F4F2', '#B9BCC2', '#E6E7E9', '#8E9298'], ink: 'rgba(26,28,32,0.88)', inkSoft: 'rgba(26,28,32,0.45)', glow: 'rgba(185,188,194,0.28)'},
  rose_gold: {label: 'Rose Gold', stops: ['#F2C9B8', '#B76E79', '#E8B4A0', '#8E4B55'], ink: 'rgba(42,16,20,0.88)', inkSoft: 'rgba(42,16,20,0.45)', glow: 'rgba(183,110,121,0.4)'},
};
export const isFinish = (v: unknown): v is Finish => v === 'nano_black' || v === 'platinum' || v === 'rose_gold';

/** The Finesse card in the member's finish. */
export function AHMemberCard({finish, big, label, right, holder, style}: {finish: Finish; big?: ReactNode; label?: string; right?: string; holder?: string; style?: StyleProp<ViewStyle>}) {
  const id = svgId(useId(), 'c');
  const f = FINISHES[finish];
  return (
    <View style={[{aspectRatio: 1.586, borderRadius: 20, overflow: 'hidden', padding: 20, justifyContent: 'space-between',
      shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 30, shadowOffset: {width: 0, height: 24}, elevation: 12}, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{f.stops.map((c, i) => <Stop key={i} offset={[0, 0.38, 0.68, 1][i]} stopColor={c} />)}</LinearGradient>
          <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0.6"><Stop offset="0.35" stopColor="#fff" stopOpacity={0} /><Stop offset="0.48" stopColor="#fff" stopOpacity={0.16} /><Stop offset="0.6" stopColor="#fff" stopOpacity={0} /></LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
        <Rect width="100%" height="100%" fill={`url(#${id}s)`} />
        <Rect x="0.5" y="0.5" width="99.6%" height="99.4%" rx="20" fill="none" stroke="rgba(255,255,255,0.14)" />
      </Svg>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={{fontFamily: ahFonts.sansBold, fontSize: 11, letterSpacing: 3.5, color: f.ink}}>FINESSE</Text>
        <View style={{width: 34, height: 26, borderRadius: 6, backgroundColor: '#C4C7CC'}} />
      </View>
      {big != null && (typeof big === 'string'
        ? <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 30, letterSpacing: -0.6, color: f.ink}}>{big}</Text>
        : big)}
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 2.6, color: f.inkSoft}}>{(holder ?? label ?? f.label).toUpperCase()}</Text>
        {right ? <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 22, color: f.ink}}>{right}</Text> : null}
      </View>
    </View>
  );
}

export function AHSkeleton({h = 16, w = '100%', r = 12, style}: {h?: number; w?: number | `${number}%`; r?: number; style?: StyleProp<ViewStyle>}) {
  const reduce = useReducedMotion();
  const o = useSharedValue(0.5);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withSequence(withTiming(1, {duration: 700}), withTiming(0.5, {duration: 700})), -1);
  }, [reduce, o]);
  const st = useAnimatedStyle(() => ({opacity: o.value}));
  return <Animated.View accessibilityElementsHidden style={[{height: h, width: w, borderRadius: r, backgroundColor: '#18181B'}, st, style]} />;
}

/** Live clock "11:42 PM". */
export function AHClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.mute}}>{t.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</Text>;
}

export function greetingFor(d: Date) {
  const h = d.getHours();
  return h < 5 ? 'Still up,' : h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
}

export function AHInput(props: TextInputProps & {label?: string}) {
  const {label, style, ...rest} = props;
  const [focus, setFocus] = useState(false);
  return (
    <View style={{gap: 8}}>
      {label ? <AHEyebrow>{label}</AHEyebrow> : null}
      <TextInput
        placeholderTextColor={ah.faint}
        selectionColor={ah.rose}
        {...rest}
        onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
        style={[{minHeight: 50, paddingHorizontal: 16, borderRadius: radius.input, borderWidth: 1, borderColor: focus ? 'rgba(232,180,160,0.6)' : ah.line2,
          backgroundColor: 'rgba(0,0,0,0.35)', color: ah.text, fontFamily: ahFonts.sans, fontSize: 16}, style]}
      />
    </View>
  );
}

export function AHDivider({style}: {style?: StyleProp<ViewStyle>}) {
  return <View style={[{height: 1, backgroundColor: ah.line}, style]} />;
}

/** Note for sample/preview content (honesty). */
export function AHSampleNote({children}: {children: ReactNode}) {
  return <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 11, letterSpacing: 0.4, color: ah.faint}}>{children}</Text>;
}
