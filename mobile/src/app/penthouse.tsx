import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput } from 'react-native';
import { colors, touchTarget } from '@/lib/tokens';

export default function PenthouseElevator() {
  const input = useRef<TextInput>(null);
  const [called, setCalled] = useState(false);
  const [code, setCode] = useState('');
  const digits = code.padEnd(6, '·').split('');

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.label}>THE PRIVATE LIFT</Text>
      <Text style={styles.title}>Penthouse</Text>
      <Text style={styles.subtitle}>A room above the room.</Text>
      <View style={styles.canopy}><Text style={styles.canopyText}>◈  PRIVATE FLOOR  ◈</Text></View>
      <View style={styles.doors}>
        <View style={styles.door}><Text style={styles.ornament}>◆</Text><View style={styles.digits}>{digits.slice(0, 3).map((d, i) => <View key={i} style={styles.well}><Text style={styles.digit}>{called ? d : '·'}</Text></View>)}</View></View>
        <View style={styles.door}><Text style={styles.ornament}>◆</Text><View style={styles.digits}>{digits.slice(3).map((d, i) => <View key={i} style={styles.well}><Text style={styles.digit}>{called ? d : '·'}</Text></View>)}</View></View>
      </View>
      {called ? <>
        <Text style={styles.hint}>Align the six brass numbers on the doors.</Text>
        <TextInput ref={input} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} style={styles.input} accessibilityLabel="Penthouse six-digit puzzle, preview only" placeholder="Six digits" placeholderTextColor={colors.brassShadow} />
        <Text style={styles.notice}>Cinematic preview. The web lift (/api/vip-keylock) needs mobile sign-in before this screen can call it. Entering digits will not unlock a protected room.</Text>
      </> : <Pressable onPress={() => { setCalled(true); setTimeout(() => input.current?.focus(), 60); }} accessibilityRole="button" accessibilityLabel="Call the Penthouse elevator" style={styles.button}><Text style={styles.buttonText}>CALL PENTHOUSE</Text></Pressable>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.ink, flexGrow: 1, paddingHorizontal: 24, paddingTop: 34, paddingBottom: 80, alignItems: 'center' },
  label: { color: colors.brass, fontSize: 10, letterSpacing: 4 },
  title: { color: colors.cream, fontFamily: 'serif', fontSize: 44, marginTop: 15 },
  subtitle: { color: colors.brass, fontFamily: 'serif', fontSize: 19, marginTop: 6, marginBottom: 34 },
  canopy: { width: '100%', borderWidth: 2, borderColor: colors.brass, borderBottomWidth: 1, paddingVertical: 22, alignItems: 'center', backgroundColor: colors.burgundy },
  canopyText: { color: colors.brassHighlight, letterSpacing: 3, fontSize: 13 },
  doors: { width: '100%', minHeight: 390, flexDirection: 'row', borderColor: colors.brass, borderWidth: 2, borderTopWidth: 0 },
  door: { flex: 1, borderColor: colors.brass, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.oxblood },
  ornament: { color: colors.brassShadow, fontSize: 35, marginBottom: 65 },
  digits: { flexDirection: 'row', gap: 3 },
  well: { width: 32, height: 52, alignItems: 'center', justifyContent: 'center', borderColor: colors.brass, borderWidth: 1 },
  digit: { color: colors.brassHighlight, fontFamily: 'serif', fontSize: 26 },
  hint: { color: colors.cream, fontFamily: 'serif', fontSize: 20, marginTop: 25, textAlign: 'center' },
  input: { width: '100%', minHeight: touchTarget + 8, borderWidth: 1, borderColor: colors.brass, color: colors.cream, textAlign: 'center', fontSize: 20, letterSpacing: 8, marginTop: 18 },
  notice: { color: colors.brass, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 16 },
  button: { minHeight: touchTarget + 10, borderWidth: 1, borderColor: colors.brass, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  buttonText: { color: colors.brassHighlight, letterSpacing: 3, fontSize: 12 },
});
