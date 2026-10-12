import {useState} from 'react';
import {router} from 'expo-router';
import {Linking, Text, View} from 'react-native';
import {supabase, supabaseConfigured} from '@/lib/supabase';
import {ah, ahFonts} from '@/lib/ah';
import {AHBody, AHCard, AHDisplay, AHEyebrow, AHInput, AHPill, AHScreen} from '@/components/ah';

/** Member sign-in (After Hours, mirrors web /login). Same Supabase call and outcomes as before. */
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
    <AHScreen bottom={40}>
      <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
        <AHEyebrow>Members · The door</AHEyebrow>
        <AHDisplay size={52} style={{marginTop: 8}}>Welcome back.</AHDisplay>
        <AHBody mute style={{marginTop: 8, marginBottom: 24}}>Sign in to the house. Your table, your card and your concierge are where you left them.</AHBody>

        <AHCard glass pad={22} style={{gap: 18}}>
          <AHInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email"
            textContentType="emailAddress" accessibilityLabel="Email" returnKeyType="next" />
          <AHInput label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"
            textContentType="password" accessibilityLabel="Password" returnKeyType="go" onSubmitEditing={() => { if (!busy) void submit(); }} />
          {msg && <Text accessibilityLiveRegion="polite" style={{fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 20, color: ah.danger, textAlign: 'center'}}>{msg}</Text>}
          <AHPill label={busy ? 'Opening the door…' : 'Sign in'} block disabled={busy} onPress={() => void submit()} style={{minHeight: 50, marginTop: 4}} />
        </AHCard>

        <Text style={{marginTop: 14, textAlign: 'center', fontFamily: ahFonts.sans, fontSize: 14, color: ah.mute, paddingVertical: 12}}>
          Not on the list?{' '}
          <Text accessibilityRole="link" style={{color: ah.rose}} onPress={() => void Linking.openURL('https://finesselife.vip/signup')}>Request an invitation</Text>
        </Text>
      </View>
    </AHScreen>
  );
}
