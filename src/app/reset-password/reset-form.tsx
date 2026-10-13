'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {createClient as createSupabaseClient, type SupabaseClient} from '@supabase/supabase-js';
import {AHDisplay, AHEyebrow, AHRoom, AHTopBar} from '@/components/after-hours';
import {createClient as createBrowserClient} from '@/lib/supabase/client';
import {LegalFooter} from '@/components/legal/legal-page';
import '@/components/legal/legal.css';

type Phase = 'checking' | 'ready' | 'saving' | 'done' | 'invalid';

const MIN_LENGTH = 8;

/**
 * Turns the recovery link into a session, then lets the member set a new password.
 * Three link shapes are handled:
 *   - implicit (mobile app's resetPasswordForEmail): #access_token=…&refresh_token=…&type=recovery
 *   - token hash (custom email template):            ?token_hash=…&type=recovery
 *   - PKCE (web-initiated):                          ?code=…  (verifier is in this browser's cookies)
 * Implicit/token-hash sessions live in memory only (no cookies) — the page sets the password and that's it.
 */
async function recoverySession(): Promise<{client: SupabaseClient; error: null} | {client: null; error: string}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {client: null, error: 'Password reset is not configured on this server.'};

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const linkError = hash.get('error_description') ?? query.get('error_description');
  if (linkError) return {client: null, error: linkError.replace(/\+/g, ' ')};

  const memory = () => createSupabaseClient(url, key, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit'}});

  const access = hash.get('access_token');
  const refresh = hash.get('refresh_token');
  if (access && refresh) {
    const client = memory();
    const {error} = await client.auth.setSession({access_token: access, refresh_token: refresh});
    return error ? {client: null, error: ''} : {client, error: null};
  }

  const tokenHash = query.get('token_hash');
  if (tokenHash) {
    const client = memory();
    const {error} = await client.auth.verifyOtp({token_hash: tokenHash, type: 'recovery'});
    return error ? {client: null, error: ''} : {client, error: null};
  }

  if (query.get('code')) {
    const client = createBrowserClient() as unknown as SupabaseClient;
    // The browser client may already have exchanged the code while initialising.
    const {data} = await client.auth.getSession();
    if (data.session) return {client, error: null};
    const {error} = await client.auth.exchangeCodeForSession(query.get('code')!);
    return error ? {client: null, error: ''} : {client, error: null};
  }

  return {client: null, error: 'This page needs the link from your password-reset email.'};
}

export function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [problem, setProblem] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const client = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let alive = true;
    void recoverySession().then((r) => {
      if (!alive) return;
      // Tokens out of the address bar (and history) as soon as they're read.
      window.history.replaceState(null, '', window.location.pathname);
      if (r.client) { client.current = r.client; setPhase('ready'); }
      else { setProblem(r.error); setPhase('invalid'); }
    });
    return () => { alive = false; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.current) return;
    if (pw.length < MIN_LENGTH) { setProblem(`Use at least ${MIN_LENGTH} characters.`); return; }
    if (pw !== pw2) { setProblem('The two passwords don’t match.'); return; }
    setPhase('saving'); setProblem(null);
    const {error} = await client.current.auth.updateUser({password: pw});
    if (error) { setProblem(`Your password was not changed: ${error.message}`); setPhase('ready'); return; }
    await client.current.auth.signOut({scope: 'local'}).catch(() => {});
    client.current = null;
    setPw(''); setPw2('');
    setPhase('done');
  };

  return (
    <AHRoom>
      <AHTopBar right={<Link href="/login" className="ah-pill ah-pill-ghost" style={{minHeight: 44, fontSize: 13}}>Sign in</Link>} />
      <main style={{maxWidth: 420, margin: '0 auto', paddingTop: 18, paddingBottom: 60}}>
        <AHEyebrow>Members · Your key</AHEyebrow>
        <AHDisplay size="m" style={{marginTop: 8}}>{phase === 'done' ? 'Password set.' : 'A new password.'}</AHDisplay>

        {phase === 'checking' && <p role="status" style={{marginTop: 16, color: 'var(--ah-mute)'}}>Checking your link…</p>}

        {phase === 'invalid' && (
          <div className="ah-card" style={{padding: 22, marginTop: 22}}>
            <p role="alert" style={{margin: 0, color: '#ff8aa0', lineHeight: 1.55}}>This reset link can’t be used{problem ? ` — ${problem}` : ''}. Links work once and expire after a short time.</p>
            <p style={{margin: '12px 0 0', color: 'var(--ah-mute)', lineHeight: 1.55}}>Ask for a new one with <strong>Forgot password?</strong> on the sign-in screen in the app or at <Link className="lg-link" href="/login">finesselife.vip/login</Link>.</p>
          </div>
        )}

        {(phase === 'ready' || phase === 'saving') && (
          <div className="ah-card ah-card-glass" style={{padding: 22, marginTop: 22}}>
            <form onSubmit={submit} className="lg-form">
              <div>
                <label htmlFor="pw" className="ah-eyebrow">New password</label>
                <input id="pw" type="password" autoComplete="new-password" required minLength={MIN_LENGTH} className="ah-input" value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pw2" className="ah-eyebrow">Repeat it</label>
                <input id="pw2" type="password" autoComplete="new-password" required minLength={MIN_LENGTH} className="ah-input" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              {problem && <p role="alert" style={{margin: 0, fontSize: 14, color: '#ff8aa0', textAlign: 'center'}}>{problem}</p>}
              <button type="submit" disabled={phase === 'saving'} className="ah-pill ah-pill-solid ah-pill-block" style={{minHeight: 50}}>
                {phase === 'saving' ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          </div>
        )}

        {phase === 'done' && (
          <div className="ah-card" style={{padding: 22, marginTop: 22}}>
            <p role="status" style={{margin: 0, lineHeight: 1.55}}>Your password has been changed. Return to the Finesse app — or <Link className="lg-link" href="/login">sign in on the web</Link> — with your new password.</p>
          </div>
        )}
        <LegalFooter />
      </main>
    </AHRoom>
  );
}
