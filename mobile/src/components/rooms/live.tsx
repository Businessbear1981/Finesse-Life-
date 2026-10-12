// The states every live room shares: checking the key, signed out, loading, not open yet, error.
// Drawn in the hotel's brass-and-ink language so a live room never falls back to a bare spinner.
import type {ReactNode} from 'react';
import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import {Link} from 'expo-router';
import Animated, {FadeIn} from 'react-native-reanimated';
import {deco, fonts} from '@/lib/deco';
import type {Live} from '@/lib/live';
import {s} from './shared';

export const OK_GREEN = '#7AF5B8';
export const ERR_PINK = '#FF8FA9';

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
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{padding: 12, gap: 10, borderWidth: 1, borderColor: deco.brassHighlight, backgroundColor: 'rgba(232,200,122,0.06)'}}>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>MEMBERS ONLY</Text>
      <Text style={s.body}>Sign in to open {what}. Nothing here is shown or saved until you do.</Text>
      <Link href="/sign-in" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign in" style={{minHeight: 44, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.cream}}>SIGN IN</Text>
        </Pressable>
      </Link>
    </Animated.View>
  );
}

export function Loading({label = 'OPENING THE ROOM…'}: {label?: string}) {
  return (
    <View style={{minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10}} accessibilityLiveRegion="polite">
      <ActivityIndicator color={deco.brassHighlight} />
      <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: deco.brass}}>{label}</Text>
    </View>
  );
}

export function NotOpen({message}: {message: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)'}}>
      <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(201,169,97,0.55)'}} />
      <View style={{flex: 1, gap: 2}}>
        <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: deco.brass}}>PREVIEW · NOT OPEN ON THE SERVER YET</Text>
        <Text style={s.small}>{message}</Text>
      </View>
    </View>
  );
}

export function ErrorPanel({message, onRetry}: {message: string; onRetry?: () => void}) {
  return (
    <View style={{padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(255,143,169,0.5)'}} accessibilityLiveRegion="polite">
      <Text style={[s.small, {color: ERR_PINK}]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" style={{minHeight: 40, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.cream}}>TRY AGAIN</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A one-line status under an action: green only when the server confirmed it. */
export function Status({msg}: {msg: {ok: boolean; text: string} | null}) {
  if (!msg) return null;
  return <Text style={[s.small, {color: msg.ok ? OK_GREEN : ERR_PINK}]} accessibilityLiveRegion="polite">{msg.text}</Text>;
}

/** Small outlined button used for row actions. */
export function RowBtn({label, onPress, disabled, tone, a11y}: {label: string; onPress: () => void; disabled?: boolean; tone?: string; a11y?: string}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      style={({pressed}) => ({minHeight: 38, paddingHorizontal: 10, borderWidth: 1, borderColor: tone ?? deco.brass, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.8 : 1})}>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.3, color: tone ?? deco.cream}}>{label}</Text>
    </Pressable>
  );
}
