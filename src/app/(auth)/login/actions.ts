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
    const {data: profile} = await supabase
      .from('profiles')
      .select('intake_complete')
      .eq('id', user.id)
      .single();

    if (!profile?.intake_complete) {
      redirect('/intake');
    }
  }

  redirect('/lobby');
}
