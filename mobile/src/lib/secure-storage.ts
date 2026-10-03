/**
 * Secrets on device go to the iOS Keychain / Android Keystore (expo-secure-store).
 * expo-secure-store has no web implementation, so the web preview keeps them in memory only:
 * nothing is written to localStorage, and a reload signs the preview out.
 */
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memory = new Map<string, string>();
const web = Platform.OS === 'web';

export const secureStorage = {
  getItem: async (k: string) => (web ? memory.get(k) ?? null : SecureStore.getItemAsync(k)),
  setItem: async (k: string, v: string) => { if (web) memory.set(k, v); else await SecureStore.setItemAsync(k, v); },
  removeItem: async (k: string) => { if (web) memory.delete(k); else await SecureStore.deleteItemAsync(k); },
};
