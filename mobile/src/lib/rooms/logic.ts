// Pure helpers for the wired room interiors (Wardrobe, Social, Market, Scrapbook, House, Lounge, Stylist,
// Penthouse). No React, no React Native, no network — so tests/mobile-rooms-wire.test.ts can import them.
// Where a helper mirrors a web rule, the web file is named next to it so the two stay in step.

/* ─────────────── money / time ─────────────── */

export function dollars(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '—';
  return `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2})}`;
}

/** "$1,250" / "1250" / "1,250.50" → cents, or null when it isn't a positive amount. */
export function parseDollars(input: string): number | null {
  const n = Number(input.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : new Date(t).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

/* ─────────────── Scrapbook (mirrors src/app/api/scrapbook/log getSeason + archive/page.tsx) ─────────────── */

export function seasonOf(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 3 && month <= 5) return `Spring ${year}`;
  if (month >= 6 && month <= 8) return `Summer ${year}`;
  if (month >= 9 && month <= 11) return `Fall ${year}`;
  return `Winter ${year}`;
}

const SEASON_ORDER = ['Spring', 'Summer', 'Fall', 'Winter'];
export function seasonSortKey(season: string): number {
  const [name, year] = season.split(' ');
  const y = Number(year);
  const i = SEASON_ORDER.indexOf(name);
  return (Number.isFinite(y) ? y : 0) * 10 + (i < 0 ? 0 : i);
}

/** Group entries by season (entries with no stored season fall back to their created_at), newest season first. */
export function groupBySeason<T extends {season?: string | null; created_at: string}>(entries: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const e of entries) {
    const key = e.season || seasonOf(new Date(e.created_at));
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return [...map.entries()].sort((a, b) => seasonSortKey(b[0]) - seasonSortKey(a[0]));
}

/* ─────────────── Lounge (mirrors src/app/(hotel)/lounge/page.tsx compatScore) ─────────────── */

export type LoungeMember = {id: string; display_name?: string | null; username?: string | null; avatar_url?: string | null; vibe?: string | null; city?: string | null; interests?: string[] | null; check_in?: unknown};
export type Me = {vibe: string | null; city: string | null; interests: string[]};

export function compatScore(member: LoungeMember, me: Me): number {
  const idHash = member.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let score = 42 + (idHash % 20);
  if (member.vibe && member.vibe === me.vibe) score += 22;
  if (member.vibe) score += 5;
  if (me.city && member.city && member.city === me.city) score += 10;
  if (me.interests.length && member.interests?.length) {
    const overlap = me.interests.filter((i) => member.interests?.includes(i)).length;
    score += Math.min(overlap * 4, 12);
  }
  if (member.check_in) score += 3;
  return Math.min(score, 99);
}

export function rankMembers(members: LoungeMember[], me: Me, myId: string | null): Array<LoungeMember & {score: number}> {
  return members.filter((m) => m.id !== myId).map((m) => ({...m, score: compatScore(m, me)})).sort((a, b) => b.score - a.score);
}

export const memberName = (m: {display_name?: string | null; username?: string | null} | null | undefined) =>
  (m?.display_name || m?.username || 'A member').trim();

/* ─────────────── Embassy / Scale (mirrors src/app/(hotel)/embassy/page.tsx deal mapping) ─────────────── */

export type ScaleDeal = {id: string; title: string; brand: string | null; description?: string | null; image_url?: string | null; original_price_cents: number; group_price_cents: number; goal_count: number; current_count: number; category: string | null; deadline?: string | null; status: string};

export function dealTier(originalCents: number): 'premium' | 'contemporary' | 'mid' | 'budget' {
  return originalCents >= 100000 ? 'premium' : originalCents >= 30000 ? 'contemporary' : originalCents >= 5000 ? 'mid' : 'budget';
}
export function pipelineStatus(d: Pick<ScaleDeal, 'status' | 'current_count' | 'goal_count'>): 'live' | 'pending' | 'review' {
  return d.status === 'met' ? 'live' : d.status === 'open' ? (d.current_count >= d.goal_count * 0.5 ? 'live' : 'pending') : 'review';
}
export function savingsPct(originalCents: number, groupCents: number): number {
  return originalCents > 0 ? Math.max(0, Math.round(((originalCents - groupCents) / originalCents) * 100)) : 0;
}
/** Progress toward a group buy's goal, 0–100. */
export function goalPct(current: number, goal: number): number {
  return goal > 0 ? Math.max(0, Math.min(100, Math.round((current / goal) * 100))) : 0;
}

/* ─────────────── Registry ─────────────── */

export function fundedPct(pledgedCents: number | null | undefined, priceCents: number | null | undefined): number {
  return priceCents && priceCents > 0 ? Math.max(0, Math.min(100, Math.round(((pledgedCents ?? 0) / priceCents) * 100))) : 0;
}

/* ─────────────── Switchboard ─────────────── */

/** The lines the house can connect (web src/app/(hotel)/switchboard/page.tsx). */
export const LINES: Array<[string, string]> = [['instagram', 'Instagram'], ['twitter', 'X / Twitter'], ['tiktok', 'TikTok'], ['snapchat', 'Snapchat'], ['pinterest', 'Pinterest'], ['youtube', 'YouTube']];

/**
 * The lines to draw: the house's known lines first, then any other platform the server reports linked.
 * `linked` must already be filtered to rows with a real OAuth token (see lib/rooms/social.ts readSwitchboard).
 */
export function switchboardLines(linked: Array<{platform: string; connected_at: string | null}>): Array<{key: string; name: string; on: boolean; since: string | null}> {
  const by = new Map(linked.map((l) => [l.platform, l.connected_at]));
  const known = LINES.map(([key, name]) => ({key, name, on: by.has(key), since: by.get(key) ?? null}));
  const extra = [...by.keys()].filter((k) => !LINES.some(([key]) => key === k)).map((k) => ({key: k, name: k.charAt(0).toUpperCase() + k.slice(1), on: true, since: by.get(k) ?? null}));
  return [...known, ...extra];
}

/* ─────────────── Ballroom ─────────────── */

export const BALLROOM_STAGE: Record<string, number> = {proposal: 0, hold_requested: 1, held: 1, confirmed: 2};
