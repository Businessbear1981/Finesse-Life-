'use client';

// Browser helpers for the Nova request hub (/api/nova/requests). Session cookie auth; the server owns
// ownership checks. Every helper resolves (never throws) to {ok, status, request|requests, error}.

import {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {toRequest, type NovaRequest, type RequestKind} from '@/lib/nova-request-view';

export type HubReply<T> = {ok: true; status: number; data: T} | {ok: false; status: number; body: {error?: string; retryAfterS?: number} | null};

async function call(path: string, init?: RequestInit): Promise<{status: number; ok: boolean; body: Record<string, unknown> | null}> {
  try {
    const res = await fetch(path, {...init, headers: {'Content-Type': 'application/json', ...(init?.headers ?? {})}, cache: 'no-store'});
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return {status: res.status, ok: res.ok, body};
  } catch {
    return {status: 0, ok: false, body: null};
  }
}

function one(r: Awaited<ReturnType<typeof call>>): HubReply<NovaRequest> {
  const req = r.ok ? toRequest(r.body?.request) : null;
  if (req) return {ok: true, status: r.status, data: req};
  return {ok: false, status: r.ok ? 502 : r.status, body: r.body as {error?: string; retryAfterS?: number} | null};
}

export async function listRequests(): Promise<HubReply<NovaRequest[]>> {
  const r = await call('/api/nova/requests');
  if (!r.ok) return {ok: false, status: r.status, body: r.body as {error?: string} | null};
  const rows = Array.isArray(r.body?.requests) ? (r.body!.requests as unknown[]) : [];
  return {ok: true, status: r.status, data: rows.map(toRequest).filter((x): x is NovaRequest => !!x)};
}

export type NewRequest = {kind: RequestKind; title: string; details: Record<string, unknown>; room?: string};

/** Create a request. `confirm: true` runs it now (the member pressed the button themselves). */
export async function createRequest(input: NewRequest, confirm: boolean) {
  return one(await call('/api/nova/requests', {method: 'POST', body: JSON.stringify({...input, title: input.title.slice(0, 140), confirm})}));
}

export async function confirmRequest(id: string) {
  return one(await call(`/api/nova/requests/${encodeURIComponent(id)}/confirm`, {method: 'POST'}));
}

export async function closeRequest(id: string, to: 'cancel' | 'done') {
  return one(await call(`/api/nova/requests/${encodeURIComponent(id)}/${to}`, {method: 'POST'}));
}

/** null while checking; true/false once the browser session is known. Never throws (placeholder env → false). */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    try {
      createClient().auth.getUser()
        .then(({data}) => { if (alive) setSignedIn(!!data.user); })
        .catch(() => { if (alive) setSignedIn(false); });
    } catch {
      queueMicrotask(() => { if (alive) setSignedIn(false); });
    }
    return () => { alive = false; };
  }, []);
  return signedIn;
}
