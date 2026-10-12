// Reads one member-only room endpoint and reports exactly what the server said: signed out, loading,
// not open yet (503 room_not_open — the room's migration isn't applied), an error, or the data.
// Nothing here invents content when a call fails.
import {useCallback, useEffect, useRef, useState} from 'react';
import {api} from './api';
import {useMember} from './member';

export type Live<T> =
  | {state: 'checking'}
  | {state: 'signed_out'}
  | {state: 'loading'}
  | {state: 'not_open'; message: string}
  | {state: 'error'; status: number; message: string}
  | {state: 'ready'; data: T};

type ErrBody = {message?: string; error?: string};

/** Plain-language reading of a failed call. `nothing` finishes the sentence ("Nothing was saved."). */
export function failure(status: number, body: ErrBody, nothing = 'Nothing was changed.') {
  if (status === 0) return `The house line is down. ${nothing}`;
  if (status === 401) return `Sign in first. ${nothing}`;
  if (status === 503 && body.error === 'room_not_open') return body.message ?? 'This room opens once the house switches it on.';
  if (body.message) return body.message;
  if (status === 404) return `That is no longer here. ${nothing}`;
  if (status === 400) return `The house could not read that request. ${nothing}`;
  return `Something went wrong on the house side. ${nothing}`;
}

export function useLive<T>(path: string | null, load?: () => Promise<{ok: boolean; status: number; body: T & ErrBody}>) {
  const member = useMember();
  const userId = member === undefined ? undefined : member?.userId ?? null;
  const [live, setLive] = useState<Live<T>>({state: 'checking'});
  const seq = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const reload = useCallback(async (quiet = false) => {
    if (userId === undefined) { setLive({state: 'checking'}); return; }
    if (userId === null) { setLive({state: 'signed_out'}); return; }
    if (!path && !loader.current) return;
    const n = ++seq.current;
    if (!quiet) setLive({state: 'loading'});
    const r = loader.current ? await loader.current() : await api<T & ErrBody>(path!);
    if (n !== seq.current) return; // a newer read superseded this one
    if (r.ok) setLive({state: 'ready', data: r.body});
    else if (r.status === 401) setLive({state: 'signed_out'});
    else if (r.status === 503 && r.body.error === 'room_not_open') setLive({state: 'not_open', message: r.body.message ?? 'This room opens once the house switches it on.'});
    else setLive({state: 'error', status: r.status, message: failure(r.status, r.body, 'Nothing was loaded.')});
  }, [path, userId]);

  useEffect(() => { void reload(); }, [reload]);
  return {live, reload, member};
}
