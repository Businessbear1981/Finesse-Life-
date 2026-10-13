import type {Metadata} from 'next';
import Link from 'next/link';
import {LEGAL_UPDATED, LegalPage, Section, SupportEmail} from '@/components/legal/legal-page';

// Binding Terms of Membership (Apple 1.2 UGC, Google Play UGC policy): 18+, acceptable use with zero tolerance for
// objectionable content and abusive members, reporting with a 24-hour action commitment, AI disclaimer, payments,
// termination, contact. Public (middleware). Counsel review flagged on the page.
export const metadata: Metadata = {
  title: 'Terms of Membership · Finesse',
  description: 'The agreement between you and Finesse: eligibility, conduct, content, Nova, payments and termination.',
};

const TOC = [
  {id: 'agreement', label: 'The agreement'},
  {id: 'eligibility', label: 'Eligibility'},
  {id: 'account', label: 'Your account'},
  {id: 'conduct', label: 'Zero tolerance'},
  {id: 'content', label: 'Your content'},
  {id: 'reporting', label: 'Reporting'},
  {id: 'nova', label: 'Nova (AI)'},
  {id: 'partners', label: 'Partners'},
  {id: 'payments', label: 'Payments'},
  {id: 'termination', label: 'Termination'},
  {id: 'liability', label: 'Liability'},
  {id: 'contact', label: 'Contact'},
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Finesse · Terms"
      title="Terms of Membership"
      meta={<>Last updated {LEGAL_UPDATED}. These terms apply to the Finesse app and finesselife.vip.</>}
      note={<><strong>Draft for legal review.</strong> These terms are written to match how Finesse works today. The founder must have them reviewed by counsel (including the company’s legal name, governing law and dispute terms) before launch.</>}
      toc={TOC}
    >
      <Section id="agreement" title="1. The agreement">
        <p>These Terms of Membership are a binding agreement between you and the operator of Finesse Life (“Finesse”, “we”). By creating an account, signing in or using the app or website you agree to them and to our <Link href="/privacy">Privacy policy</Link>. If you don’t agree, don’t use Finesse.</p>
        <p>We may update these terms. We will change the date above and tell you in the app about significant changes; continuing to use Finesse after that means you accept the update.</p>
      </Section>

      <Section id="eligibility" title="2. Eligibility — 18+">
        <ul>
          <li>You must be <strong>at least 18 years old</strong> (or the age of majority where you live, if higher). The app asks you to confirm this; if you are under 18, you may not use Finesse.</li>
          <li>Membership is by invitation. You may not use Finesse if we have previously removed you, or if the law prohibits you from using it.</li>
          <li>You must give accurate information and use Finesse only for personal, lawful purposes.</li>
        </ul>
      </Section>

      <Section id="account" title="3. Your account">
        <p>Keep your password and house code private; you are responsible for activity on your account. Tell us at <SupportEmail /> if you think someone else has access. You can delete your account at any time — see <Link href="/account/delete-info">how</Link>.</p>
      </Section>

      <Section id="conduct" title="4. Acceptable use — zero tolerance">
        <p><strong>Finesse has zero tolerance for objectionable content and abusive members.</strong> You must not post, send, list or do anything that:</p>
        <ul>
          <li>harasses, bullies, threatens, stalks, intimidates or demeans anyone, or shares someone’s private information without consent;</li>
          <li>is hateful or discriminatory, including on the basis of race, ethnicity, religion, nationality, disability, sex, gender identity or sexual orientation;</li>
          <li>is sexually explicit, involves nudity, sexualises anyone, or involves anyone under 18 in any way;</li>
          <li>promotes or depicts violence, self-harm, terrorism, or dangerous acts;</li>
          <li>is illegal, or offers illegal goods or services (including drugs, weapons, counterfeit goods, or stolen property);</li>
          <li>is spam, a scam, fraud, misleading, or impersonates a person or brand;</li>
          <li>infringes someone else’s copyright, trademark, privacy or other rights;</li>
          <li>tries to break, scrape, overload or get around the security of Finesse, or misuse Nova (for example to generate harmful content).</li>
        </ul>
        <p>We filter posts for objectionable language, and we may remove any content and suspend or permanently remove any member who breaks these rules, <strong>without warning</strong>. You can block any member, which hides their content from you.</p>
      </Section>

      <Section id="content" title="5. Your content">
        <p>You keep ownership of what you post. You give Finesse a non-exclusive, worldwide, royalty-free licence to host, store, display and share it within Finesse, as needed to run the service, until you delete it or your account. You are responsible for what you post and confirm you have the right to post it — including any information about other people you add to your rooms.</p>
      </Section>

      <Section id="reporting" title="6. Reporting — we act within 24 hours">
        <p>Every post, profile, listing, table and Nova reply has a <strong>Report</strong> option. You can also email <SupportEmail />. We review reports and <strong>act on objectionable content within 24 hours</strong> — removing the content and, where appropriate, removing the member who posted it. Where there is a risk to someone’s safety, contact local emergency services first.</p>
      </Section>

      <Section id="nova" title="7. Nova, the AI concierge">
        <ul>
          <li><strong>Nova is an artificial-intelligence system</strong> (powered by Anthropic’s Claude), not a person. What you send Nova is processed by that provider as described in our <Link href="/privacy#ai">Privacy policy</Link>.</li>
          <li><strong>AI can be wrong.</strong> Nova’s replies, picks, prices, routes and plans are suggestions that may be inaccurate, incomplete or out of date. Check anything important yourself. Nova does not give medical, legal, financial or tax advice.</li>
          <li><strong>Nothing is booked unless confirmed.</strong> Nova drafts requests; nothing is booked, bought, reserved or sent unless you confirm it and a partner confirms it to you. A plan marked “Not booked” is not a reservation.</li>
          <li>Don’t share sensitive information with Nova, and don’t use it to create content that breaks section 4. Report any reply that is harmful or wrong.</li>
        </ul>
      </Section>

      <Section id="partners" title="8. Partners and other members">
        <p>Some things in Finesse are provided by third parties (venues, retailers, drivers, payment and media partners) or by other members (Exchange listings, outings, tables). Their terms apply to what they provide, and they are responsible for it. Deals between members are between those members; we are not a party to them, but we will act on reports of fraud or abuse.</p>
      </Section>

      <Section id="payments" title="9. Payments">
        <ul>
          <li>Most of Finesse is free to members. Where something costs money, the price, what it includes and whether it renews are shown before you pay.</li>
          <li>Memberships bought on finesselife.vip are processed by Stripe and renew until cancelled; you can cancel at any time from your account on the web, and access continues until the end of the paid period. Fees already paid are not refunded except where the law requires.</li>
          <li>Purchases made through the App Store or Google Play (if offered) are governed by Apple’s or Google’s terms, including their refund processes.</li>
          <li>Prices Nova finds are the retailer’s; Finesse does not sell those goods unless it says so at checkout.</li>
        </ul>
      </Section>

      <Section id="termination" title="10. Suspension and termination">
        <p>You may stop using Finesse and delete your account at any time. We may suspend or end your access, and remove your content, if you break these terms, if required by law, or to protect members or Finesse. If we end a paid membership without cause, we will refund the unused part.</p>
      </Section>

      <Section id="liability" title="11. Disclaimers and liability">
        <p>Finesse is provided “as is”. To the extent the law allows, we do not promise it will be uninterrupted or error-free, and we are not liable for indirect or consequential losses, or for the acts of partners or other members. Nothing in these terms limits liability that cannot be limited by law, or your statutory rights as a consumer.</p>
      </Section>

      <Section id="contact" title="12. Contact">
        <p>Questions, reports or legal notices: <SupportEmail />. Help: <Link href="/support">Support</Link>.</p>
      </Section>
    </LegalPage>
  );
}
