import { Text, View, StyleSheet } from 'react-native';
import { useSession } from '../lib/session';
import { C, F } from '../theme';

const SUGGESTIONS = ['Post tonight’s look to Instagram', 'Map a late spot near dinner', 'Ask my shopper for shoes'];

/** Slides over the centre when the dock power button is on. Wire to the Nova agent endpoint. */
export function NovaPanel() {
  const { name } = useSession();
  return (
    <View style={s.panel}>
      <Text style={s.kicker}>NOVA IS LISTENING</Text>
      <Text style={s.prompt}>What can the house do for you{name ? `, ${name}` : ''}?</Text>
      {SUGGESTIONS.map((t) => <Text key={t} style={s.chip}>{t}</Text>)}
    </View>
  );
}

const s = StyleSheet.create({
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, paddingBottom: 46, gap: 8, backgroundColor: '#1E0710', borderTopWidth: 2, borderTopColor: C.her },
  kicker: { fontFamily: F.caps, fontSize: 10, letterSpacing: 2.6, color: C.herTint },
  prompt: { fontFamily: F.serif, fontSize: 18, color: C.cream },
  chip: { paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,143,169,0.5)', fontFamily: F.sans, fontSize: 12, color: C.cream },
});
