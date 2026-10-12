'use client';

import {useState, type FormEvent, type ReactNode} from 'react';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';

type Status = {kind: 'idle'} | {kind: 'busy'} | {kind: 'ok'; text: string} | {kind: 'error'; text: string};

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function retryText(body: Record<string, unknown>, res: Response): string {
  const s = Number(body.retryAfterS ?? res.headers.get('Retry-After'));
  return Number.isFinite(s) && s > 0 ? ` Try again in ${Math.ceil(s)} s.` : ' Try again shortly.';
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Section({title, tone = 'brass', children}: {title: string; tone?: 'brass' | 'oxblood'; children: ReactNode}) {
  const danger = tone === 'oxblood';
  return (
    <section
      className="w-full px-5 py-5 mb-6"
      style={{
        border: danger ? '1px solid rgba(255,77,125,0.15)' : '1px solid rgba(201,169,97,0.1)',
        background: danger ? 'rgba(74,25,34,0.06)' : 'rgba(10,4,6,0.6)',
      }}
    >
      <h2
        className="font-label text-[9px] tracking-[0.35em] uppercase mb-3"
        style={{color: danger ? 'rgba(255,77,125,0.6)' : 'rgba(201,169,97,0.5)'}}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Copy({children}: {children: ReactNode}) {
  return (
    <p className="font-body text-sm leading-relaxed mb-4" style={{color: 'rgba(244,232,208,0.55)'}}>
      {children}
    </p>
  );
}

function Field(props: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block mb-3">
      <span className="block font-label text-[8px] tracking-[0.3em] uppercase mb-1.5" style={{color: 'rgba(201,169,97,0.4)'}}>
        {props.label}
      </span>
      <input
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        className="w-full bg-transparent px-3 py-2 font-body text-sm outline-none"
        style={{border: '1px solid rgba(201,169,97,0.15)', color: '#F4E8D0'}}
      />
    </label>
  );
}

function StatusLine({status}: {status: Status}) {
  if (status.kind !== 'ok' && status.kind !== 'error') return null;
  return (
    <p
      role={status.kind === 'error' ? 'alert' : 'status'}
      className="font-body text-xs italic mt-3"
      style={{color: status.kind === 'error' ? '#FF4D7D' : '#E8C87A'}}
    >
      {status.text}
    </p>
  );
}

function ActionButton({disabled, danger, children}: {disabled: boolean; danger?: boolean; children: ReactNode}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-block px-8 py-2.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        border: danger ? '1px solid rgba(255,77,125,0.35)' : '1px solid rgba(201,169,97,0.2)',
        color: danger ? '#FF4D7D' : 'rgba(201,169,97,0.7)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Lift PIN reset (VIP) ─────────────────────────────────────────────────────

function PinReset() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>({kind: 'idle'});

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setStatus({kind: 'busy'});
    try {
      const res = await fetch('/api/vip-keylock/pin-reset', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password}),
      });
      const body = await readJson(res);
      if (res.ok && body.state === 'reset') {
        setPassword('');
        setStatus({kind: 'ok', text: 'Your lift PIN has been reset. Set a new one the next time you take the Private Lift.'});
      } else if (res.status === 401) {
        setStatus({kind: 'error', text: 'That password is not correct.'});
      } else if (res.status === 403) {
        setStatus({kind: 'error', text: 'The Private Lift is for active VIP members.'});
      } else if (res.status === 429) {
        setStatus({kind: 'error', text: `Too many attempts.${retryText(body, res)}`});
      } else {
        setStatus({kind: 'error', text: typeof body.error === 'string' ? body.error : 'The PIN could not be reset. Try again.'});
      }
    } catch {
      setStatus({kind: 'error', text: 'Network error. Try again.'});
    }
  }

  return (
    <Section title="Private Lift PIN">
      <Copy>
        Forgotten your lift PIN? Confirm your password to clear it, then choose a new one at the{' '}
        <Link href="/lobby#private-lift" className="underline" style={{color: 'rgba(201,169,97,0.7)'}}>
          Private Lift
        </Link>
        .
      </Copy>
      <form onSubmit={submit}>
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <ActionButton disabled={!password || status.kind === 'busy'}>
          {status.kind === 'busy' ? 'Resetting…' : 'Reset lift PIN'}
        </ActionButton>
      </form>
      <StatusLine status={status} />
    </Section>
  );
}

// ─── Delete account ───────────────────────────────────────────────────────────

function DeleteAccount() {
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>({kind: 'idle'});
  const ready = confirm === 'DELETE' && password.length > 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setStatus({kind: 'busy'});
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({confirm: 'DELETE', password}),
      });
      const body = await readJson(res);
      if (res.ok && body.deleted === true) {
        setStatus({kind: 'ok', text: 'Your account has been deleted. Goodbye.'});
        try {
          await createClient().auth.signOut();
        } catch {
          // The session may already be gone server-side; leaving anyway.
        }
        window.location.replace('/');
        return;
      }
      if (res.status === 401) {
        setStatus({kind: 'error', text: 'That password is not correct.'});
      } else if (res.status === 429) {
        setStatus({kind: 'error', text: `Too many attempts.${retryText(body, res)}`});
      } else {
        setStatus({
          kind: 'error',
          text: typeof body.error === 'string' ? body.error : 'Your account could not be deleted. Try again or contact the front desk.',
        });
      }
    } catch {
      setStatus({kind: 'error', text: 'Network error. Try again.'});
    }
  }

  return (
    <Section title="Delete account" tone="oxblood">
      <Copy>
        This permanently deletes your Finesse account and your profile, posts and room data. Your data is
        deleted within 30 days, except records we must keep for legal or financial obligations. This cannot
        be undone. Download your data first if you want a copy.
      </Copy>
      <form onSubmit={submit}>
        <Field label='Type "DELETE" to confirm' type="text" value={confirm} onChange={setConfirm} autoComplete="off" placeholder="DELETE" />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <ActionButton danger disabled={!ready || status.kind === 'busy' || status.kind === 'ok'}>
          {status.kind === 'busy' ? 'Deleting…' : 'Delete my account'}
        </ActionButton>
      </form>
      <StatusLine status={status} />
    </Section>
  );
}

// ─── Page body ────────────────────────────────────────────────────────────────

export function AccountActions({isVip}: {isVip: boolean}) {
  return (
    <div className="flex flex-col items-stretch">
      <Section title="Your data">
        <Copy>Download a copy of everything Finesse holds about you, as a JSON file.</Copy>
        <a
          href="/api/identity/export"
          download
          className="inline-block px-8 py-2.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
          style={{border: '1px solid rgba(201,169,97,0.2)', color: 'rgba(201,169,97,0.7)'}}
        >
          Download my data
        </a>
      </Section>

      {isVip && <PinReset />}

      <DeleteAccount />
    </div>
  );
}
