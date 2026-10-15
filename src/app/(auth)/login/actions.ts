'use server';

import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export async function signIn(
  _prevState: {error: string | null},
  formData: FormData,
): Promise<{error: string | null}> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {error: 'Email and password are required.'};
  }

  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword({email, password});

  if (error) {
    return {error: error.message};
  }

  // Check profile for intake completion
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (user) {
    // Own row via the SECURITY DEFINER helper (intake_complete is not SELECT-granted, 20261020_s4).
    const {data: rows} = await supabase.rpc('get_own_profile');
    const profile = rows?.[0] as {intake_complete?: boolean | null} | undefined;

    if (!profile?.intake_complete) {
      redirect('/intake');
    }
  }

  redirect('/lobby');
}
