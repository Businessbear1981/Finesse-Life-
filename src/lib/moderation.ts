// Member-safety rules shared by the UGC routes (Apple 1.2 / Play UGC): the text filter applied before a
// post, VIP post, Exchange listing, Game Room table, Wardrobe look, outing or Lounge profile is saved, the media-URL rule for posts, and the
// report/block vocabulary the API, the web rooms and the app share. Pure — no I/O, safe to unit test.
//
// The filter is a first line, not the whole system: anything it misses can be reported by members, three
// distinct reports hide the item pending review (20261017_s1_moderation.sql), and staff act from
// /api/moderation/queue. It errs toward letting ordinary conversation through.

export const REPORT_KINDS = ['post', 'vip_post', 'profile', 'listing', 'club_table', 'outing', 'look', 'nova_reply'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_REASONS = ['spam', 'harassment', 'hate', 'sexual', 'violence', 'self_harm', 'illegal', 'impersonation', 'scam', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Member-facing labels, in the order the reason picker shows them. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment or bullying',
  hate: 'Hate speech or slurs',
  sexual: 'Sexual content or solicitation',
  violence: 'Threats or violence',
  self_harm: 'Self-harm or suicide',
  scam: 'Scam or fraud',
  spam: 'Spam',
  impersonation: 'Impersonation',
  illegal: 'Illegal goods or activity',
  other: 'Something else',
};

/** Where each reportable kind lives (staff queue + actions). Profiles can't be hidden — suspend the author. */
export const MODERATION_TARGETS: Record<Exclude<ReportKind, 'nova_reply'>, {table: string; owner: string; snapshot: string; hideable: boolean}> = {
  post: {table: 'posts', owner: 'author_id', snapshot: 'id, author_id, content, media_urls, moderation_hidden, moderation_note, created_at', hideable: true},
  vip_post: {table: 'vip_posts', owner: 'author_id', snapshot: 'id, author_id, content, media_urls, moderation_hidden, moderation_note, created_at', hideable: true},
  profile: {table: 'profiles', owner: 'id', snapshot: 'id, display_name, username, avatar_url, posting_suspended_at', hideable: false},
  listing: {table: 'exchange_listings', owner: 'seller_id', snapshot: 'id, seller_id, title, description, photo_urls, status, moderation_hidden, moderation_note, created_at', hideable: true},
  club_table: {table: 'club_tables', owner: 'host_id', snapshot: 'id, host_id, title, note, status, moderation_hidden, moderation_note, created_at', hideable: true},
  outing: {table: 'outings', owner: 'host_id', snapshot: 'id, host_id, title, note, status, moderation_hidden, moderation_note, created_at', hideable: true},
  // Wardrobe floor looks (20261019_r1_ugc.sql).
  look: {table: 'wardrobe_looks', owner: 'user_id', snapshot: 'id, user_id, photo_url, caption, brands, moderation_hidden, moderation_note, created_at', hideable: true},
};

export const REPORTED_MESSAGE = 'Thank you. The house reviews every report within 24 hours and removes content that breaks the rules.';

/** The terms version members accept (bump when /terms changes materially; the sheet shows again). */
export const TERMS_VERSION = '2026-10-17';

export type FilterReason = 'slur' | 'abuse' | 'sexual' | 'threat' | 'contact' | 'spam';
export type FilterVerdict = {verdict: 'ok'} | {verdict: 'reject'; reason: FilterReason; message: string};

const MESSAGES: Record<FilterReason, string> = {
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
  const reject = (reason: FilterReason): FilterVerdict => ({verdict: 'reject', reason, message: MESSAGES[reason]});

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

const PUBLIC_UPLOAD_DIRS = ['uploads', 'photos', 'posts', 'avatars'];

/**
 * Post media must be images the member uploaded to OUR storage (R2 public base, from src/lib/r2.ts),
 * inside their own public upload folders (`<type>s/<userId>/…`, see memberUploadKey). Anything else —
 * outside hosts, other members' files, private folders — is rejected rather than silently dropped.
 */
export function checkMediaUrls(value: unknown, publicBase: string, userId: string, max = 4):
  {ok: true; urls: string[]} | {ok: false; message: string} {
  if (value === undefined || value === null) return {ok: true, urls: []};
  if (!Array.isArray(value)) return {ok: false, message: 'media_urls must be a list.'};
  if (value.length === 0) return {ok: true, urls: []};
  if (value.length > max) return {ok: false, message: `Up to ${max} photos per post.`};
  let base: URL;
  try {
    base = new URL(publicBase.replace(/\/$/, '') + '/');
  } catch {
    return {ok: false, message: 'Photo uploads aren’t available right now. Nothing was posted.'};
  }
  if (base.protocol !== 'https:') return {ok: false, message: 'Photo uploads aren’t available right now. Nothing was posted.'};
  const urls: string[] = [];
  for (const v of value) {
    if (typeof v !== 'string' || v.length > 600) return {ok: false, message: 'Photos must be uploaded through Finesse.'};
    let u: URL;
    try { u = new URL(v); } catch { return {ok: false, message: 'Photos must be uploaded through Finesse.'}; }
    if (u.origin !== base.origin || u.search || u.hash || u.username || u.password || !u.pathname.startsWith(base.pathname)) {
      return {ok: false, message: 'Photos must be uploaded through Finesse.'};
    }
    const rest = decodeURIComponent(u.pathname.slice(base.pathname.length));
    const [dir, owner, file, ...extra] = rest.split('/');
    if (extra.length || !PUBLIC_UPLOAD_DIRS.includes(dir) || owner !== userId || !/^[\w-]+\.(?:jpe?g|png|webp|gif)$/i.test(file ?? '')) {
      return {ok: false, message: 'Photos must be your own uploads.'};
    }
    urls.push(u.toString());
  }
  return {ok: true, urls};
}
