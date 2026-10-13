import type {Metadata} from 'next';
import Link from 'next/link';
import {LegalPage, SUPPORT_EMAIL, Section, SupportEmail} from '@/components/legal/legal-page';

// Public, static page: how to request account deletion (Google Play requires a public web URL for this, with a
// way to ask that does not need the app). Must be in the middleware public route list.
export const metadata: Metadata = {
  title: 'Delete your account · Finesse',
  description: 'How to delete your Finesse account — in the app, on the web, or by email — and what happens to your data.',
};

const MAIL_SUBJECT = encodeURIComponent('Delete my Finesse account');
const MAIL_BODY = encodeURIComponent('Please delete my Finesse account.\n\nAccount email: \n\n(Send this from the email address on the account.)');

export default function DeleteInfoPage() {
  return (
    <LegalPage eyebrow="Finesse Life · Account" title="Deleting your account"
      intro={<p>You can delete your Finesse account and its data at any time, from the app, on the web, or by email. It works the same for accounts created in the app and on the web.</p>}>
      <Section id="app" title="In the app">
        <ol>
          <li>Open <strong>This Is You → Your key</strong>.</li>
          <li>Choose <strong>Delete account</strong>, type DELETE, enter your password and confirm.</li>
        </ol>
      </Section>

      <Section id="web" title="On the web">
        <ol>
          <li>Sign in at <Link href="/login">finesselife.vip/login</Link>.</li>
          <li>Open <Link href="/account">finesselife.vip/account</Link> (also reachable from your profile → Account &amp; Privacy).</li>
          <li>Optionally choose “Download my data” to keep a copy.</li>
          <li>Under “Delete account”, type DELETE, enter your password and confirm.</li>
        </ol>
      </Section>

      <Section id="email" title="By email — no sign-in needed">
        <p>If you can’t sign in, or no longer have the app, email <SupportEmail /> <strong>from the email address on your account</strong> with the subject “Delete my Finesse account”.</p>
        <p><a className="ah-pill ah-pill-ghost" style={{minHeight: 44, textDecoration: 'none'}} href={`mailto:${SUPPORT_EMAIL}?subject=${MAIL_SUBJECT}&body=${MAIL_BODY}`}>Email a deletion request</a></p>
        <p>To protect your account we may reply to that address to confirm the request before deleting. We complete email requests within 30 days and tell you when it is done. Forgotten your password instead? Use <strong>Forgot password?</strong> on the sign-in screen.</p>
      </Section>

      <Section id="data" title="What happens to your data">
        <p>Deleting your account removes your profile, posts, photos, the data in your rooms (including people you added to your Entourage), your Nova requests and consents, and cancels any web membership so you are not charged again. Your data is deleted within 30 days of your request.</p>
        <p>Some records may be retained after that where we are required to keep them for legal or financial obligations (for example, payment and transaction records, kept with your identity removed where possible). These are kept only as long as those obligations require. See the <Link href="/privacy#retention">Privacy policy</Link>.</p>
      </Section>
    </LegalPage>
  );
}
