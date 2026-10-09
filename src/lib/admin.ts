import type {User} from '@supabase/supabase-js';

type ProfileReader = {
  from: (table: 'profiles') => {
    select: (cols: 'role') => {
      eq: (col: 'id', v: string) => {maybeSingle: () => PromiseLike<{data: {role?: string | null} | null}>};
    };
  };
};

/**
 * One admin rule for the whole app: `profiles.role` is 'admin' or 'owner'
 * (server-managed since 20261009_security_floor.sql — members cannot set it), or the
 * signed-in email equals ADMIN_EMAIL. The old `username === 'admin'` rule is gone:
 * usernames are member-chosen.
 */
export async function isAdmin(supabase: unknown, user: Pick<User, 'id' | 'email'> | null): Promise<boolean> {
  if (!user) return false;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && user.email?.toLowerCase() === adminEmail) return true;
  const {data} = await (supabase as ProfileReader).from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin' || data?.role === 'owner';
}
