import 'server-only';
import {encryptJson, decryptJson} from '@/lib/crypto';

// Yahoo Fantasy Sports API, OAuth 2.0 authorization-code flow.
// https://developer.yahoo.com/oauth2/guide/flows_authcode/ · https://developer.yahoo.com/fantasysports/guide/
// Needs YAHOO_CLIENT_ID / YAHOO_CLIENT_SECRET (app with "Fantasy Sports: Read" scope) and
// YAHOO_REDIRECT_URI = https://<site>/api/integrations/yahoo-fantasy/callback.
const AUTH = 'https://api.login.yahoo.com/oauth2/request_auth';
const TOKEN = 'https://api.login.yahoo.com/oauth2/get_token';
const API = 'https://fantasysports.yahooapis.com/fantasy/v2';

export type YahooTokens = {access_token: string; refresh_token: string; expires_at: number};

export function yahooConfigured() {
  return Boolean(process.env.YAHOO_CLIENT_ID && process.env.YAHOO_CLIENT_SECRET && process.env.YAHOO_REDIRECT_URI);
}
export function authorizeUrl(state: string) {
  const q = new URLSearchParams({client_id: process.env.YAHOO_CLIENT_ID!, redirect_uri: process.env.YAHOO_REDIRECT_URI!, response_type: 'code', scope: 'fspt-r', state});
  return `${AUTH}?${q}`;
}
async function tokenCall(body: Record<string, string>): Promise<YahooTokens> {
  const basic = Buffer.from(`${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(TOKEN, {method: 'POST', headers: {Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({redirect_uri: process.env.YAHOO_REDIRECT_URI!, ...body}), signal: AbortSignal.timeout(10_000)});
  const j = (await r.json().catch(() => ({}))) as {access_token?: string; refresh_token?: string; expires_in?: number; error?: string};
  if (!r.ok || !j.access_token) throw new Error(`yahoo token: ${j.error ?? r.status}`);
  return {access_token: j.access_token, refresh_token: j.refresh_token ?? body.refresh_token ?? '', expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 - 60_000};
}
export const exchangeCode = (code: string) => tokenCall({grant_type: 'authorization_code', code});
export const refresh = (t: YahooTokens) => tokenCall({grant_type: 'refresh_token', refresh_token: t.refresh_token});

/** Tokens are stored AES-256-GCM encrypted as base64("iv.ciphertext") in social_connections. */
export function sealTokens(t: YahooTokens): string {
  const b = encryptJson(t);
  return `${b.iv.toString('base64')}.${b.ciphertext.toString('base64')}`;
}
export function openTokens(sealed: string): YahooTokens {
  const [iv, ct] = sealed.split('.');
  return decryptJson<YahooTokens>({iv: Buffer.from(iv, 'base64'), ciphertext: Buffer.from(ct, 'base64')});
}

const ID = /^\d{1,12}$/;
type J = Record<string, unknown>;
/** Yahoo encodes resources as arrays of single-key objects; merge them into one object. */
function flat(x: unknown): J {
  if (Array.isArray(x)) return x.reduce<J>((a, v) => ({...a, ...flat(v)}), {});
  return x && typeof x === 'object' ? (x as J) : {};
}
const num = (v: unknown) => (v == null || v === '' ? 0 : Number(v));
const teamOf = (doc: J) => (((doc.fantasy_content as J)?.team ?? []) as unknown[]);

export function normalizeSnapshot(leagueId: string, teamId: string, stats: J, standings: J, matchups: J, roster: J) {
  const t = flat(teamOf(stats)[0]);
  const st = flat(teamOf(standings)[1]).team_standings as J | undefined;
  const ot = (st?.outcome_totals ?? {}) as J;
  const ms = flat(teamOf(matchups)[1]).matchups as J | undefined;
  const cur = Object.values(ms ?? {}).map((m) => (m as J).matchup as J).filter(Boolean).find((m) => m.status !== 'postevent') ?? null;
  const pair = cur ? (((cur['0'] as J)?.teams ?? {}) as J) : {};
  const teams = Object.values(pair).map((x) => (x as J).team as unknown[]).filter(Array.isArray);
  const mine = teams.find((tm) => String(flat(tm[0]).team_id) === teamId);
  const opp = teams.find((tm) => tm !== mine);
  const proj = (tm?: unknown[]) => num((flat(tm?.[1]).team_projected_points as J | undefined)?.total);
  const players = Object.values((flat(teamOf(roster)[1]).roster as J)?.['0'] ? ((((flat(teamOf(roster)[1]).roster as J)['0'] as J).players ?? {}) as J) : {})
    .map((p) => (p as J).player as unknown[]).filter(Array.isArray)
    .map((p) => { const a = flat(p[0]); return {name: String((a.name as J)?.full ?? ''), position: String(a.display_position ?? ''), projected_pts: num((flat(p[1]).player_points as J | undefined)?.total)}; })
    .slice(0, 4);
  return {
    demo: false, league_id: leagueId, team_id: teamId,
    league_name: String(t.league_name ?? `League ${leagueId}`), team_name: String(t.name ?? `Team ${teamId}`),
    rank: num(st?.rank), record: {wins: num(ot.wins), losses: num(ot.losses), ties: num(ot.ties)},
    points_for: num(st?.points_for), points_against: num(st?.points_against), projected_points: proj(mine),
    week_matchup: {week: num(cur?.week), opponent: String(flat(opp?.[0]).name ?? '—'), opponent_projected: proj(opp), my_projected: proj(mine), status: String(cur?.status ?? 'none')},
    top_players: players, fetched_at: new Date().toISOString(),
  };
}

export async function fetchTeamSnapshot(t: YahooTokens, leagueId: string, teamId: string, game = 'nfl') {
  if (!ID.test(leagueId) || !ID.test(teamId) || !/^[a-z0-9]{2,8}$/.test(game)) throw new Error('invalid league/team id');
  const key = `${game}.l.${leagueId}.t.${teamId}`;
  const get = async (path: string) => {
    const r = await fetch(`${API}/${path}?format=json`, {headers: {Authorization: `Bearer ${t.access_token}`}, signal: AbortSignal.timeout(10_000)});
    if (!r.ok) throw new Error(`yahoo ${path.split('/').pop()} ${r.status}`);
    return r.json() as Promise<J>;
  };
  const [stats, standings, matchups, roster] = await Promise.all([get(`team/${key}/stats`), get(`team/${key}/standings`), get(`team/${key}/matchups`), get(`team/${key}/roster/players`)]);
  return normalizeSnapshot(leagueId, teamId, stats, standings, matchups, roster);
}
