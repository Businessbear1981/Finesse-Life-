// The Scrapbook (web: src/app/(hotel)/archive/page.tsx). Entries are read exactly as the web archive reads
// them — scrapbook_entries for the member, under RLS (owner_only). New moments go through POST /api/scrapbook/log
// (bearer-aware). Films: POST /api/scrapbook/generate-video + GET /api/scrapbook/video-status — both still read
// the cookie only, so from the app they answer 401; the room says films are made on the web for now.
import {api} from '../api';
import {supabase} from '../supabase';
import {asMember, ok, pgFail, type Res} from './db';
import {novaText} from './nova';

export type EntryType = 'outing_complete' | 'registry_funded' | 'scale_win' | 'vault_milestone' | 'stylist_box' | 'nova_moment';
export const ENTRY_LABEL: Record<EntryType, string> = {
  outing_complete: 'Date night', registry_funded: 'Registry win', scale_win: 'Group victory', vault_milestone: 'Vault moment', stylist_box: 'Style drop', nova_moment: 'Nova spark',
};
export type Entry = {id: string; entry_type: string; title: string; description: string | null; photo_urls: string[] | null; video_url: string | null;
  video_job_id: string | null; video_status: string | null; season: string | null; created_at: string};

export const readScrapbook = () => asMember<{entries: Entry[]}>(async (uid) => {
  const {data, error} = await supabase.from('scrapbook_entries').select('*').eq('user_id', uid).order('created_at', {ascending: false});
  return error ? pgFail(error, 'Nothing was loaded.') : ok({entries: (data ?? []) as Entry[]});
});

export function logMoment(m: {entry_type: EntryType; title: string; description?: string}) {
  return api<{id?: string; season?: string; error?: string; message?: string}>('/api/scrapbook/log', {method: 'POST', json: {
    entry_type: m.entry_type, title: m.title.trim().slice(0, 200), description: m.description?.trim() ? m.description.trim().slice(0, 4000) : null,
  }});
}

/** The web's "write it with Nova": a 2–3 sentence diary line from the archive persona. */
export function writeWithNova(title: string, type: EntryType) {
  return novaText(`Write a description for this moment: "${title.trim().slice(0, 200)}" — type: ${ENTRY_LABEL[type]}. A single short diary-style description, 2-3 sentences, past tense, intimate tone, under 60 words.`, 'archive');
}

export type FilmResult = {state: 'started' | 'web_only' | 'failed'; text: string};

export async function makeFilm(entryId: string): Promise<FilmResult> {
  const r = await api<{job_id?: string; status?: string; error?: string}>('/api/scrapbook/generate-video', {method: 'POST', json: {entry_id: entryId}});
  if (r.ok) return {state: 'started', text: 'The film is developing. It appears here when the studio finishes.'};
  if (r.status === 401) return {state: 'web_only', text: 'Films are made from the Scrapbook on the web for now — open it at finesselife.vip. Nothing was started.'};
  if (r.status === 0) return {state: 'failed', text: 'The house line is down. Nothing was started.'};
  if (r.status === 404) return {state: 'failed', text: 'That moment is no longer here.'};
  return {state: 'failed', text: 'The film studio couldn’t start this one. Nothing was made — try again later.'};
}

export async function filmStatus(entryId: string): Promise<Res<{status?: string; video_url?: string | null}>> {
  return api<{status?: string; video_url?: string | null}>(`/api/scrapbook/video-status?entry_id=${encodeURIComponent(entryId)}`);
}
