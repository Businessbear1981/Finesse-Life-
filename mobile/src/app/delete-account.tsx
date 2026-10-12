// Account deletion. Reached from This Is You → Your key. The member types DELETE and their password; the
// server (POST /api/account/delete {confirm: 'DELETE', password}) does the deletion and answers
// 200 {deleted: true}, 401 for a wrong password, or {error} otherwise. Only a confirmed deletion signs the
// device out and returns to the entrance — any other answer says plainly that nothing was deleted.
import {useState} from 'react';
import {useRouter} from 'expo-router';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput} from 'react-native';
import {api, liftToken} from '@/lib/api';
import {deco, fonts} from '@/lib/deco';
import {useMember} from '@/lib/member';
import {supabase} from '@/lib/supabase';

const PINK = '#FF8FA9';

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
      : r.ok ? 'The house did not confirm the deletion. Your account may still exist — try again or contact the front desk.'
      // A server message is shown as-is: a 500 can mean a partial deletion, so we don't claim "nothing was deleted".
      : r.body.message ?? `The house could not delete the account (${r.body.error ?? r.status}).`);
  };

  return (
    <ScrollView style={{backgroundColor: deco.ink}} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>YOUR KEY</Text>
      <Text style={styles.title}>Delete your account</Text>
      <Text style={styles.body}>This permanently deletes your Finesse account{member?.email ? ` (${member.email})` : ''} and the data the house holds for you. It cannot be undone. Export your data from This Is You first if you want a copy.</Text>
      {member === null ? (
        <Text style={[styles.body, {color: PINK}]}>You are not signed in on this device, so there is nothing to delete from here.</Text>
      ) : (
        <>
          <Text style={styles.label}>TYPE DELETE TO CONFIRM</Text>
          <TextInput value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" placeholderTextColor="rgba(244,232,208,0.3)" accessibilityLabel="Type DELETE to confirm" style={styles.input} />
          <Text style={styles.label}>YOUR PASSWORD</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Password" placeholderTextColor="rgba(244,232,208,0.3)" accessibilityLabel="Password" style={styles.input} onSubmitEditing={submit} />
          <Pressable onPress={submit} disabled={!ready} accessibilityRole="button" accessibilityState={{disabled: !ready}} accessibilityLabel="Delete my account permanently" style={[styles.danger, !ready && {opacity: 0.4}]}>
            {busy ? <ActivityIndicator color={deco.ink} /> : <Text style={styles.dangerText}>DELETE MY ACCOUNT</Text>}
          </Pressable>
        </>
      )}
      {msg ? <Text style={[styles.body, {color: PINK}]} accessibilityLiveRegion="polite">{msg}</Text> : null}
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.cancel}>
        <Text style={styles.cancelText}>KEEP MY ACCOUNT</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {paddingHorizontal: 24, paddingTop: 32, paddingBottom: 60, gap: 14},
  eyebrow: {fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 4, color: deco.brass},
  title: {fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 38, color: deco.cream},
  body: {fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: 'rgba(244,232,208,0.85)'},
  label: {marginTop: 6, fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight},
  input: {minHeight: 52, borderWidth: 1, borderColor: deco.brassShadow, color: deco.cream, paddingHorizontal: 14, fontSize: 16, fontFamily: fonts.body},
  danger: {minHeight: 52, marginTop: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: PINK},
  dangerText: {fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2.4, color: '#140508'},
  cancel: {minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: deco.brass},
  cancelText: {fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.cream},
});
