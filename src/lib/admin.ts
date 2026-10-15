import type {User} from '@supabase/supabase-js';

type ProfileReader = {
  rpc: (fn: 'get_own_profile') => PromiseLike<{data: Array<{role?: string | null}> | null}>;
};

/**
 * One admin rule for the whole app: `profiles.role` is 'admin' or 'owner'
 * (server-managed since 20261009_security_floor.sql — members cannot set it), or the
 * signed-in email equals ADMIN_EMAIL. The old `username === 'admin'` rule is gone:
 * usernames are member-chosen. The role read goes through the SECURITY DEFINER helper
 * (20261020_s4 revokes `role` from the member role); callers pass the member's session client.
 */
export async function isAdmin(supabase: unknown, user: Pick<User, 'id' | 'email'> | null): Promise<boolean> {
  if (!user) return false;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && user.email?.toLowerCase() === adminEmail) return true;
  const {data} = await (supabase as ProfileReader).rpc('get_own_profile');
  const row = data?.[0];
  return row?.role === 'admin' || row?.role === 'owner';
}
