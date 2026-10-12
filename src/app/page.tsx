'use client';

import {useState, useRef, useEffect, useCallback} from 'react';
import {useAnimation, useReducedMotion} from 'framer-motion';
import {useRouter} from 'next/navigation';
import {EntranceView, type EntranceGender} from './entrance-view';

// The accepted code is never shipped to the browser. All six digits are verified
// once, server-side, by POST /api/keylock/entrance/verify (see src/lib/entrance-keylock.ts).
type EntranceMode = 'production' | 'preview';
type Challenge = {challengeId: string; mode: EntranceMode};

// Door-voice copy for the server's verify states. Anything else shows the server's own message.
const DOOR_COPY: Record<string, string> = {
  invalid: 'Not on the list. Check your invitation and try again.',
  expired: 'Your place in line timed out. Start again.',
  rate_limited: 'The door is resting. Try again in a few minutes.',
};

async function requestChallenge(): Promise<Challenge | {error: string}> {
  try {
    const res = await fetch('/api/keylock/entrance/challenge', {method: 'POST', cache: 'no-store'});
    const body = await res.json() as {state: string; challengeId?: string; mode?: EntranceMode; message?: string};
    if (body.state === 'ready' && body.challengeId && body.mode) return {challengeId: body.challengeId, mode: body.mode};
    return {error: DOOR_COPY[body.state] ?? body.message ?? 'The entrance is being serviced.'};
  } catch {
    return {error: 'The entrance is being serviced.'};
  }
}

export default function Entrance() {
  const [digits, setDigits] = useState<string[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [lightFlood, setLightFlood] = useState(false);
  const [showGenderSelect, setShowGenderSelect] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState(DOOR_COPY.invalid);
  const reduceMotion = useReducedMotion() ?? false;
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const shakeControls = useAnimation();

  const loadChallenge = useCallback(async () => {
    const next = await requestChallenge();
    if ('error' in next) { setChallenge(null); setMessage(next.error); return; }
    setChallenge(next);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial challenge fetch on mount
    void loadChallenge();
  }, [loadChallenge]);

  // Clear the newest-digit glow after 700ms
  useEffect(() => {
    if (flash === null) return;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [flash]);

  const selectGender = (gender: EntranceGender) => {
    // Visual side selection only — never an entitlement or identity claim.
    localStorage.setItem('finesse_gender', gender);
    localStorage.setItem('finesse_track', gender === 'masculine' ? 'carpe_diem' : 'finesse');
    router.push('/lobby');
  };

  const reset = useCallback(() => {
    setDigits([]);
    setFlash(null);
    setError(false);
    setOpening(false);
    setLightFlood(false);
    setShowGenderSelect(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const fail = useCallback((text: string) => {
    setMessage(text);
    setError(true);
    if (!reduceMotion) shakeControls.start({x: [0, -14, 14, -9, 9, -5, 5, 0], transition: {duration: 0.5}});
    setTimeout(() => { reset(); void loadChallenge(); }, 1400);
  }, [shakeControls, reset, loadChallenge, reduceMotion]);

  const verify = useCallback(async (code: string) => {
    if (!challenge) { fail('The entrance is being serviced.'); return; }
    setVerifying(true);
    try {
      const res = await fetch('/api/keylock/entrance/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({challengeId: challenge.challengeId, code}),
      });
      const body = await res.json() as {state: string; message?: string};
      if (body.state !== 'open') { fail(DOOR_COPY[body.state] ?? body.message ?? DOOR_COPY.invalid); return; }
      // Server approved — only now does the door open and the light come through.
      const lag = reduceMotion ? 0 : 1;
      setOpening(true);
      setTimeout(() => setLightFlood(true), 900 * lag);
      setTimeout(() => setShowGenderSelect(true), reduceMotion ? 200 : 2100);
    } catch {
      fail('The entrance is being serviced.');
    } finally {
      setVerifying(false);
    }
  }, [challenge, fail, reduceMotion]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (opening || error || showGenderSelect || verifying) return;

    const prevLen = digits.length;
    const newLen = val.length;

    if (newLen <= prevLen) {
      // Backspace allowed
      setDigits(val.split(''));
      return;
    }

    if (newLen > 6) return;

    // Each digit warms the door a little. Correctness is NOT revealed per digit
    // (that would leak the code one digit at a time).
    setDigits(val.split(''));
    setFlash(newLen - 1);

    if (newLen === 6) setTimeout(() => void verify(val), reduceMotion ? 0 : 450);
  }, [digits, opening, error, showGenderSelect, verifying, verify, reduceMotion]);

  return (
    <EntranceView
      digits={digits}
      flash={flash}
      error={error}
      message={message}
      verifying={verifying}
      preview={challenge?.mode === 'preview'}
      opening={opening}
      lightFlood={lightFlood}
      showChoice={showGenderSelect}
      reduceMotion={reduceMotion}
      inputRef={inputRef}
      onInput={handleInput}
      onChoose={selectGender}
      shake={shakeControls}
    />
  );
}
