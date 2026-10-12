// Who is signed in on this device, as a hook. `undefined` while the stored session is being read,
// `null` when nobody is signed in. Rooms use this to decide between a live view and a sign-in prompt.
import {useEffect, useState} from 'react';
import {supabase} from './supabase';

export type Member = {userId: string; email: string | null; token: string};

export function useMember(): Member | null | undefined {
  const [member, setMember] = useState<Member | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession()
      .then(({data}) => { if (alive) setMember(data.session ? {userId: data.session.user.id, email: data.session.user.email ?? null, token: data.session.access_token} : null); })
      .catch(() => { if (alive) setMember(null); });
    const {data: sub} = supabase.auth.onAuthStateChange((_e, s) => {
      if (alive) setMember(s ? {userId: s.user.id, email: s.user.email ?? null, token: s.access_token} : null);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return member;
}
