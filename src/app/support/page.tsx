import type {Metadata} from 'next';
import Link from 'next/link';
import {LegalPage, SUPPORT_EMAIL, Section, SupportEmail} from '@/components/legal/legal-page';

// Public support page — the store listings' Support URL (Apple 1.5, Google Play contact details).
export const metadata: Metadata = {
  title: 'Support · Finesse',
  description: 'Contact Finesse support, report abuse, reset your password or delete your account.',
};

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="Finesse · The front desk"
      title="Support"
      intro={<p>Write to the front desk and a person will answer. We reply within two business days, and act on reports of abuse within 24 hours.</p>}
      note={<><strong>Founder action:</strong> the mailbox {SUPPORT_EMAIL} is a placeholder until it is created and monitored. It must receive mail before this page is used as the App Store / Google Play support URL.</>}
    >
      <div className="lg-card" style={{marginTop: 26}}>
        <p className="ah-eyebrow" style={{margin: 0}}>Email the front desk</p>
        <p style={{margin: '10px 0 0'}}><a className="lg-mail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
        <p style={{margin: '10px 0 0', fontSize: 14, color: 'var(--ah-mute)'}}>Include the email address on your account. Never send us your password.</p>
      </div>

      <Section id="report" title="Report abuse or objectionable content">
        <p>In the app, use <strong>Report</strong> on the post, profile, listing, table or Nova reply, and <strong>Block</strong> to stop seeing a member. Or email <SupportEmail /> with a link or description. We review every report and act on objectionable content within 24 hours. If someone is in danger, contact local emergency services first.</p>
      </Section>

      <Section id="help" title="Help topics">
        <h3>Signing in</h3>
        <p>Forgot your password? On the sign-in screen choose <strong>Forgot password?</strong> — we email you a link to set a new one at finesselife.vip. The house code at the entrance is shared by invitation; ask the member who invited you.</p>
        <h3>Nova, the concierge</h3>
        <p>Nova is an AI (Anthropic’s Claude). It drafts and suggests; nothing is booked, bought or sent unless you confirm it and a partner confirms it. Replies can be wrong — use <strong>Report this response</strong> on any reply that is.</p>
        <h3>Photos</h3>
        <p>Camera and Stylist photos are private to you and read by AI only when you ask. Delete a photo from the Camera at any time.</p>
        <h3>Payments and membership</h3>
        <p>Memberships bought on the web are managed from your account on finesselife.vip. For billing questions, email us.</p>
        <h3>Your data</h3>
        <p>Download your data from <Link href="/account">Account &amp; Privacy</Link> on the web. Read the <Link href="/privacy">Privacy policy</Link> and <Link href="/terms">Terms of Membership</Link>.</p>
      </Section>

      <Section id="delete" title="Delete your account">
        <p>In the app: <strong>This Is You → Your key → Delete account</strong>. On the web: <Link href="/account">Account &amp; Privacy</Link>. Can’t sign in? <Link href="/account/delete-info">Request deletion by email</Link>.</p>
      </Section>
    </LegalPage>
  );
}
