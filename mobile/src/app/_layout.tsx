import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/lib/tokens';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.oxblood },
        headerTintColor: colors.brassHighlight,
        contentStyle: { backgroundColor: colors.ink },
        headerTitleStyle: { fontFamily: 'serif' },
      }}>
        <Stack.Screen name="index" options={{ title: 'FINESSE · THE HOTEL' }} />
        <Stack.Screen name="room/[id]" options={{ title: 'THE ROOMS' }} />
        <Stack.Screen name="penthouse" options={{ title: 'THE PRIVATE LIFT' }} />
        <Stack.Screen name="sign-in" options={{ title: 'MEMBERS ONLY', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
