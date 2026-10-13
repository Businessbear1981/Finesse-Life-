import {Stack, router, type ErrorBoundaryProps} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect} from 'react';
import {useFonts} from 'expo-font';
import {PlayfairDisplay_400Regular_Italic, PlayfairDisplay_700Bold_Italic, PlayfairDisplay_800ExtraBold_Italic} from '@expo-google-fonts/playfair-display';
import {Marcellus_400Regular} from '@expo-google-fonts/marcellus';
import {Manrope_500Medium, Manrope_600SemiBold} from '@expo-google-fonts/manrope';
import {Cinzel_600SemiBold, Cinzel_700Bold} from '@expo-google-fonts/cinzel';
import {CormorantGaramond_400Regular_Italic} from '@expo-google-fonts/cormorant-garamond';
import {JetBrainsMono_400Regular} from '@expo-google-fonts/jetbrains-mono';
import {InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic} from '@expo-google-fonts/instrument-serif';
import {InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold} from '@expo-google-fonts/inter-tight';
import {Anton_400Regular} from '@expo-google-fonts/anton';
import {colors} from '@/lib/tokens';
import {ah, ahFonts} from '@/lib/ah';
import {AHDisplay, AHEyebrow, AHGlow, AHPill} from '@/components/ah';
import {AIConsentHost} from '@/components/rooms/AIConsent';

void SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Expo Router's root error boundary: any render error below the root layout lands here instead of a blank
 * screen. After Hours styling, an honest line, and two ways out: try the same screen again, or go back to the Lobby.
 */
export function ErrorBoundary({error, retry}: ErrorBoundaryProps) {
  const toLobby = () => {
    try { router.replace('/hotel'); } catch { /* the navigator itself may be what failed; retry still re-renders */ }
    void retry();
  };
  return (
    <View style={{flex: 1, backgroundColor: ah.ink}}>
      <StatusBar style="light" />
      <AHGlow />
      <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 64, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center'}}>
        <AHEyebrow>After Hours · A wrong turn</AHEyebrow>
        <AHDisplay size={44}>Something went wrong.</AHDisplay>
        <Text style={{fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.mute}}>
          This screen hit a problem and could not open. Nothing you saved was lost. Try again, or head back to the Lobby.
        </Text>
        {__DEV__ ? <Text selectable style={{fontFamily: ahFonts.sans, fontSize: 12, lineHeight: 17, color: ah.faint}}>{error.message}</Text> : null}
        <View style={{gap: 10, marginTop: 8}}>
          <AHPill label="Try again" block onPress={() => void retry()} />
          <AHPill label="Return to the Lobby" variant="ghost" block onPress={toLobby} />
        </View>
      </ScrollView>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic, InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold, Anton_400Regular, PlayfairDisplay_400Regular_Italic, PlayfairDisplay_700Bold_Italic, PlayfairDisplay_800ExtraBold_Italic, Marcellus_400Regular, Manrope_500Medium, Manrope_600SemiBold, Cinzel_600SemiBold, Cinzel_700Bold, CormorantGaramond_400Regular_Italic, JetBrainsMono_400Regular});
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: {backgroundColor: colors.ink},
        headerShadowVisible: false,
        headerTintColor: colors.cream,
        contentStyle: {backgroundColor: colors.ink},
        headerTitleStyle: {fontFamily: ahFonts.sansBold, fontSize: 13},
      }}>
        <Stack.Screen name="index" options={{headerShown: false}} />
        <Stack.Screen name="side" options={{headerShown: false, animation: 'fade'}} />
        <Stack.Screen name="hotel" options={{headerShown: false, animation: 'fade'}} />
        <Stack.Screen name="lobby" options={{title: 'The house', headerBackVisible: false}} />
        <Stack.Screen name="room/[id]" options={{title: 'The rooms'}} />
        <Stack.Screen name="penthouse" options={{title: 'The private lift'}} />
        <Stack.Screen name="sign-in" options={{title: 'Members', presentation: 'modal'}} />
        <Stack.Screen name="delete-account" options={{title: 'Delete account'}} />
      </Stack>
      {/* One AI consent sheet for the whole app — every Nova button and every consent_required refusal. */}
      <AIConsentHost />
    </>
  );
}
