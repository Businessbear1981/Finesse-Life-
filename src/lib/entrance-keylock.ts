/** Public entrance KeyLock configuration (server-only). */
import {hasServiceRole, keylockSecret} from '@/lib/keylock-server';

/**
 * Production mode needs: KEYLOCK_SECRET (>=32 chars), SUPABASE_SERVICE_ROLE_KEY,
 * and ENTRANCE_KEYLOCK_CODE (six digits, server-only — never NEXT_PUBLIC_).
 * Anything missing → honest PREVIEW mode: the entrance animates and opens for any
 * six digits, the UI says so, and nothing downstream treats it as authorization
 * (the Lobby is a public route; VIP uses its own lock).
 */
export function entranceConfig() {
  const secret = keylockSecret();
  const code = process.env.ENTRANCE_KEYLOCK_CODE ?? '';
  const production = Boolean(secret && hasServiceRole() && /^\d{6}$/.test(code));
  return {production, secret, code} as const;
}

export const ENTRANCE_SESSION_TTL_MS = 12 * 60 * 60_000;
