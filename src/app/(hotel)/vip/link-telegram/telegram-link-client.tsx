'use client';

import {useState} from 'react';

interface LinkResponse {
  ok: true;
  instructions: string;
  bot_username: string;
  link_code: string;
  expires_in_s: number;
}

type Status =
  | {kind: 'idle'}
  | {kind: 'loading'}
  | {kind: 'ready'; data: LinkResponse; issuedAt: number}
  | {kind: 'error'; message: string};

export function TelegramLinkClient() {
  const [status, setStatus] = useState<Status>({kind: 'idle'});
  const [copied, setCopied] = useState(false);

  async function requestCode() {
    setStatus({kind: 'loading'});
    setCopied(false);
    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: '{}',
      });
      const body = (await res.json().catch(() => null)) as
        | (Partial<LinkResponse> & {error?: string})
        | null;
      if (res.status === 503) {
        setStatus({kind: 'error', message: body?.error ?? 'Telegram is not connected yet.'});
        return;
      }
      if (res.status === 401) {
        setStatus({kind: 'error', message: 'Your session has ended. Sign in again to link Telegram.'});
        return;
      }
      if (!res.ok || !body?.ok || !body.link_code) {
        setStatus({kind: 'error', message: body?.error ?? 'Could not issue a link code. Try again.'});
        return;
      }
      setStatus({kind: 'ready', data: body as LinkResponse, issuedAt: Date.now()});
    } catch {
      setStatus({kind: 'error', message: 'Could not reach the front desk. Try again.'});
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const card = {
    border: '1px solid rgba(201,169,97,0.14)',
    background: 'rgba(10,4,6,0.8)',
    boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
  } as const;

  if (status.kind === 'ready') {
    const {data, issuedAt} = status;
    const command = `/link ${data.link_code}`;
    const minutes = Math.round(data.expires_in_s / 60);
    const expiresAt = new Date(issuedAt + data.expires_in_s * 1000).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    return (
      <div className="p-6 space-y-5" style={card}>
        <ol className="space-y-2">
          {data.instructions.split('\n').map((line) => (
            <li key={line} className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.7)'}}>
              {line}
            </li>
          ))}
        </ol>

        <div>
          <p
            className="font-label text-[8px] tracking-[0.35em] uppercase mb-2"
            style={{color: 'rgba(201,169,97,0.45)'}}
          >
            Send this to @{data.bot_username}
          </p>
          <div className="flex items-stretch gap-2">
            <code
              className="flex-1 min-w-0 px-3 py-3 font-mono text-[11px] break-all"
              style={{border: '1px solid rgba(201,169,97,0.2)', color: '#F4E8D0', background: 'rgba(201,169,97,0.03)'}}
            >
              {command}
            </code>
            <button
              type="button"
              onClick={() => copy(command)}
              className="px-4 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
              style={{border: '1px solid rgba(201,169,97,0.35)', color: '#C9A961', background: 'rgba(201,169,97,0.06)'}}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.35)'}}>
          This code expires in {minutes} minutes (around {expiresAt}). It links Telegram to your account, so
          don&apos;t share it.
        </p>

        <button
          type="button"
          onClick={requestCode}
          className="font-label text-[9px] tracking-[0.3em] uppercase"
          style={{color: 'rgba(201,169,97,0.45)'}}
        >
          Issue a fresh code
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 text-center" style={card}>
      <p className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.6)'}}>
        We&apos;ll issue a short-lived link code. Send it to the Finesse bot on Telegram and your
        account will be connected.
      </p>
      {status.kind === 'error' && (
        <p className="font-body text-xs italic" style={{color: 'rgba(220,80,80,0.85)'}}>
          {status.message}
        </p>
      )}
      <button
        type="button"
        onClick={requestCode}
        disabled={status.kind === 'loading'}
        className="inline-flex items-center gap-2 px-6 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 disabled:opacity-40"
        style={{border: '1px solid rgba(201,169,97,0.35)', color: '#C9A961', background: 'rgba(201,169,97,0.04)'}}
      >
        {status.kind === 'loading' ? 'Issuing…' : status.kind === 'error' ? 'Try again' : 'Get my link code'}
      </button>
    </div>
  );
}
