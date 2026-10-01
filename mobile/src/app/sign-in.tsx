import {useState} from 'react';
import {router} from 'expo-router';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, touchTarget} from '@/lib/tokens';
import {supabase, supabaseConfigured} from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!supabaseConfigured) { setMsg('This build has no Supabase keys (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY).'); return; }
    setBusy(true);
    const {error} = await supabase.auth.signInWithPassword({email: email.trim(), password});
    setBusy(false);
    if (error) { setMsg('The concierge does not recognise those details.'); return; }
    router.back();
  };

  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>MEMBERS ONLY</Text>
      <Text style={styles.title}>Sign in</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.brassShadow} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={styles.input} accessibilityLabel="Email" />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.brassShadow} secureTextEntry autoComplete="password" style={styles.input} accessibilityLabel="Password" />
      <Pressable onPress={submit} disabled={busy} accessibilityRole="button" style={[styles.button, busy && {opacity: 0.5}]}>
        <Text style={styles.buttonText}>{busy ? 'ONE MOMENT…' : 'ENTER'}</Text>
      </Pressable>
      {msg && <Text style={styles.msg} accessibilityLiveRegion="polite">{msg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: colors.ink, paddingHorizontal: 28, paddingTop: 60, gap: 14},
  eyebrow: {color: colors.brass, fontSize: 10, letterSpacing: 4},
  title: {color: colors.cream, fontFamily: 'serif', fontSize: 40, marginBottom: 12},
  input: {minHeight: touchTarget + 8, borderWidth: 1, borderColor: colors.brassShadow, color: colors.cream, paddingHorizontal: 14, fontSize: 16},
  button: {minHeight: touchTarget + 8, borderWidth: 1, borderColor: colors.brass, alignItems: 'center', justifyContent: 'center', marginTop: 8},
  buttonText: {color: colors.brassHighlight, letterSpacing: 4, fontSize: 12},
  msg: {color: colors.cream, fontStyle: 'italic', marginTop: 8},
});
