import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

// Shared by the billing + Scale pay routes (docs/PAYMENTS.md). The member is the session user
// (cookie or mobile bearer) — request bodies never carry a user id.

export const NO_STORE = {'Cache-Control': 'no-store'} as const;

export const reply = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {status, headers: NO_STORE});

export type SessionMember = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
};

export async function sessionMember(): Promise<SessionMember | null> {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return null;
  return {supabase, userId: user.id, email: user.email ?? null};
}

export const unauthorized = () => reply({error: 'signed_out'}, 401);
export const notConfigured = () => reply({error: 'billing_not_configured'}, 503);
export const upstreamFailure = (where: string, e: unknown) => {
  console.error(`[billing] ${where} failed`, (e as Error)?.message ?? e);
  return reply({error: 'billing_unavailable'}, 502);
};
