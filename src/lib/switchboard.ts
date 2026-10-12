// The Switchboard — which social networks are *really* linked, and the sealed-token format.
// A network counts as connected only when a server-side OAuth callback stored an access token sealed with
// INTEGRATIONS_ENCRYPTION_KEY (src/lib/crypto.ts). No OAuth app is configured yet, so every network says
// "Connect with OAuth — coming soon" and broadcast stays off. Tokens are never sent anywhere still sealed.
import {decryptJson, encryptJson} from '@/lib/crypto';

export const NETWORKS = [
  {id: 'instagram', label: 'Instagram', canPost: false},
  {id: 'twitter', label: 'X / Twitter', canPost: true},
  {id: 'tiktok', label: 'TikTok', canPost: false},
  {id: 'snapchat', label: 'Snapchat', canPost: false},
  {id: 'pinterest', label: 'Pinterest', canPost: false},
  {id: 'youtube', label: 'YouTube', canPost: false},
] as const;
export type NetworkId = (typeof NETWORKS)[number]['id'];
export const NETWORK_IDS = NETWORKS.map((n) => n.id) as [NetworkId, ...NetworkId[]];

export type SealedToken = {access_token: string; refresh_token?: string; expires_at?: string};
const PREFIX = 'v1';

/** Seal a token for storage in social_accounts.access_token_enc ("v1:<iv b64>:<ciphertext+tag b64>"). */
export function sealToken(token: SealedToken): string {
  const {iv, ciphertext} = encryptJson(token);
  return `${PREFIX}:${iv.toString('base64')}:${ciphertext.toString('base64')}`;
}

/** Open a sealed token. Anything that isn't a valid v1 blob for this key — including a raw legacy value — is null. */
export function openToken(sealed: string | null | undefined): SealedToken | null {
  if (!sealed) return null;
  const parts = sealed.split(':');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  try {
    const t = decryptJson<SealedToken>({iv: Buffer.from(parts[1], 'base64'), ciphertext: Buffer.from(parts[2], 'base64')});
    return typeof t?.access_token === 'string' && t.access_token ? t : null;
  } catch {
    return null;
  }
}

type Row = {platform: string; connected: boolean | null; access_token_enc?: string | null; connected_at?: string | null; platform_username?: string | null};

/** What the member sees per network. `connected` needs a token that actually opens; `canBroadcast` also needs posting support. */
export function networkStatus(rows: Row[], open: (s: string | null | undefined) => SealedToken | null = openToken) {
  return NETWORKS.map((n) => {
    const row = rows.find((r) => r.platform === n.id);
    const linked = !!row?.connected && !!open(row.access_token_enc);
    return {
      platform: n.id, label: n.label, connected: linked, canBroadcast: linked && n.canPost,
      username: linked ? row?.platform_username ?? null : null, connectedAt: linked ? row?.connected_at ?? null : null,
      oauth: 'coming_soon' as const,
    };
  });
}
