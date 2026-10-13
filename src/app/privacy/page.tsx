import type {Metadata} from 'next';
import Link from 'next/link';
import {LEGAL_UPDATED, LegalPage, Section, SupportEmail} from '@/components/legal/legal-page';

// Public privacy policy (Apple 5.1.1(i), Google Play User Data). Written from what the code actually collects:
// supabase/migrations/*, src/app/api/*, src/lib/ai.ts, src/lib/r2.ts, src/lib/live-map.ts, mobile/src.
// When a feature starts collecting something new, this page changes in the same pull request.
export const metadata: Metadata = {
  title: 'Privacy policy · Finesse',
  description: 'What Finesse collects, why, who processes it, how long it is kept and how to delete it.',
};

const TOC = [
  {id: 'who', label: 'Who we are'},
  {id: 'collect', label: 'What we collect'},
  {id: 'others', label: 'People you add'},
  {id: 'ai', label: 'Nova & AI'},
  {id: 'use', label: 'How we use it'},
  {id: 'processors', label: 'Who processes it'},
  {id: 'retention', label: 'How long'},
  {id: 'rights', label: 'Your choices'},
  {id: 'delete', label: 'Deleting'},
  {id: 'children', label: '18+ only'},
  {id: 'security', label: 'Security'},
  {id: 'contact', label: 'Contact'},
];

const DATA: Array<[string, string, string]> = [
  ['Account', 'Email address, a user id, your password (stored hashed by our authentication provider, never readable by us), sign-in times.', 'To create and secure your account and sign you in.'],
  ['Profile', 'Username, display name, avatar photo, bio, city, interests, your vibe and side of the house, optional age and gender, your concierge’s name and style.', 'To show your profile to members and personalise the house.'],
  ['What you post', 'Lounge posts and photos, likes, comments, VIP feed posts, Wardrobe looks you choose to make public, Exchange listings and offers, Game Room tables, outings you create or join, Registry items and pledges.', 'To run the social and marketplace rooms. Posts and public looks are visible to other members.'],
  ['Photos', 'Photos you take or choose in the Camera, the Stylist, the Wardrobe and your profile. Stored privately in our file storage (Cloudflare R2) under your account; only you can see Camera and Stylist photos.', 'To keep your wardrobe intake and send photos to your stylist. A photo is read by AI only when you ask (see Nova & AI).'],
  ['Recordings (app)', 'Vocals and takes you record in Starmaker’s Booth with the microphone. They stay on your device; Finesse does not receive them unless you choose to share them.', 'So you can record and play back your takes.'],
  ['Your rooms','Diary and calendar items; Kitchen plans and orders; Gym sessions and sets; Salon bookings; trips and Departures; Per Diem budgets and plans; Closet, Bag and Wardrobe items and wishlists; Scrapbook entries.', 'To keep your plans and lists, and so Nova can help with them when you ask.'],
  ['Nova requests', 'What you ask Nova, the requests it drafts, their status and results.', 'To run what you confirm and keep a history you can review.'],
  ['Payments', 'Scale group buys (physical goods): your pledges and their payment state (pledged, payment requested, paid), and the Stripe checkout and payment ids for a pledge you pay. If you buy a membership on the web: a Stripe customer id, subscription status, renewal date and payment events. Card details go directly to Stripe’s checkout page — we never see or store your card number.', 'To run group buys, take payment only when a group reaches its goal, bill you, and keep financial records the law requires.'],
  ['Vault', 'Vault account and ledger entries (balances, transactions) for members who use it.', 'To show your balance and history.'],
  ['Portfolio snapshot (optional)', 'If you connect an Alpaca paper-trading account: the API secret is used once to read the account and is not stored. We keep only a partial API key (its first six characters, so you can recognise which key you connected) and a snapshot — equity, cash, buying power and your five largest positions.', 'To show your paper portfolio in Carpe Diem.'],
  ['Live map (web, optional)', 'Only when you turn sharing on: your browser’s location, snapped to a cell of about 200 m before it is stored, shown to members as an anonymous dot. Each ping expires after 15 minutes; turning sharing off deletes it.', 'To show where the night is happening without identifying anyone.'],
  ['Connected services (optional)', 'If you link Telegram: your Telegram username and chat id. If a social network is connected: the access token it issues.', 'To send you messages you asked for, or post only when you tell us to.'],
  ['Usage signals', 'Records of actions in the house (for example rooms opened, things saved, liked or asked for) and AI usage records (feature, model, token counts, time).', 'To personalise suggestions, prevent abuse, enforce rate limits and understand costs.'],
  ['Reports and safety', 'Reports you make about content or members, members you block, and the content reported.', 'To review reports, enforce our Terms and keep members safe.'],
  ['Support', 'What you send us by email.', 'To answer you.'],
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Finesse · Privacy"
      title="Privacy policy"
      meta={<>Last updated {LEGAL_UPDATED}. Applies to the Finesse app (iOS and Android) and finesselife.vip.</>}
      note={<><strong>Draft for legal review.</strong> This policy describes what the product does today, taken from its code. It has not yet been reviewed by counsel; the founder must have it reviewed (including the company’s legal name and address, and any region-specific rights) before relying on it.</>}
      toc={TOC}
      intro={<p>Finesse is a members-only house: a concierge, private rooms for your plans, and a social floor. This page explains, plainly, what we collect, why, who processes it on our behalf, how long it is kept, and how to delete it. <strong>We do not sell your personal data, we do not share it for advertising, and the app contains no third-party advertising or tracking code.</strong></p>}
    >
      <Section id="who" title="Who we are">
        <p>“Finesse”, “we” and “us” mean the operator of Finesse Life (finesselife.vip). For anything in this policy, write to <SupportEmail />.</p>
      </Section>

      <Section id="collect" title="What we collect and why">
        <p>We collect what you give us and what the house needs to work. Nothing is collected from your device in the background.</p>
        <div className="lg-table-wrap" role="region" aria-label="Data we collect" tabIndex={0}>
          <table className="lg-table">
            <thead><tr><th scope="col">Data</th><th scope="col">What exactly</th><th scope="col">Why</th></tr></thead>
            <tbody>
              {DATA.map(([k, what, why]) => <tr key={k}><td><strong>{k}</strong></td><td>{what}</td><td>{why}</td></tr>)}
            </tbody>
          </table>
        </div>
        <h3>Device permissions</h3>
        <p>The app asks for the camera and your photo library only when you choose to take or pick a photo, and only that photo is uploaded. The <strong>microphone</strong> is used only in Starmaker’s Booth, when you press record: your vocals and takes are recorded and kept on your device, and are not uploaded to Finesse unless you choose to share them. The app does not use your location or contacts. On the web, the live map asks for location only when you turn sharing on.</p>
      </Section>

      <Section id="others" title="Information about other people">
        <p>Some rooms let you write about people in your life — your <strong>Entourage</strong> (names, relationship, city, birthday, what they love, notes and gift ideas), guests on an outing or trip, and people mentioned in your Diary or to Nova. That information is private to you; we use it only to help you (reminders, gift ideas, plans) and it is deleted with your account.</p>
        <p>Please add only what you need, and only where you have a right to share it. Don’t add sensitive details about others (such as health, religion or sexuality). If someone asks us to remove information about them, we will.</p>
      </Section>

      <Section id="ai" title="Nova and AI processing">
        <p><strong>Nova is an AI concierge, not a person.</strong> It runs on <strong>Claude, a model made by Anthropic</strong>. Our servers send requests to Anthropic through Vercel’s AI Gateway (or directly to Anthropic). Before your first use of any AI feature — and before your first photo is read — the app asks for your agreement and records it. Our servers check that agreement on every AI request from the app and finesselife.vip: until you have agreed, nothing you type or choose there is sent to the AI provider.</p>
        <ul>
          <li><strong>What is sent:</strong> what you type to Nova; the context Nova needs for that request (for example your concierge’s style, relevant plans or items from your rooms, your style profile); and, only when you ask (“Read my style”, “Ask the reticle”), the photo you chose.</li>
          <li><strong>What is not sent:</strong> your password, payment card details, or your other photos.</li>
          <li><strong>How the provider uses it:</strong> to produce the reply. Under Anthropic’s commercial terms, data sent through its API is not used to train its models; it may be kept for a limited time for trust-and-safety purposes. Vercel’s gateway forwards requests and keeps usage records.</li>
          <li><strong>Other AI features:</strong> Scrapbook and Lab media generation (images, video, audio) is sent to the media partner named in that feature, only when you start a generation.</li>
          <li><strong>AI can be wrong.</strong> Treat Nova’s replies as suggestions. Nothing is booked, bought or sent unless you confirm it and a partner confirms it. You can report any reply from the reply itself.</li>
          <li>Don’t share sensitive information (passwords, card or bank numbers, health details) with Nova.</li>
        </ul>
        <p>You can withdraw AI consent by deleting your account or writing to <SupportEmail />; Nova and photo reading then stop working for you.</p>
      </Section>

      <Section id="use" title="How we use your information">
        <ul>
          <li>To provide the service you asked for: your account, rooms, Nova, posts, payments.</li>
          <li>To personalise what you see (for example suggestions based on your style profile and activity).</li>
          <li>To keep members safe: reviewing reports, removing content, enforcing our <Link href="/terms">Terms</Link>, preventing fraud and abuse, rate-limiting.</li>
          <li>To run and fix the service, and to meet legal, tax and accounting obligations.</li>
        </ul>
        <p>We do not sell personal data, do not share it with data brokers, and do not use it for third-party advertising or cross-app tracking.</p>
      </Section>

      <Section id="processors" title="Who processes it for us">
        <p>We share data only with service providers that run parts of Finesse for us, under contract, and only what each needs:</p>
        <ul>
          <li><strong>Supabase</strong> — database and sign-in.</li>
          <li><strong>Vercel</strong> — hosting of finesselife.vip and the API, and the AI Gateway.</li>
          <li><strong>Anthropic</strong> — the Claude model behind Nova, photo reading and other AI features.</li>
          <li><strong>Cloudflare (R2)</strong> — storage of photos and media you upload.</li>
          <li><strong>Stripe</strong> — payments: Scale group buys of physical goods (paid on Stripe’s checkout page, in the browser) and memberships bought on the web.</li>
          <li><strong>Alpaca</strong> — only if you connect a paper-trading account.</li>
          <li><strong>Telegram</strong> — only if you link it.</li>
          <li><strong>Media generation partners</strong> (Higgsfield, Suno, ElevenLabs, Meshy) — only for generations you start.</li>
        </ul>
        <p>We may also disclose information if the law requires it, to protect someone’s safety, or as part of a sale or reorganisation of the business (in which case this policy continues to apply).</p>
        <p>What you post in shared rooms (Lounge, VIP feed, Exchange, Game Room, outings), and Wardrobe looks you make public, are visible to other members.</p>
      </Section>

      <Section id="retention" title="How long we keep it">
        <ul>
          <li><strong>Your account and room data:</strong> for as long as you are a member. When you delete your account it is deleted within 30 days.</li>
          <li><strong>Live map location:</strong> 15 minutes per ping, or until you stop sharing.</li>
          <li><strong>Photos:</strong> until you delete the photo or your account.</li>
          <li><strong>Payment and transaction records:</strong> kept, with your identity removed where possible, for as long as tax and financial law requires.</li>
          <li><strong>Reports and safety records:</strong> kept as long as needed to handle the report and to prevent repeat abuse.</li>
          <li><strong>Backups and provider logs</strong> roll off on the providers’ schedules.</li>
        </ul>
      </Section>

      <Section id="rights" title="Your choices and rights">
        <ul>
          <li><strong>See and download:</strong> signed in on the web, open <Link href="/account">Account &amp; Privacy</Link> → “Download my data”.</li>
          <li><strong>Correct:</strong> edit your profile and room entries at any time.</li>
          <li><strong>Delete:</strong> delete a post, photo or entry from where it lives, or delete your whole account (below).</li>
          <li><strong>Withdraw:</strong> turn off live-map sharing at any time; disconnect Telegram or other services; withdraw AI consent by contacting us.</li>
          <li>Depending on where you live you may have further rights (for example to object, restrict processing, or complain to a data-protection authority). Write to <SupportEmail /> and we will respond within 30 days.</li>
        </ul>
      </Section>

      <Section id="delete" title="Deleting your account">
        <p>In the app: <strong>This Is You → Your key → Delete account</strong>. On the web: <Link href="/account">Account &amp; Privacy</Link>. If you can’t sign in, email us — see <Link href="/account/delete-info">how to delete your account</Link>.</p>
      </Section>

      <Section id="children" title="18+ only">
        <p>Finesse is for adults. You must be 18 or older to use it; the app asks you to confirm this. We do not knowingly collect data from anyone under 18. If you believe a minor has an account, tell us at <SupportEmail /> and we will delete it.</p>
      </Section>

      <Section id="security" title="Security">
        <p>Data is encrypted in transit. Access to member data is restricted by row-level security so each member can only reach their own private data; on the phone, your session is kept in the iOS Keychain / Android Keystore. No system is perfectly secure — if we learn of a breach affecting you, we will tell you as the law requires.</p>
      </Section>

      <Section id="contact" title="Changes and contact">
        <p>If we change this policy we will update the date above, and tell you in the app for significant changes. Questions or requests: <SupportEmail />.</p>
      </Section>
    </LegalPage>
  );
}
