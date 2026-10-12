'use server';

import {redirect} from 'next/navigation';
import {signUp as workosSignUp} from '@/lib/data/auth';

export async function signUp(
  _prevState: {error: string | null},
  formData: FormData,
): Promise<{error: string | null}> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const ageConfirmed = formData.get('ageConfirmed');
  const termsAccepted = formData.get('termsAccepted');

  if (!email || !password) {
    return {error: 'Email and password are required.'};
  }

  if (password.length < 8) {
    return {error: 'Password must be at least 8 characters.'};
  }

  if (password !== confirmPassword) {
    return {error: 'Passwords do not match.'};
  }

  if (!ageConfirmed) {
    return {error: 'You must confirm you are 18 or older.'};
  }

  if (!termsAccepted) {
    return {error: 'You must accept the terms to continue.'};
  }

  const {error} = await workosSignUp(email, password);

  if (error) {
    return {error: error.message};
  }

  redirect('/intake');
}
