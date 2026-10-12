// AES-256-GCM sealing for Plaid access tokens (WebCrypto, Workers-native).
// Format: "<keyVersion>.<iv b64url>.<ciphertext b64url>". AAD binds the token to "<user_id>:<plaid_item_id>",
// so a ciphertext copied onto another member's row fails to decrypt.
const b64u = {
  enc: (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};

export interface TokenKeys { current: { version: string; key: string }; previous?: { version: string; key: string } }

async function importKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error('PLAID_TOKEN_KEY must be 32 bytes, base64');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function seal(keys: TokenKeys, plaintext: string, aad: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(aad) },
    await importKey(keys.current.key), new TextEncoder().encode(plaintext));
  return `${keys.current.version}.${b64u.enc(iv)}.${b64u.enc(new Uint8Array(ct))}`;
}

export async function open(keys: TokenKeys, sealed: string, aad: string): Promise<string> {
  const [ver, iv, ct] = sealed.split('.');
  const k = [keys.current, keys.previous].find((x) => x && x.version === ver);
  if (!k || !iv || !ct) throw new Error('unknown token key version');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.dec(iv), additionalData: new TextEncoder().encode(aad) },
    await importKey(k.key), b64u.dec(ct));
  return new TextDecoder().decode(pt);
}

export function keysFromEnv(env: { PLAID_TOKEN_KEY?: string; PLAID_TOKEN_KEY_VERSION?: string; PLAID_TOKEN_KEY_PREV?: string; PLAID_TOKEN_KEY_PREV_VERSION?: string }): TokenKeys | null {
  if (!env.PLAID_TOKEN_KEY) return null;
  return {
    current: { version: env.PLAID_TOKEN_KEY_VERSION ?? 'v1', key: env.PLAID_TOKEN_KEY },
    previous: env.PLAID_TOKEN_KEY_PREV ? { version: env.PLAID_TOKEN_KEY_PREV_VERSION ?? 'v0', key: env.PLAID_TOKEN_KEY_PREV } : undefined,
  };
}

export async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}
