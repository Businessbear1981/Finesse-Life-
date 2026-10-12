'use client';

import {useEffect, useState} from 'react';
import {VipRoomView} from '@/app/(hotel)/vip/vip-room-view';
import type {VipPost} from '@/app/(hotel)/vip/vip-post-feed';

const SAMPLE: Omit<VipPost, 'created_at'>[] = [
  {id: '1', content: 'Rooftop at 11. Two tables held for the floor, ask Nova for the list.', media_urls: null, likes_count: 24,
    author: {display_name: 'Jade Okafor', username: 'jade', avatar_url: null, vibe: 'Host'}},
  {id: '2', content: 'The new drop is in the Vault. Platinum holders get first look until midnight.', media_urls: null, likes_count: 61,
    author: {display_name: 'Marcus Kim', username: 'marcus', avatar_url: null, vibe: 'Key holder'}},
  {id: '3', content: 'Anyone else upstairs tonight? The view from 17 is unreal.', media_urls: null, likes_count: 9,
    author: {display_name: 'Sofia Ortiz', username: 'sofia', avatar_url: null, vibe: null}},
];

/** Preview only: answer the lift's API so every state can be shown without a database. */
function useLiftStub(lift: string) {
  useEffect(() => {
    const real = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const json = (b: unknown) => new Response(JSON.stringify(b), {headers: {'Content-Type': 'application/json'}});
      if (url.includes('/api/vip-keylock/challenge')) {
        await new Promise((r) => setTimeout(r, 500));
        if (lift === 'verify' || lift === 'enroll') {
          return json({state: 'ready', challengeId: '00000000-0000-4000-8000-000000000000', mode: lift, expiresAt: '', traceId: 'preview'});
        }
        const msg: Record<string, string> = {
          not_entitled: 'The Penthouse opens to key holders.',
          expired: 'Your key lapsed. Renew to ride again.',
          rate_limited: 'Too many tries. The lift will answer again shortly.',
          unavailable: 'The private lift is being serviced.',
          signed_out: 'Sign in to call the lift.',
        };
        return json({state: lift, message: msg[lift] ?? 'Unavailable.', traceId: 'preview'});
      }
      if (url.includes('/api/vip-keylock/verify')) {
        await new Promise((r) => setTimeout(r, 600));
        const code = JSON.parse(String(init?.body ?? '{}')).code as string;
        if (code === '000000') return json({state: 'invalid', message: 'Not quite. Two tries left.', attemptsRemaining: 2, traceId: 'preview'});
        return json({state: 'unlocked', destination: 'penthouse', href: '/design/after-hours/penthouse', expiresAt: '', traceId: 'preview'});
      }
      return real(input, init);
    };
    return () => {
      window.fetch = real;
    };
  }, [lift]);
}

export function VipPreview({state, lift}: {state: string; lift: string}) {
  const [now] = useState(() => Date.now());
  useLiftStub(lift);
  const posts: VipPost[] = state === 'empty' ? [] : SAMPLE.map((p, i) => ({...p, created_at: new Date(now - [12, 95, 60 * 26][i] * 60e3).toISOString()}));
  return (
    <VipRoomView
      posts={posts}
      currentUserId="preview"
      telegramBot="FinesseVIPBot"
      telegramHandle={state === 'member' ? 'amaracole' : null}
    />
  );
}
