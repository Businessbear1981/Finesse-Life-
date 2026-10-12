import {Stack} from 'expo-router';
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
import {colors} from '@/lib/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({PlayfairDisplay_400Regular_Italic, PlayfairDisplay_700Bold_Italic, PlayfairDisplay_800ExtraBold_Italic, Marcellus_400Regular, Manrope_500Medium, Manrope_600SemiBold, Cinzel_600SemiBold, Cinzel_700Bold, CormorantGaramond_400Regular_Italic, JetBrainsMono_400Regular});
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: {backgroundColor: colors.oxblood},
        headerTintColor: colors.brassHighlight,
        contentStyle: {backgroundColor: colors.ink},
        headerTitleStyle: {fontFamily: 'Marcellus_400Regular'},
      }}>
        <Stack.Screen name="index" options={{headerShown: false}} />
        <Stack.Screen name="side" options={{headerShown: false, animation: 'fade'}} />
        <Stack.Screen name="hotel" options={{headerShown: false, animation: 'fade'}} />
        <Stack.Screen name="lobby" options={{title: 'FINESSE · THE HOTEL', headerBackVisible: false}} />
        <Stack.Screen name="room/[id]" options={{title: 'THE ROOMS'}} />
        <Stack.Screen name="penthouse" options={{title: 'THE PRIVATE LIFT'}} />
        <Stack.Screen name="sign-in" options={{title: 'MEMBERS ONLY', presentation: 'modal'}} />
        <Stack.Screen name="delete-account" options={{title: 'DELETE ACCOUNT'}} />
      </Stack>
    </>
  );
}
