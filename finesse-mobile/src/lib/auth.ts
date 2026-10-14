import * as SecureStore from 'expo-secure-store';

const KEY = 'finesse.token';
let cached: string | null | undefined;

/** Bearer token issued by the API after sign-in. WorkOS access token (AuthKit, passkeys); the app only needs the token string. */
export async function getToken() {
  if (cached === undefined) cached = await SecureStore.getItemAsync(KEY);
  return cached;
}
export async function setToken(t: string | null) {
  cached = t;
  if (t) await SecureStore.setItemAsync(KEY, t); else await SecureStore.deleteItemAsync(KEY);
}
