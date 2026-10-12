// The states every live room shares: checking the key, signed out, loading, not open yet, error — plus a few
// small After Hours pieces the room interiors reuse (tick, numbered row, consent, big tile).
// Drawn in the After Hours language so a live room never falls back to a bare spinner.
import type {ReactNode} from 'react';
import {ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeIn} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {ah, ahFonts, radius} from '@/lib/ah';
import {deco} from '@/lib/deco';
import type {Live} from '@/lib/live';
import {AHCard, AHEyebrow, AHSkeleton} from '@/components/ah';
import {Icon} from '@/lib/icons';
import {s, sentence} from './shared';

export const OK_GREEN = ah.ok;
export const ERR_PINK = ah.danger;

/** Renders `children(data)` when the room is ready; otherwise the honest state. */
export function LiveGate<T>({live, reload, children, signedOut, what}: {
  live: Live<T>;
  reload: () => void;
  children: (data: T) => ReactNode;
  /** Shown under the sign-in prompt — usually the labelled sample of the room. */
  signedOut?: ReactNode;
  /** "your diary", "your closet" … used in the copy. */
  what: string;
}) {
  if (live.state === 'ready') return <>{children(live.data)}</>;
  if (live.state === 'signed_out') return <><SignInPrompt what={what} />{signedOut}</>;
  if (live.state === 'checking' || live.state === 'loading') return <Loading />;
  if (live.state === 'not_open') return <NotOpen message={live.message} />;
  return <ErrorPanel message={live.message} onRetry={reload} />;
}

export function SignInPrompt({what}: {what: string}) {
  const router = useRouter();
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <AHCard style={{gap: 14, borderColor: 'rgba(232,180,160,0.28)', backgroundColor: '#100B0C'}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <Icon name="lock" size={14} color={ah.rose} strokeWidth={1.8} />
          <AHEyebrow color={ah.rose}>Members only</AHEyebrow>
        </View>
        <Text style={{fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.text}}>Sign in to open {what}. Nothing here is shown or saved until you do.</Text>
        <Pressable onPress={() => router.push('/sign-in')} accessibilityRole="button" accessibilityLabel="Sign in"
            style={{minHeight: 48, borderRadius: radius.pill, backgroundColor: ah.white, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: '#000'}}>Sign in</Text>
        </Pressable>
      </AHCard>
    </Animated.View>
  );
}

export function Loading({label = 'OPENING THE ROOM…'}: {label?: string}) {
  return (
    <View style={{minHeight: 140, gap: 12, paddingVertical: 8}} accessibilityLiveRegion="polite">
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <ActivityIndicator color={ah.rose} />
        <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.mute}}>{sentence(label)}</Text>
      </View>
      <AHSkeleton h={120} r={radius.card} />
      <AHSkeleton h={14} w="60%" />
    </View>
  );
}

export function NotOpen({message}: {message: string}) {
  return (
    <AHCard style={{flexDirection: 'row', alignItems: 'flex-start', gap: 12}}>
      <View style={{width: 8, height: 8, borderRadius: 4, marginTop: 5, backgroundColor: ah.platinum, opacity: 0.6}} />
      <View style={{flex: 1, gap: 4}}>
        <AHEyebrow>Preview · not open on the server yet</AHEyebrow>
        <Text style={s.small}>{message}</Text>
      </View>
    </AHCard>
  );
}

export function ErrorPanel({message, onRetry}: {message: string; onRetry?: () => void}) {
  return (
    <View accessibilityLiveRegion="polite">
      <AHCard style={{gap: 12, borderColor: 'rgba(255,138,160,0.35)'}}>
        <Text style={[s.small, {color: ERR_PINK, fontSize: 13, lineHeight: 19}]}>{message}</Text>
        {onRetry ? <RowBtn label="TRY AGAIN" onPress={onRetry} /> : null}
      </AHCard>
    </View>
  );
}

/** A one-line status under an action: green only when the server confirmed it. */
export function Status({msg}: {msg: {ok: boolean; text: string} | null}) {
  if (!msg) return null;
  return <Text style={[s.small, {fontSize: 13, lineHeight: 19, color: msg.ok ? OK_GREEN : ERR_PINK}]} accessibilityLiveRegion="polite">{msg.text}</Text>;
}

const isRose = (c?: string) => !!c && (c === ah.rose || c === deco.pink || c === ah.rose2 || c === ah.blush);

/** Small pill used for row actions. A rose `tone` gives it a rose edge; otherwise it is a quiet ghost pill. */
export function RowBtn({label, onPress, disabled, tone, a11y}: {label: string; onPress: () => void; disabled?: boolean; tone?: string; a11y?: string}) {
  const rose = isRose(tone);
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? sentence(label)} accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => ({minHeight: 40, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: rose ? 'rgba(232,180,160,0.6)' : ah.line2,
        backgroundColor: rose ? 'rgba(232,180,160,0.1)' : 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1})}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13, color: rose ? ah.blush : ah.text}}>{sentence(label)}</Text>
    </Pressable>
  );
}

/** Round tick (44pt) for "done" / "eaten" checkboxes. */
export function Tick({on, onPress, label}: {on: boolean; onPress: () => void; label: string}) {
  return (
    <Pressable onPress={() => { void Haptics.selectionAsync().catch(() => {}); onPress(); }} accessibilityRole="checkbox" accessibilityState={{checked: on}} accessibilityLabel={label} hitSlop={4}
      style={({pressed}) => ({width: 44, height: 44, borderRadius: 22, borderWidth: on ? 0 : 1.5, borderColor: ah.line2, backgroundColor: on ? ah.white : 'transparent',
        alignItems: 'center', justifyContent: 'center', transform: [{scale: pressed ? 0.94 : 1}]})}>
      {on ? <Text style={{color: '#000', fontSize: 17, fontFamily: ahFonts.sansBold}}>✓</Text> : null}
    </Pressable>
  );
}

/** Consent checkbox row — the words stay exactly as written by the room. */
export function Consent({checked, onToggle, children}: {checked: boolean; onToggle: () => void; children: ReactNode}) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{checked}}
      style={({pressed}) => ({flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 20, borderWidth: 1,
        borderColor: checked ? 'rgba(126,226,184,0.45)' : ah.line2, backgroundColor: checked ? 'rgba(126,226,184,0.05)' : ah.ink2, opacity: pressed ? 0.85 : 1})}>
      <View style={{width: 24, height: 24, borderRadius: 7, marginTop: 1, borderWidth: checked ? 0 : 1.5, borderColor: ah.mute, alignItems: 'center', justifyContent: 'center', backgroundColor: checked ? ah.white : 'transparent'}}>
        {checked ? <Text style={{color: '#000', fontSize: 14, fontFamily: ahFonts.sansBold}}>✓</Text> : null}
      </View>
      <Text style={[s.small, {flex: 1, fontSize: 13, lineHeight: 19, color: checked ? ah.text : ah.mute}]}>{children}</Text>
    </Pressable>
  );
}

/** A big square-ish tap tile with an icon: `solid` = white (or rose when `rose`), otherwise glass. */
export function Tile({icon, label, onPress, solid, rose, disabled, a11y}: {icon: string; label: string; onPress: () => void; solid?: boolean; rose?: boolean; disabled?: boolean; a11y?: string}) {
  const bg = solid ? (rose ? ah.rose : ah.white) : 'rgba(255,255,255,0.05)';
  const fg = solid ? (rose ? '#2A1014' : '#000') : ah.text;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => ({flex: 1, minHeight: 96, borderRadius: 22, backgroundColor: bg, borderWidth: solid ? 0 : 1, borderColor: ah.line2,
        alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.4 : 1, transform: [{scale: pressed ? 0.98 : 1}]})}>
      <Icon name={icon} size={26} color={fg} strokeWidth={1.7} />
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: fg}}>{label}</Text>
    </Pressable>
  );
}

/** Editorial numbered row: 01 · serif title · sub · right-hand slot. Not pressable on its own. */
export function NumRow({n, title, sub, meta, right, last, style}: {n: number | string; title: ReactNode; sub?: ReactNode; meta?: ReactNode; right?: ReactNode; last?: boolean; style?: StyleProp<ViewStyle>}) {
  return (
    <View style={[{flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderColor: ah.line}, style]}>
      {typeof n === 'number'
        ? <Text style={{width: 26, fontFamily: ahFonts.sansSemi, fontSize: 11, color: ah.faint}}>{String(n).padStart(2, '0')}</Text>
        : <Text style={{width: 30, fontFamily: ahFonts.serifItalic, fontSize: 20, color: ah.rose}}>{n}</Text>}
      <View style={{flex: 1, gap: 2}}>
        {meta ? <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: ah.mute}}>{meta}</Text> : null}
        <Text style={{fontFamily: ahFonts.serif, fontSize: 22, lineHeight: 25, color: ah.text}}>{title}</Text>
        {sub ? <Text style={{fontFamily: ahFonts.sans, fontSize: 12.5, lineHeight: 17, color: ah.mute}}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Uppercase-free little caption used above cards (sentence case, tracked). */
export function Meta({children, color = ah.mute, style}: {children: ReactNode; color?: string; style?: object}) {
  return <Text style={[{fontFamily: ahFonts.sansSemi, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color}, style]}>{children}</Text>;
}
