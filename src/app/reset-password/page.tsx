import type {Metadata} from 'next';
import {ResetPasswordForm} from './reset-form';

// Public: the password-recovery link from "Forgot password?" (app or web) lands here with a one-time recovery
// session. Listed in src/lib/supabase/middleware.ts; https://finesselife.vip/reset-password must also be in the
// Supabase Auth redirect allow-list (docs: founder setup).
export const metadata: Metadata = {
  title: 'Set a new password · Finesse',
  description: 'Choose a new password for your Finesse account.',
  robots: {index: false},
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
