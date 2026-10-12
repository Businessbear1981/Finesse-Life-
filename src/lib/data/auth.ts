'use server';
import 'server-only';
import { getWorkOS, saveSession, signOut as authkitSignOut } from '@workos-inc/authkit-nextjs';
import { headers } from 'next/headers';

async function origin() {
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
}

/** Email + password sign-in with WorkOS (keeps the existing login form). Passkeys come through AuthKit. */
export async function signInWithPassword(email: string, password: string): Promise<{ error: { message: string } | null }> {
  try {
    const res = await getWorkOS().userManagement.authenticateWithPassword({ clientId: process.env.WORKOS_CLIENT_ID!, email, password });
    await saveSession(res, `${await origin()}/callback`);
    return { error: null };
  } catch (e) {
    return { error: { message: (e as { message?: string }).message ?? 'Sign-in failed.' } };
  }
}

export async function signUp(email: string, password: string): Promise<{ error: { message: string } | null }> {
  try {
    await getWorkOS().userManagement.createUser({ email, password });
    return signInWithPassword(email, password);
  } catch (e) {
    return { error: { message: (e as { message?: string }).message ?? 'Sign-up failed.' } };
  }
}

export async function signOut() { await authkitSignOut({ returnTo: '/' }); }
