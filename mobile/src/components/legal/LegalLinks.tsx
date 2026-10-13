// Privacy · Terms · Support links to the public pages on finesselife.vip (store requirement: the privacy policy
// must be reachable from inside the app). Each link is a 44pt target.
import {Linking, Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {PRIVACY_URL, SUPPORT_URL, TERMS_URL} from '@/lib/consents';
import {ah, ahFonts} from '@/lib/ah';

export const openUrl = (url: string) => () => { void Linking.openURL(url).catch(() => {}); };

const LINKS: Array<[string, string]> = [['Privacy', PRIVACY_URL], ['Terms', TERMS_URL], ['Support', SUPPORT_URL]];

export function LegalLinks({align = 'center', color = ah.mute, style}: {align?: 'center' | 'flex-start'; color?: string; style?: StyleProp<ViewStyle>}) {
  return (
    <View style={[{flexDirection: 'row', flexWrap: 'wrap', justifyContent: align, columnGap: 18}, style]} accessibilityRole="none">
      {LINKS.map(([label, url]) => (
        <Pressable key={label} onPress={openUrl(url)} accessibilityRole="link" accessibilityLabel={`${label} (opens finesselife.vip)`} hitSlop={4}
          style={({pressed}) => ({minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1})}>
          <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color}}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
