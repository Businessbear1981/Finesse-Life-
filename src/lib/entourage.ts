// Entourage — pure helpers shared by the API routes, the web room and tests (the mobile app keeps a
// mirror in mobile/src/lib/rooms/entourage.ts). No fetch, no React, no server imports.

export type GiftStatus = 'idea' | 'purchased' | 'given';

export type EntouragePerson = {
  id: string;
  name: string;
  relation: string;
  city: string | null;
  birthday: string | null; // YYYY-MM-DD
  loves: string[];
  notes: string | null;
  linked_member_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EntourageGift = {
  id: string;
  person_id: string;
  title: string;
  status: GiftStatus;
  price_cents: number | null;
  url: string | null;
  occasion: string | null;
  source: 'member' | 'nova';
  created_at: string;
};

export type NextOccasion = {date: string; days: number; turning: number | null};

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const pad = (n: number) => String(n).padStart(2, '0');

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = ISO.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(utc(y, mo, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/**
 * The next birthday on or after `today` (both YYYY-MM-DD, the member's local day).
 * A 29 February birthday falls on 28 February in non-leap years. `turning` is null when the year
 * looks unknown (before 1900) or makes no sense.
 */
export function nextBirthday(birthday: string | null | undefined, today: string): NextOccasion | null {
  if (!birthday || !isIsoDate(birthday) || !isIsoDate(today)) return null;
  const [by, bm, bd] = birthday.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const dayIn = (y: number) => (bm === 2 && bd === 29 && !isLeap(y) ? 28 : bd);
  let year = ty;
  if (utc(year, bm, dayIn(year)) < utc(ty, tm, td)) year += 1;
  const days = Math.round((utc(year, bm, dayIn(year)) - utc(ty, tm, td)) / 86_400_000);
  const turning = by >= 1900 && year - by > 0 && year - by < 130 ? year - by : null;
  return {date: `${year}-${pad(bm)}-${pad(dayIn(year))}`, days, turning};
}

/** Sort dossiers so the soonest birthday comes first; people without a birthday go last, by name. */
export function bySoonest<T extends {name: string; birthday: string | null}>(people: T[], today: string): T[] {
  return [...people].sort((a, b) => {
    const da = nextBirthday(a.birthday, today)?.days ?? Infinity;
    const db = nextBirthday(b.birthday, today)?.days ?? Infinity;
    return da === db ? a.name.localeCompare(b.name) : da - db;
  });
}

/** The scout query for "Gift ideas": what they love, who they are to the member, and a budget. */
export function giftQuery(p: Pick<EntouragePerson, 'relation' | 'loves' | 'notes'>): string {
  const loves = p.loves.filter(Boolean).slice(0, 6).join(', ');
  const parts = [`a thoughtful gift for my ${p.relation.toLowerCase() || 'friend'}`];
  if (loves) parts.push(`who loves ${loves}`);
  return parts.join(' ').slice(0, 200);
}

/** The planner brief for "Plan their birthday". */
export function birthdayBrief(p: Pick<EntouragePerson, 'name' | 'relation' | 'city' | 'loves'>, turning: number | null): string {
  const bits = [
    `A birthday evening for ${p.name} (my ${p.relation.toLowerCase() || 'friend'})${turning ? `, turning ${turning}` : ''}.`,
    p.city ? `They live in ${p.city}.` : '',
    p.loves.length ? `They love ${p.loves.slice(0, 6).join(', ')}.` : '',
    'Suggest where to go and what to do, with times.',
  ];
  return bits.filter(Boolean).join(' ').slice(0, 600);
}

/** Days → member copy ("Today", "Tomorrow", "In 12 days"). */
export function daysLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** The member's local calendar day (YYYY-MM-DD) for a Date. */
export function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
