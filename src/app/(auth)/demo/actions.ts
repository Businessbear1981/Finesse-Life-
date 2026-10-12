'use server';

import {signInWithPassword} from '@/lib/data/auth';

// Demo access codes map to one demo account. Codes and password live in server env only
// (they were previously shipped to the browser): DEMO_CODES, DEMO_EMAIL, DEMO_PASSWORD.
export async function demoSignIn(code: string): Promise<{error: {message: string} | null}> {
  const codes = (process.env.DEMO_CODES ?? '').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (!codes.includes(code.trim().toUpperCase()) || !process.env.DEMO_EMAIL || !process.env.DEMO_PASSWORD) {
    return {error: {message: 'Invalid access code.'}};
  }
  return signInWithPassword(process.env.DEMO_EMAIL, process.env.DEMO_PASSWORD);
}
