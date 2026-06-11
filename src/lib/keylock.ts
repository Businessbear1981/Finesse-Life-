// KeyLock — timestamp-based cipher for Backstage sessions
// The millisecond you enter is the key. Nobody guesses it.
// Stored in sessionStorage only — dies with the browser tab.

const SESSION_KEY = 'finesse_backstage_key';

export interface KeyLockSession {
  session_key: string;
  entered_at: number;
  expires_at: string;
  nonce: string;
}

export async function enterBackstage(): Promise<KeyLockSession> {
  const res = await fetch('/api/keylock/enter', {method: 'POST'});
  if (!res.ok) {
    const err = await res.json() as {error?: string};
    throw new Error(err.error ?? 'KeyLock denied');
  }
  const session = await res.json() as KeyLockSession;
  // sessionStorage only — tab closes = key destroyed = content locked
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getBackstageKey(): KeyLockSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as KeyLockSession;
    if (new Date(session.expires_at) < new Date()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function exitBackstage(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function isBackstageActive(): boolean {
  return getBackstageKey() !== null;
}

// Attach KeyLock header to any backstage API request
export function keylockHeaders(): HeadersInit {
  const session = getBackstageKey();
  if (!session) return {'Content-Type': 'application/json'};
  return {
    'Content-Type': 'application/json',
    'X-Finesse-Key': session.session_key,
    'X-Finesse-Nonce': session.nonce,
  };
}
