// Carpe Diem, the Market tile and the Ballroom — the same sources as the web rooms:
//   carpe diem → carpe_diem_profiles (the member's own row, RLS carpe_diem_own), POST /api/integrations/alpaca
//                (Alpaca PAPER account, read-only snapshot), POST /api/carpe-diem/garage, Nova persona 'briefing'
//   market     → GET /api/intelligence/market (signals computed from real Exchange listings)
//   ballroom   → GET /api/ballroom/context, POST /api/ballroom/{compose,hold,confirm}
import {api} from '../api';
import {supabase} from '../supabase';
import {asMember, ok, pgFail} from './db';
import {novaText} from './nova';

/* ─────────────── Carpe Diem ─────────────── */

export type Position = {symbol: string; qty: number; market_value: number; unrealized_pl: number; current_price: number; change_today_pct: number};
export type Snapshot = {equity: number; cash: number; portfolio_value: number; buying_power: number; pnl_today: number; top_positions: Position[]; fetched_at: string};
export type Garage = {car_make: string | null; car_model: string | null; car_year: number | null; sneaker_size: string | null; golf_handicap: number | null};
export type CarpeProfile = Partial<Garage> & {alpaca_connected?: boolean | null; alpaca_portfolio_snapshot?: Snapshot | null; yahoo_connected?: boolean | null; updated_at?: string | null};

export const readCarpeDiem = () => asMember<{profile: CarpeProfile | null}>(async (uid) => {
  const {data, error} = await supabase.from('carpe_diem_profiles').select('*').eq('user_id', uid).maybeSingle();
  return error ? pgFail(error, 'Nothing was loaded.') : ok({profile: (data ?? null) as CarpeProfile | null});
});

/** Connect the Alpaca PAPER account: the server fetches a read-only snapshot and keeps only a partial key. */
export function connectAlpaca(apiKey: string, apiSecret: string) {
  return api<Snapshot & {error?: string}>('/api/integrations/alpaca', {method: 'POST', json: {api_key: apiKey.trim(), api_secret: apiSecret.trim()}});
}

export function saveGarage(g: Garage) {
  return api<{ok?: boolean; error?: string}>('/api/carpe-diem/garage', {method: 'POST', json: g});
}

/** The weekly brief, from the member's real context (web carpe-diem/page.tsx NovaBriefing). */
export function briefing(p: CarpeProfile | null, diary: {today: number; needsYou: number}) {
  const parts: string[] = [];
  if (p?.alpaca_connected && p.alpaca_portfolio_snapshot) {
    const s = p.alpaca_portfolio_snapshot;
    parts.push(`paper portfolio value $${Math.round(s.portfolio_value).toLocaleString('en-US')}, today's P/L $${Math.round(s.pnl_today).toLocaleString('en-US')}${s.top_positions?.length ? `, top positions ${s.top_positions.map((x) => x.symbol).join(', ')}` : ''}`);
  }
  if (p?.car_make) parts.push(`drives a ${[p.car_year, p.car_make, p.car_model].filter(Boolean).join(' ')}`);
  if (p?.golf_handicap != null) parts.push(`golf handicap ${p.golf_handicap}`);
  if (p?.sneaker_size) parts.push(`sneaker size ${p.sneaker_size}`);
  parts.push(`${diary.today} items in today's diary, ${diary.needsYou} waiting on a decision`);
  return novaText(`Give a sharp briefing for this member. Context: ${parts.join('. ')}. Start with "This week" and reference the actual data. Keep it under 60 words. No invented numbers.`, 'briefing');
}

/* ─────────────── Market tile ─────────────── */

export type Signal = {category: string; demand_score: number; supply_score: number; price_trend: 'rising' | 'stable' | 'falling'; avg_days_to_sell: number; avg_price_cents: number; listing_count: number};
export const readMarketSignals = () => api<{signals?: Signal[]; error?: string}>('/api/intelligence/market');

/* ─────────────── Ballroom ─────────────── */

export type Evening = {id: string; title: string; occasion: string | null; starts_at: string; party_size: number; track: string | null;
  components: Array<{kind: string; label: string; state?: string; partner?: string | null}>; state: string; updated_at?: string};
export type BallroomData = {evenings: Evening[]; sources: {looks: number; registryWishes: number}};
export const BALLROOM_PATH = '/api/ballroom/context';
export const BALLROOM_KINDS = ['table', 'look', 'gift', 'route', 'salon', 'travel'] as const;

export function composeEvening(e: {title: string; startsAt: string; partySize: number; track: 'finesse' | 'carpe_diem'; components: Array<{kind: string; label: string}>}) {
  return api<{evening?: Evening; error?: string; message?: string}>('/api/ballroom/compose', {method: 'POST', json: e});
}

/** hold = ask the desk for holds; confirm = approve what a PARTNER has held. A 409 is the honest "not yet". */
export function stepEvening(id: string, step: 'hold' | 'confirm') {
  return api<{evening?: Evening; error?: string; message?: string; state?: string}>(`/api/ballroom/${step}`, {method: 'POST', json: {eveningId: id}});
}
