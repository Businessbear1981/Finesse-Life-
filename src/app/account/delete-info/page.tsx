import type {Metadata} from 'next';
import Link from 'next/link';

// Public, static page: how to request account deletion (Google Play requires a
// public web URL for this). Must be in the middleware public route list.
export const metadata: Metadata = {
  title: 'Delete your account · Finesse',
  description: 'How to delete your Finesse account and what happens to your data.',
};

const steps = [
  <>
    Sign in at{' '}
    <Link href="/login" className="underline" style={{color: '#E8C87A'}}>
      finesselife.vip/login
    </Link>{' '}
    with the email and password for your account.
  </>,
  <>
    Open{' '}
    <Link href="/account" className="underline" style={{color: '#E8C87A'}}>
      finesselife.vip/account
    </Link>{' '}
    (also reachable from your profile → Account &amp; Privacy).
  </>,
  <>Optionally choose “Download my data” to keep a copy.</>,
  <>Under “Delete account”, type DELETE, enter your password and confirm.</>,
];

export default function DeleteInfoPage() {
  return (
    <main className="min-h-screen relative overflow-hidden" style={{background: '#0A0406'}}>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]"
          style={{background: 'radial-gradient(ellipse at top, rgba(201,169,97,0.06) 0%, transparent 60%)'}}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-16 pb-20">
        <p className="text-center font-label text-[9px] tracking-[0.4em] uppercase mb-2" style={{color: 'rgba(201,169,97,0.35)'}}>
          Finesse Life
        </p>
        <h1
          className="text-center font-display text-3xl tracking-wide mb-10"
          style={{color: '#E8C87A', textShadow: '0 0 20px rgba(201,169,97,0.2)'}}
        >
          Deleting your account
        </h1>

        <section className="px-5 py-5 mb-6" style={{border: '1px solid rgba(201,169,97,0.1)', background: 'rgba(10,4,6,0.6)'}}>
          <h2 className="font-label text-[9px] tracking-[0.35em] uppercase mb-4" style={{color: 'rgba(201,169,97,0.5)'}}>
            How to delete your account
          </h2>
          <ol className="list-decimal pl-5 space-y-2 font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.7)'}}>
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="font-body text-sm leading-relaxed mt-4" style={{color: 'rgba(244,232,208,0.55)'}}>
            This works the same for accounts created in the Finesse app and on the web.
          </p>
        </section>

        <section className="px-5 py-5" style={{border: '1px solid rgba(201,169,97,0.1)', background: 'rgba(10,4,6,0.6)'}}>
          <h2 className="font-label text-[9px] tracking-[0.35em] uppercase mb-4" style={{color: 'rgba(201,169,97,0.5)'}}>
            What happens to your data
          </h2>
          <p className="font-body text-sm leading-relaxed mb-3" style={{color: 'rgba(244,232,208,0.7)'}}>
            Deleting your account removes your profile, posts and the data held in your rooms. Your data is
            deleted within 30 days of your request.
          </p>
          <p className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.7)'}}>
            Some records may be retained after that where we are required to keep them for legal or financial
            obligations (for example, payment and transaction records). These are kept only as long as those
            obligations require.
          </p>
        </section>
      </div>
    </main>
  );
}
