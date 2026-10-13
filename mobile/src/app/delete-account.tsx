// Account deletion. Reached from This Is You → Your key. The member types DELETE and their password; the
// server (POST /api/account/delete {confirm: 'DELETE', password}) does the deletion and answers
// 200 {deleted: true}, 401 for a wrong password, or {error} otherwise. Only a confirmed deletion signs the
// device out and returns to the entrance — any other answer says plainly that nothing was deleted.
import {useState} from 'react';
import {useRouter} from 'expo-router';
import {ActivityIndicator, Pressable, Text} from 'react-native';
import {SUPPORT_EMAIL} from '@/lib/consents';
import {openUrl} from '@/components/legal/LegalLinks';
import {api, liftToken} from '@/lib/api';
import {useMember} from '@/lib/member';
import {supabase} from '@/lib/supabase';
import {ah, ahFonts, radius} from '@/lib/ah';
import {AHBody, AHCard, AHEyebrow, AHInput, AHPill, AHScreen, AHTitle} from '@/components/ah';

export default function DeleteAccount() {
  const router = useRouter();
  const member = useMember();
  const [word, setWord] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ready = word === 'DELETE' && password.length > 0 && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true); setMsg(null);
    const r = await api<{deleted?: boolean; error?: string; message?: string}>('/api/account/delete', {method: 'POST', json: {confirm: 'DELETE', password}});
    if (r.ok && r.body.deleted === true) {
      await liftToken.clear().catch(() => {});
      await supabase.auth.signOut({scope: 'local'}).catch(() => {});
      setBusy(false);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
      return;
    }
    setBusy(false);
    setPassword('');
    setMsg(r.status === 0 ? 'The house line is down. Nothing was deleted.'
      : r.status === 401 && r.body.error === 'signed_out' ? 'Your session on this device has ended. Sign in again, then try once more. Nothing was deleted.'
      : r.status === 401 ? 'That password is not right. Nothing was deleted.'
      : r.status === 429 ? 'Too many attempts. Wait a while before trying again. Nothing was deleted.'
      : r.status === 404 || r.status === 405 ? 'Account deletion is not open on the server yet. Nothing was deleted.'
      : r.ok ? `The house did not confirm the deletion. Your account may still exist — try again or email ${SUPPORT_EMAIL}.`
      // A server message is shown as-is: a 500 can mean a partial deletion, so we don't claim "nothing was deleted".
      : r.body.message ?? `The house could not delete the account (${r.body.error ?? r.status}).`);
  };

  return (
    <AHScreen bottom={48} glow={false}>
      <AHEyebrow>Your key · Account</AHEyebrow>
      <AHTitle size={44} style={{marginTop: 10}}>Leaving the house.</AHTitle>
      <AHBody mute style={{marginTop: 12}}>
        This permanently deletes your Finesse account{member?.email ? ` (${member.email})` : ''} and the data the house holds for you. It cannot be undone. Export your data from This Is You first if you want a copy.
      </AHBody>

      {member === null ? (
        <AHCard style={{marginTop: 24}}>
          <AHBody>You are not signed in on this device, so there is nothing to delete from here.</AHBody>
        </AHCard>
      ) : (
        <AHCard glass pad={20} style={{marginTop: 24, gap: 16, borderColor: 'rgba(255,138,160,0.28)'}}>
          <AHInput label="Type DELETE to confirm" value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false}
            placeholder="DELETE" accessibilityLabel="Type DELETE to confirm" />
          <AHInput label="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"
            placeholder="Password" accessibilityLabel="Password" onSubmitEditing={submit} />
          <Pressable onPress={submit} disabled={!ready} accessibilityRole="button" accessibilityState={{disabled: !ready, busy}} accessibilityLabel="Delete my account permanently"
            style={({pressed}) => ({minHeight: 52, marginTop: 4, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
              backgroundColor: ready || busy ? (pressed ? '#FF6F8A' : ah.danger) : 'rgba(255,138,160,0.12)', borderWidth: 1,
              borderColor: ready || busy ? ah.danger : 'rgba(255,138,160,0.25)', transform: [{scale: pressed ? 0.98 : 1}]})}>
            {busy ? <ActivityIndicator color="#1A0508" />
              : <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: ready ? '#1A0508' : 'rgba(255,138,160,0.6)'}}>Delete my account permanently</Text>}
          </Pressable>
        </AHCard>
      )}

      {msg ? (
        <Text accessibilityLiveRegion="polite" style={{marginTop: 16, fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 21, color: ah.danger}}>{msg}</Text>
      ) : null}

      <AHPill label="Keep my account" variant="ghost" block onPress={() => router.back()} style={{marginTop: 16}} />

      <AHCard style={{marginTop: 20, gap: 6}} pad={16}>
        <AHEyebrow>Can’t sign in, or need help?</AHEyebrow>
        <AHBody mute>
          Email the front desk at <Text accessibilityRole="link" onPress={openUrl(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my Finesse account')}`)} style={{color: ah.rose, textDecorationLine: 'underline'}}>{SUPPORT_EMAIL}</Text> from
          the address on your account and ask for deletion. Details: <Text accessibilityRole="link" onPress={openUrl('https://finesselife.vip/account/delete-info')} style={{color: ah.rose, textDecorationLine: 'underline'}}>finesselife.vip/account/delete-info</Text>
        </AHBody>
      </AHCard>
    </AHScreen>
  );
}
