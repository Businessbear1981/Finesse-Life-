import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Cinzel_600SemiBold, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { PlayfairDisplay_400Regular_Italic, PlayfairDisplay_600SemiBold_Italic, PlayfairDisplay_800ExtraBold_Italic } from '@expo-google-fonts/playfair-display';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Marcellus_400Regular } from '@expo-google-fonts/marcellus';
import { C } from '../src/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Cinzel_600SemiBold, Cinzel_700Bold,
    PlayfairDisplay_400Regular_Italic, PlayfairDisplay_600SemiBold_Italic, PlayfairDisplay_800ExtraBold_Italic,
    CormorantGaramond_500Medium_Italic, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
    JetBrainsMono_400Regular, Marcellus_400Regular,
  });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.ground }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ground }, animation: 'fade' }} />
    </GestureHandlerRootView>
  );
}
