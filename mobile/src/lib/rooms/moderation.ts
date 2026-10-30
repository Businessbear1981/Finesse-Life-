// Member safety (Apple 1.2 / Play UGC) — the app's side of src/lib/moderation.ts and the routes
// POST /api/moderation/report, POST|DELETE /api/moderation/block, GET /api/moderation/blocks and
// GET /api/moderation/reports, GET|POST /api/account/accept-terms (all bearer-aware). Keep the kinds / reasons in step with the web.
import {API_BASE, api} from '../api';

export const REPORT_KINDS = ['post', 'vip_post', 'profile', 'listing', 'club_table', 'outing', 'look', 'nova_reply'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export type ReportReason = 'spam' | 'harassment' | 'hate' | 'sexual' | 'violence' | 'self_harm' | 'illegal' | 'impersonation' | 'scam' | 'other';
/** In picker order. */
export const REPORT_REASONS: Array<[ReportReason, string]> = [
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate speech or slurs'],
  ['sexual', 'Sexual content or solicitation'],
  ['violence', 'Threats or violence'],
  ['self_harm', 'Self-harm or suicide'],
  ['scam', 'Scam or fraud'],
  ['spam', 'Spam'],
  ['impersonation', 'Impersonation'],
  ['illegal', 'Illegal goods or activity'],
  ['other', 'Something else'],
];

export const TERMS_URL = `${API_BASE}/terms`;
export const REPORTED_MESSAGE = 'Thank you. The house reviews every report within 24 hours and removes content that breaks the rules.';

type Err = {error?: string; message?: string};

export const reportContent = (target_kind: ReportKind, target_id: string, reason: ReportReason, note?: string) =>
  api<{reported?: boolean; already?: boolean} & Err>('/api/moderation/report', {method: 'POST', json: {target_kind, target_id, reason, note: note?.trim() || undefined}});

export const blockMember = (member_id: string) =>
  api<{blocked?: boolean} & Err>('/api/moderation/block', {method: 'POST', json: {member_id}});

/** Block whoever owns an item when the app doesn't know their id (Game Room tables hide the host's id). */
export const blockOwnerOf = (target_kind: Exclude<ReportKind, 'nova_reply'>, target_id: string) =>
  api<{blocked?: boolean} & Err>('/api/moderation/block', {method: 'POST', json: {target_kind, target_id}});

export const unblockMember = (member_id: string) =>
  api<{unblocked?: boolean} & Err>(`/api/moderation/block?member_id=${encodeURIComponent(member_id)}`, {method: 'DELETE'});

export const readBlocks = () => api<{blocks?: Array<{member_id: string; name: string; blocked_at: string}>} & Err>('/api/moderation/blocks');

export type MyReport = {id: string; target_kind: ReportKind; target_id: string; reason: ReportReason; note: string | null; status: 'open' | 'actioned' | 'dismissed'; status_label: string; created_at: string};
/** The member's own reports and where each one stands (GET /api/moderation/reports). */
export const readMyReports = () => api<{reports?: MyReport[]} & Err>('/api/moderation/reports');

/** Member-facing noun for each report kind. */
export const REPORT_NOUN: Record<ReportKind, string> = {post: 'Post', vip_post: 'VIP post', profile: 'Profile', listing: 'Listing', club_table: 'Game Room table', outing: 'Outing', look: 'Wardrobe look', nova_reply: 'Nova reply'};

export const readTerms = () => api<{accepted?: boolean} & Err>('/api/account/accept-terms');
export const acceptTerms = () => api<{accepted?: boolean} & Err>('/api/account/accept-terms', {method: 'POST', json: {accept: true}});

/** True when a write failed only because the member hasn't accepted the house rules yet. */
export const needsTerms = (r: {status: number; body: Err}) => r.status === 403 && r.body.error === 'terms_required';

// ─── Text filter (port of src/lib/moderation.ts `screenText` / `screenFields`) ─────────────────────────────
// The routes run these rules server-side; the app runs the same rules before an Exchange offer is sent, so an
// offer that falls back to a direct insert can't carry text the house would have rejected. Keep in step with the web.
export type FilterReason = 'slur' | 'abuse' | 'sexual' | 'threat' | 'contact' | 'spam';
export type FilterVerdict = {verdict: 'ok'} | {verdict: 'reject'; reason: FilterReason; message: string};

const FILTER_MESSAGES: Record<FilterReason, string> = {
  slur: 'That wording isn’t allowed in the house. Nothing was posted.',
  abuse: 'That reads as abuse toward someone. Nothing was posted.',
  sexual: 'Sexual solicitation isn’t allowed in the house. Nothing was posted.',
  threat: 'Threats aren’t allowed in the house. Nothing was posted.',
  contact: 'Keep phone numbers, emails and outside handles out of public posts. Nothing was posted.',
  spam: 'That looks like spam. Nothing was posted.',
};

/** Lower-case, strip accents and zero-width marks, undo common character swaps, squeeze long repeats. */
export function normalizeForFilter(text: string): string {
  const swaps: Record<string, string> = {'0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b'};
  const swap = (c: string) => swaps[c] ?? c;
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u200b-\u200f\u2060\ufeff]/g, '')
    .toLowerCase()
    // Only swap look-alikes that lead into a letter ("n1gg", "k!ll", "$lut") or digits that end a word
    // ("nigg4"), so "go die!", prices and times stay as typed.
    .replace(/[0134578!|@$+]+(?=[a-z])/g, (m) => [...m].map(swap).join(''))
    .replace(/(?<=[a-z])[013458]+(?![0-9])/g, (m) => [...m].map(swap).join(''))
    .replace(/(.)\1{2,}/g, '$1$1');
}

/** "k y s", "k.y.s", "k-y-s" → "kys" (single letters split by separators). */
function joinSpaced(s: string): string {
  return s.replace(/\b(?:[a-z][\s._*-]+){2,}[a-z]\b/g, (m) => m.replace(/[\s._*-]+/g, ''));
}

// Word-boundary patterns over the normalized text. Kept deliberately to high-confidence terms.
const SLURS = [
  /\bn+[i1]+gg+(?:e+r+|a+h?|uh)s?\b/, /\bf+a+gg?(?:o+t+)?s?\b/, /\bk+[iy]+k+e+s?\b/, /\bsp[i1]c+k?s?\b/,
  /\bwetbacks?\b/, /\btr+a+nn+(?:y|ie)s?\b/, /\bretards?\b/, /\bg[o0]{2}ks?\b/, /\bcoons?\b/, /\braghead/, /\bsandn[i1]gg/,
];
const ABUSE = [
  /\bkys\b/, /\bkill (?:your ?self|urself|yo ?self)\b/, /\bgo die\b(?!-)/, /\b(?:you|u) should die\b/, /\bhope (?:you|u) die\b/,
  /\bneck (?:your ?self|urself)\b/, /\bdrink bleach\b/, /\bworthless (?:piece of )?(?:shit|trash)\b/,
];
const SEXUAL = [
  /\bsend (?:me )?(?:nudes|noods|pics of your|pussy|dick)\b/, /\bnudes? for (?:sale|cash|money)\b/, /\b(?:selling|buy) (?:my )?(?:nudes|content|feet pics)\b/,
  /\b(?:escort|hookup|hook up) (?:service|available|rates?)\b/, /\bsugar ?(?:daddy|baby|mommy) (?:wanted|needed|available|here)\b/,
  /\b(?:pay|paid) for (?:sex|a night|company)\b/, /\bonlyfans\.com\b/, /\bonly ?fans link\b/, /\bfull service\b.*\b(?:rate|donation|incall|outcall)\b/,
  /\b(?:incall|outcall)s?\b/, /\b(?:bbbj|gfe)\b/, /\bdm (?:me )?for (?:spicy|nudes|content|rates)\b/,
];
const THREATS = [
  /\b(?:i ?(?:will|'ll|ll|am going to|m going to|m gonna|ma|mma)|im gonna|gonna|going to) (?:kill|shoot|stab|murder|rape|hurt|beat up|beat) (?:you|u|ya|him|her|them)\b/,
  /\bi know where (?:you|u) live\b/, /\b(?:you|u)(?:'re| are| r) (?:dead|gonna die|going to die)\b/, /\bwatch your back\b/, /\bbomb (?:the|this|your)\b/,
  /\bshoot (?:up )?(?:the|this) (?:place|school|club|party|lounge)\b/,
];
const APPS = '(?:whats ?app|telegram|snap(?:chat)?|kik|wickr|signal|cash ?app|venmo|zelle|insta(?:gram)?|ig|tg)';
const OFF_PLATFORM = [
  new RegExp(`\\b${APPS}\\s*(?:me\\s*)?(?:at\\s*|is\\s*)?[:@]\\s*@?[a-z0-9_.]{3,}`, 'i'),
  new RegExp(`\\b(?:add|hit|text|dm|message|find|follow)\\s+me\\s+(?:up\\s+)?(?:on|at)\\s+${APPS}\\b`, 'i'),
  /\bpaypal\.me\/\S+/i,
];
const EMAIL = /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-z0-9.-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-z]{2,}/i;
const PHONE = /(?:\+?\d[\s().-]*){10,}/;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|me|ly|gg|xyz|link|app|site|shop|biz|info|ru|top)\b(?:\/\S*)?/gi;

/**
 * Screen member text. `kind` adjusts the contact rule: Exchange listings may say "DM me" but still may
 * not carry phone numbers or emails (deals stay on the platform).
 */
export function screenText(input: string | null | undefined, kind: 'post' | 'listing' | 'table' = 'post'): FilterVerdict {
  const raw = (input ?? '').trim();
  if (!raw) return {verdict: 'ok'};
  const n = normalizeForFilter(raw);
  const joined = joinSpaced(n);
  const nospace = n.replace(/[^a-z]/g, '');
  const any = (list: RegExp[]) => list.some((re) => re.test(n) || re.test(joined));
  const reject = (reason: FilterReason): FilterVerdict => ({verdict: 'reject', reason, message: FILTER_MESSAGES[reason]});

  if (any(SLURS) || /n[i]gg(?:er|a)/.test(nospace)) return reject('slur');
  if (any(THREATS)) return reject('threat');
  if (any(ABUSE)) return reject('abuse');
  if (any(SEXUAL)) return reject('sexual');

  if (EMAIL.test(raw) || PHONE.test(raw.replace(/\b(?:19|20)\d{2}\b/g, ''))) return reject('contact');
  if (kind !== 'listing' && OFF_PLATFORM.some((re) => re.test(raw))) return reject('contact');

  // Spam heuristics: link dumps, walls of repeats, shouting.
  const links = raw.match(LINK) ?? [];
  if (links.length >= 2 || (links.length === 1 && kind === 'table')) return reject('spam');
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length >= 8) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (top / words.length > 0.5) return reject('spam');
  }
  const letters = raw.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 40 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.85) return reject('spam');
  if (/(.)\1{9,}/.test(raw)) return reject('spam');
  if (/\b(?:free money|crypto giveaway|double your|guaranteed returns?|click (?:the )?link in (?:my )?bio|investment opportunity)\b/.test(n)) return reject('spam');

  return {verdict: 'ok'};
}

/** First rejection across several fields (title + description, etc.). */
export function screenFields(fields: Array<string | null | undefined>, kind: 'post' | 'listing' | 'table' = 'post'): FilterVerdict {
  for (const f of fields) {
    const v = screenText(f, kind);
    if (v.verdict === 'reject') return v;
  }
  return {verdict: 'ok'};
}
