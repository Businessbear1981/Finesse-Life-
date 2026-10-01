/**
 * Supabase on device. The session lives in the iOS Keychain / Android Keystore
 * via expo-secure-store — never AsyncStorage, never plain files.
 */
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import {createClient} from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const secureStorage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

export const supabaseConfigured = Boolean(url && anon);

export const supabase = createClient(url || 'https://not-configured.invalid', anon || 'not-configured', {
  auth: {storage: secureStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false},
});
