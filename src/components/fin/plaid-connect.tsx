'use client';
import {useState} from 'react';

type PlaidHandler = {open: () => void; destroy: () => void};
type PlaidGlobal = {create: (o: {token: string; onSuccess: (publicToken: string) => void; onExit: (err: unknown) => void}) => PlaidHandler};
declare global { interface Window { Plaid?: PlaidGlobal } }

const LINK_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
function loadLink(): Promise<PlaidGlobal> {
  if (window.Plaid) return Promise.resolve(window.Plaid);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = LINK_SRC; s.async = true;
    s.onload = () => (window.Plaid ? res(window.Plaid) : rej(new Error('Plaid Link failed to load')));
    s.onerror = () => rej(new Error('Plaid Link failed to load'));
    document.head.appendChild(s);
  });
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as {error?: string}).error ?? `HTTP ${r.status}`);
  return j as T;
}

export const PLAID_PURPOSE = 'Show my account balances in Per Diem and Nightvision so Nova can plan within my budget.';

/**
 * Consent first (scopes + purpose shown verbatim and recorded), then Plaid Link, then server-side exchange.
 * The public token goes straight to our server; the access token never reaches the browser.
 */
export function PlaidConnect({onDone, onClose}: {onDone: (msg: string) => void; onClose: () => void}) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const {consent_id} = await post<{consent_id: string}>('/api/plaid/consents', {scopes: ['accounts', 'balances'], purpose: PLAID_PURPOSE, accepted: true});
      const {link_token} = await post<{link_token: string}>('/api/plaid/link-token', {consent_id});
      const Plaid = await loadLink();
      const h = Plaid.create({
        token: link_token,
        onSuccess: (public_token) => {
          post<{accounts: number; institution_name: string | null}>('/api/plaid/exchange', {consent_id, public_token})
            .then((r) => onDone(`Connected ${r.institution_name ?? 'your bank'} · ${r.accounts} account${r.accounts === 1 ? '' : 's'}`), (e: Error) => setErr(e.message))
            .finally(() => { setBusy(false); h.destroy(); });
        },
        onExit: () => { setBusy(false); h.destroy(); },
      });
      h.open();
    } catch (e) {
      const m = (e as Error).message;
      setErr(m === 'plaid_not_configured' ? 'Bank connections are not switched on yet.' : m);
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="plaid-consent-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-md rounded border p-6 text-sm" style={{background: '#0A0406', borderColor: 'rgba(201,169,97,0.4)', color: '#F4E8D0'}}>
        <h2 id="plaid-consent-title" className="font-display text-xl" style={{color: '#C9A961'}}>Connect a bank, on your terms</h2>
        <p className="mt-3 opacity-80">Finesse will read, through Plaid:</p>
        <ul className="mt-2 list-disc pl-5 opacity-80">
          <li>Account names, type and the last 4 digits</li>
          <li>Current and available balances</li>
        </ul>
        <p className="mt-3 opacity-80">Purpose: {PLAID_PURPOSE}</p>
        <p className="mt-3 text-xs opacity-60">We never store account or routing numbers or individual transactions, never use this for your Standing, and never share it. Disconnect any time; we delete the data and tell Plaid to revoke access.</p>
        <label className="mt-4 flex items-start gap-2 text-xs"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to share this data for this purpose.</label>
        {err && <p role="alert" className="mt-3 text-xs" style={{color: '#FF4D7D'}}>{err}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" disabled={!agree || busy} onClick={start} className="rounded border px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-40" style={{borderColor: '#C9A961', color: '#C9A961'}}>{busy ? 'Connecting…' : 'Continue to Plaid'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs uppercase tracking-widest opacity-60">Not now</button>
        </div>
      </div>
    </div>
  );
}
