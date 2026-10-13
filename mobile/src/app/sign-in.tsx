import {useEffect, useRef, useState} from 'react';
import {router} from 'expo-router';
import {Pressable, Text, View} from 'react-native';
import {supabase, supabaseConfigured} from '@/lib/supabase';
import {liftToken} from '@/lib/api';
import {PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL, hasConsent, recordConsent} from '@/lib/consents';
import {ah, ahFonts} from '@/lib/ah';
import {AHBody, AHCard, AHDisplay, AHEyebrow, AHInput, AHPill, AHScreen} from '@/components/ah';
import {LegalLinks, openUrl} from '@/components/legal/LegalLinks';

/** Where the password-reset email sends the member (the web page that sets the new password). It must be in
 *  the Supabase Auth redirect allow-list. */
const RESET_REDIRECT = 'https://finesselife.vip/reset-password';

type Mode = 'sign-in' | 'forgot' | 'age' | 'under-age';

function LinkText({label, url}: {label: string; url: string}) {
  return <Text accessibilityRole="link" onPress={openUrl(url)} style={{color: ah.rose, textDecorationLine: 'underline'}}>{label}</Text>;
}

/** Member sign-in (After Hours, mirrors web /login), "Forgot password?", and the in-app 18+ confirmation
 *  (asked once per member after their first sign-in in the app; stored as member_consents 'age_18'). */
export default function SignIn() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const [busy, setBusy] = useState(false);

  // Leaving the screen (swipe down / back) while the 18+ question is unanswered signs the device out again:
  // nobody is left signed in without confirming their age.
  const awaitingAge = useRef(false);
  useEffect(() => { awaitingAge.current = mode === 'age'; }, [mode]);
  useEffect(() => () => {
    if (awaitingAge.current) { void liftToken.clear().catch(() => {}); void supabase.auth.signOut({scope: 'local'}).catch(() => {}); }
  }, []);

  const submit = async () => {
    if (!supabaseConfigured) { setMsg({ok: false, text: 'This build has no Supabase keys (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY).'}); return; }
    setBusy(true); setMsg(null);
    const {error} = await supabase.auth.signInWithPassword({email: email.trim(), password});
    if (error) { setBusy(false); setMsg({ok: false, text: 'The concierge does not recognise those details.'}); return; }
    setPassword('');
    const confirmed = await hasConsent('age_18');
    setBusy(false);
    if (confirmed) { router.back(); return; }
    setMode('age');
  };

  const confirmAge = async () => {
    setBusy(true); setMsg(null);
    const r = await recordConsent('age_18');
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: 'Your session ended before that could be saved. Sign in again.'}); setMode('sign-in'); return; }
    awaitingAge.current = false;
    router.back();
  };

  const underAge = async () => {
    setBusy(true);
    await liftToken.clear().catch(() => {});
    await supabase.auth.signOut({scope: 'local'}).catch(() => {});
    setBusy(false);
    setMode('under-age');
  };

  const sendReset = async () => {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) { setMsg({ok: false, text: 'Enter the email address on your account.'}); return; }
    if (!supabaseConfigured) { setMsg({ok: false, text: 'This build has no Supabase keys, so no email can be sent.'}); return; }
    setBusy(true); setMsg(null);
    const {error} = await supabase.auth.resetPasswordForEmail(e, {redirectTo: RESET_REDIRECT});
    setBusy(false);
    if (error) {
      setMsg({ok: false, text: error.status === 429 ? 'Too many requests. Wait a minute, then try again. No email was sent.' : `The reset email could not be sent (${error.message}).`});
      return;
    }
    setMsg({ok: true, text: `If ${e} has an account, a reset link is on its way. Open it in any browser to set a new password, then sign in here.`});
  };

  if (mode === 'age' || mode === 'under-age') {
    return (
      <AHScreen bottom={40}>
        <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
          <AHEyebrow>Members · One question</AHEyebrow>
          {mode === 'age' ? (
            <>
              <AHDisplay size={46} style={{marginTop: 8}}>Are you 18 or older?</AHDisplay>
              <AHBody mute style={{marginTop: 10, marginBottom: 24}}>Finesse is for adults only. Please confirm your age to continue.</AHBody>
              <AHCard glass pad={22} style={{gap: 12}}>
                <AHPill label={busy ? 'One moment…' : 'Yes, I’m 18 or older'} block disabled={busy} onPress={() => void confirmAge()} style={{minHeight: 50}} />
                <AHPill label="No, I’m under 18" variant="ghost" block disabled={busy} onPress={() => void underAge()} />
                {msg ? <Text accessibilityLiveRegion="polite" style={{fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 20, color: ah.danger, textAlign: 'center'}}>{msg.text}</Text> : null}
              </AHCard>
              <Text style={{marginTop: 16, textAlign: 'center', fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: ah.mute}}>
                By continuing you agree to the <LinkText label="Terms of Membership" url={TERMS_URL} /> and the <LinkText label="Privacy policy" url={PRIVACY_URL} />.
              </Text>
            </>
          ) : (
            <>
              <AHDisplay size={46} style={{marginTop: 8}}>For adults only.</AHDisplay>
              <AHCard pad={22} style={{marginTop: 20, gap: 12}}>
                <Text accessibilityLiveRegion="polite" style={{fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.text}}>
                  Finesse is only for people aged 18 and over, so this account can’t be used here. You have been signed out of this device.
                </Text>
                <Text style={{fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 21, color: ah.mute}}>
                  If you tapped “No” by mistake, sign in again. To have the account deleted, write to {SUPPORT_EMAIL}.
                </Text>
              </AHCard>
              <AHPill label="Back to the entrance" variant="ghost" block onPress={() => router.back()} style={{marginTop: 16}} />
            </>
          )}
          <LegalLinks style={{marginTop: 10}} />
        </View>
      </AHScreen>
    );
  }

  const forgot = mode === 'forgot';
  return (
    <AHScreen bottom={40}>
      <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
        <AHEyebrow>{forgot ? 'Members · Your key' : 'Members · The door'}</AHEyebrow>
        <AHDisplay size={52} style={{marginTop: 8}}>{forgot ? 'New password.' : 'Welcome back.'}</AHDisplay>
        <AHBody mute style={{marginTop: 8, marginBottom: 24}}>
          {forgot ? 'Enter your account email and we’ll send a link to set a new password.' : 'Sign in to the house. Your table, your card and your concierge are where you left them.'}
        </AHBody>

        <AHCard glass pad={22} style={{gap: 18}}>
          <AHInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email"
            textContentType="emailAddress" accessibilityLabel="Email" returnKeyType={forgot ? 'send' : 'next'}
            onSubmitEditing={forgot ? () => { if (!busy) void sendReset(); } : undefined} />
          {forgot ? null : (
            <AHInput label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"
              textContentType="password" accessibilityLabel="Password" returnKeyType="go" onSubmitEditing={() => { if (!busy) void submit(); }} />
          )}
          {msg && <Text accessibilityLiveRegion="polite" style={{fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 20, color: msg.ok ? ah.ok : ah.danger, textAlign: 'center'}}>{msg.text}</Text>}
          {forgot
            ? <AHPill label={busy ? 'Sending…' : 'Email me a reset link'} block disabled={busy} onPress={() => void sendReset()} style={{minHeight: 50, marginTop: 4}} />
            : <AHPill label={busy ? 'Opening the door…' : 'Sign in'} block disabled={busy} onPress={() => void submit()} style={{minHeight: 50, marginTop: 4}} />}
        </AHCard>

        <Pressable onPress={() => { setMode(forgot ? 'sign-in' : 'forgot'); setMsg(null); }} accessibilityRole="button"
          style={{minHeight: 44, alignSelf: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 8}}>
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: ah.rose}}>{forgot ? 'Back to sign in' : 'Forgot password?'}</Text>
        </Pressable>

        <Text style={{marginTop: 2, textAlign: 'center', fontFamily: ahFonts.sans, fontSize: 14, color: ah.mute, paddingVertical: 12}}>
          Not on the list?{' '}
          <Text accessibilityRole="link" style={{color: ah.rose}} onPress={openUrl('https://finesselife.vip/signup')}>Request an invitation</Text>
        </Text>
        <LegalLinks />
      </View>
    </AHScreen>
  );
}
