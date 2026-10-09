'use server';

import {timingSafeEqual} from 'crypto';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

// Demo access. The demo account's credentials and the accepted access codes live
// only in server env vars (DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD, DEMO_ACCESS_CODES —
// comma-separated). Nothing about the account ever reaches the browser bundle.

const CLOSED = 'Demo access is closed.';
const INVALID = 'Invalid access code.';

function sameCode(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function enterDemo(
  _prevState: {error: string | null},
  formData: FormData,
): Promise<{error: string | null}> {
  const email = process.env.DEMO_ACCOUNT_EMAIL?.trim();
  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  const codes = (process.env.DEMO_ACCESS_CODES ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (!email || !password || codes.length === 0) {
    return {error: CLOSED};
  }

  const raw = formData.get('code');
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (!code) return {error: INVALID};

  // Check every code so the response time doesn't reveal which (if any) matched.
  let match = false;
  for (const c of codes) {
    if (sameCode(code, c)) match = true;
  }
  if (!match) return {error: INVALID};

  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) {
    // The configured account could not sign in — say so honestly, without detail.
    return {error: CLOSED};
  }

  redirect('/lobby');
}
