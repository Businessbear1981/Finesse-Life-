// Clubhouse / Game Room — tables members host and seats they take (GET/POST /api/clubhouse/tables,
// POST /api/clubhouse/tables/:id/join|leave, DELETE /api/clubhouse/tables/:id). Seat caps are enforced by
// the database. Mirrors src/lib/clubhouse.ts (keep the two in step). Points only — no money moves.
// Also NightVision's read-only views of the member's own profile and signals (existing web routes).
import {api} from '../api';

export const GAMES = ['poker', 'spades', 'dominoes', 'rummy', 'book'] as const;
export type Game = (typeof GAMES)[number];
export const GAME_INFO: Record<Game, {label: string; maxSeats: number; defaultSeats: number; blurb: string}> = {
  poker: {label: 'Poker', maxSeats: 10, defaultSeats: 6, blurb: 'Texas Hold’em for points'},
  spades: {label: 'Spades', maxSeats: 4, defaultSeats: 4, blurb: 'Partners, books to 500'},
  dominoes: {label: 'Dominoes', maxSeats: 4, defaultSeats: 4, blurb: 'Bones to 150'},
  rummy: {label: 'Rummy', maxSeats: 6, defaultSeats: 2, blurb: 'Gin rummy, best of three'},
  book: {label: 'The Book', maxSeats: 40, defaultSeats: 12, blurb: 'Members’ picks for points — no wagers'},
};

export type ClubTable = {id: string; game: Game; title: string; note: string | null; starts_at: string; seats: number; seats_taken: number; seated: boolean; is_host: boolean; host_name: string};
type Err = {message?: string; error?: string};

export function clubErrorText(code: string | undefined) {
  switch (code) {
    case 'table_full': return 'That table just filled up. Nothing changed.';
    case 'table_closed': return 'That table has closed. Nothing changed.';
    case 'not_found': return 'That table is no longer on the board.';
    case 'host_limit': return 'You already host five open tables — close one first.';
    case 'bad_start': return 'Pick a start time in the next 90 days.';
    default: return 'The table couldn’t be updated just now. Nothing changed.';
  }
}

export const readBoard = () => api<{tables?: ClubTable[]} & Err>('/api/clubhouse/tables');
export const hostTable = (t: {game: Game; title: string; note: string | null; starts_at: string; seats: number}) =>
  api<{table?: ClubTable} & Err>('/api/clubhouse/tables', {method: 'POST', json: t});
export const joinTable = (id: string) => api<{table?: ClubTable} & Err>(`/api/clubhouse/tables/${id}/join`, {method: 'POST'});
export const leaveTable = (id: string) => api<{table?: ClubTable} & Err>(`/api/clubhouse/tables/${id}/leave`, {method: 'POST'});
export const closeTable = (id: string) => api<Err>(`/api/clubhouse/tables/${id}`, {method: 'DELETE'});

/* ─── NightVision (read-only): the member's own taste profile and behaviour signals ─── */
export type NightvisionProfile = {answers?: Record<string, string | string[]>; style_dna?: string; brand_radar?: string[]; style_tags?: string[]; generated_at?: string};
export type BehavioralProfile = {
  category_affinities?: Record<string, number>; brand_affinities?: Record<string, number>;
  price_range_preference?: {min_cents: number; max_cents: number}; buying_velocity?: 'low' | 'medium' | 'high'; style_signals?: string[]; last_updated?: string;
};
export type NightVisionData = {profile: NightvisionProfile | null; behavior: BehavioralProfile | null; signalCount: number};

/** Reads both routes; a failing behaviour read leaves `behavior` null rather than failing the room. */
export async function readNightVision(): Promise<{ok: boolean; status: number; body: NightVisionData & Err}> {
  const [p, b] = await Promise.all([
    api<{profile?: NightvisionProfile | null} & Err>('/api/nightvision/profile'),
    api<{profile?: BehavioralProfile | null; signal_count?: number} & Err>('/api/nightvision/behavioral'),
  ]);
  if (!p.ok) return {ok: false, status: p.status, body: {...p.body, profile: null, behavior: null, signalCount: 0}};
  return {ok: true, status: 200, body: {profile: p.body.profile ?? null, behavior: b.ok ? b.body.profile ?? null : null, signalCount: b.ok ? Number(b.body.signal_count) || 0 : 0}};
}

/** Top-n entries of an affinity map, as [label, 0–100]. */
export function topAffinities(m: Record<string, number> | undefined, n = 5): Array<[string, number]> {
  return Object.entries(m ?? {}).filter(([, v]) => Number.isFinite(v) && v > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(Math.min(1, v) * 100)]);
}
