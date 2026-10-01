/**
 * VIP / Penthouse private lift — server helpers.
 * The lift NEVER grants VIP. It proves an already-entitled member (profiles.is_vip
 * + vip_expires_at, granted by /api/vip/redeem) may open a cinematic destination,
 * and issues a short-lived, scoped session separate from every other KeyLock.
 */
import {cookies} from 'next/headers';
import {createClient} from '@/lib/supabase/server';
import {VIP_LIFT_COOKIE, hasServiceRole, keylockSecret, service, sha256} from '@/lib/keylock-server';

export type Entitlement =
  | {state: 'signed_out'}
  | {state: 'not_entitled'; userId: string}
  | {state: 'expired'; userId: string}
  | {state: 'entitled'; userId: string; vipExpiresAt: string | null};

export async function getVipEntitlement(): Promise<Entitlement> {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return {state: 'signed_out'};
  const {data: profile} = await supabase
    .from('profiles')
    .select('is_vip, vip_expires_at')
    .eq('id', user.id)
    .single();
  if (!profile?.is_vip) return {state: 'not_entitled', userId: user.id};
  if (profile.vip_expires_at && new Date(profile.vip_expires_at) <= new Date()) return {state: 'expired', userId: user.id};
  return {state: 'entitled', userId: user.id, vipExpiresAt: profile.vip_expires_at};
}

export const liftReady = () => Boolean(keylockSecret() && hasServiceRole());

export const LIFT_COPY = {
  signed_out: 'The private lift answers to members. Sign in to call it.',
  not_entitled: 'Your membership does not include this floor yet.',
  expired: 'Your inner-room grant has lapsed. Renew to ride again.',
  invalid: 'The mechanism holds. Try again, or request an invitation.',
  rate_limited: 'The lift is resting. Try again in a few minutes.',
  unavailable: 'The private lift is being serviced.',
  challenge_expired: 'The tumblers reset. Call the lift again.',
} as const;

/** Server-side check of the lift cookie: valid token hash, owner, not revoked/expired, still VIP. */
export async function getActiveLiftSession(): Promise<
  {active: true; userId: string; destination: 'vip-room' | 'penthouse'; expiresAt: string} | {active: false}
> {
  if (!liftReady()) return {active: false};
  const token = (await cookies()).get(VIP_LIFT_COOKIE)?.value;
  if (!token) return {active: false};
  const ent = await getVipEntitlement();
  if (ent.state !== 'entitled') return {active: false};
  const {data} = await service()
    .from('vip_lift_sessions')
    .select('user_id, destination, expires_at, revoked_at')
    .eq('token_hash', sha256(token))
    .maybeSingle();
  if (!data || data.user_id !== ent.userId || data.revoked_at || new Date(data.expires_at) <= new Date()) return {active: false};
  return {active: true, userId: ent.userId, destination: data.destination, expiresAt: data.expires_at};
}
