'use client';
// Web room data hook + Nova hub call for the Entourage, Departures, Per Diem and Clubhouse rooms.
// Reports exactly what the server said (signed out, not open yet, error, data) — nothing is invented.
import {useCallback, useEffect, useRef, useState} from 'react';
import {roomCall} from '@/lib/room-client';
import {requestErrorText, toRequest, type NovaRequest} from '@/lib/nova-request-view';

export type RoomData<T> =
  | {state: 'loading'}
  | {state: 'signed_out'}
  | {state: 'not_open'; message: string}
  | {state: 'error'; message: string}
  | {state: 'ready'; data: T};

type Err = {message?: string; error?: string};

export function failureText(status: number, body: Err, nothing = 'Nothing was changed.'): string {
  if (status === 0) return `The house line is down. ${nothing}`;
  if (status === 401) return `Sign in first. ${nothing}`;
  if (body.message && body.message !== 'Invalid request.') return body.message;
  if (status === 404) return `That is no longer here. ${nothing}`;
  if (status === 400) return `The house could not read that. ${nothing}`;
  return `Something went wrong on the house side. ${nothing}`;
}

async function readRoom<T>(url: string): Promise<RoomData<T>> {
  const r = await roomCall<T & Err>(url);
  if (r.ok) return {state: 'ready', data: r.body};
  if (r.status === 401) return {state: 'signed_out'};
  if (r.status === 503 && r.body.error === 'room_not_open') return {state: 'not_open', message: r.body.message ?? 'This room opens once the house switches it on.'};
  return {state: 'error', message: failureText(r.status, r.body, 'Nothing was loaded.')};
}

/** Load a member-only endpoint. `url` null = don't load yet. */
export function useRoomData<T>(url: string | null) {
  const [data, setData] = useState<RoomData<T>>({state: 'loading'});
  const seq = useRef(0);
  useEffect(() => {
    if (!url) return;
    const n = ++seq.current;
    void (async () => {
      const next = await readRoom<T>(url);
      if (n === seq.current) setData(next); // a newer read supersedes this one
    })();
  }, [url]);
  /** Re-read; `quiet` keeps the current view on screen while it loads (after a save). */
  const reload = useCallback(async (quiet = false) => {
    if (!url) return;
    const n = ++seq.current;
    if (!quiet) setData({state: 'loading'});
    const next = await readRoom<T>(url);
    if (n === seq.current) setData(next);
  }, [url]);
  return {data, reload};
}

export type HubInput = {kind: 'find_item' | 'plan'; title: string; details: Record<string, unknown>; room: string};

/** One button = one confirmed Nova request (POST /api/nova/requests {confirm: true}). */
export async function runNovaRequest(input: HubInput): Promise<{ok: true; request: NovaRequest} | {ok: false; message: string}> {
  const r = await roomCall<{request?: unknown; error?: string; retryAfterS?: unknown}>('/api/nova/requests', {
    method: 'POST', json: {...input, title: input.title.slice(0, 140), confirm: true},
  });
  const request = toRequest(r.body.request);
  if (!r.ok || !request || request.status !== 'ready') return {ok: false, message: requestErrorText(r.status, r.body)};
  return {ok: true, request};
}

/** The member's local calendar day (YYYY-MM-DD). */
export function today(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
