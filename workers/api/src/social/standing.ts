// Standing (social score) per the Engines Spec. Not a credit score: Finesse activity and accounts the
// member connected on purpose only; no financial data; output sets priority and perks only.
import type { Tx } from '../db';

export const FACTORS = ['interactions', 'positive_content', 'brand_ambassadorship', 'helping_others', 'outing_feedback', 'campaign_participation'] as const;
export type Factor = (typeof FACTORS)[number];
export const WEIGHTS: Record<Factor, number> = { interactions: 20, positive_content: 15, brand_ambassadorship: 20, helping_others: 15, outing_feedback: 20, campaign_participation: 10 };
export const VERSION = 1;
export const HALF_LIFE_DAYS = 90;
export const STRIKE_POINTS = 4, STRIKE_CAP = 20;
export const MIN_RATERS = 5;
export const BUILDING_DAYS = 14, BUILDING_SIGNALS = 30;
export type Band = 'Arrival' | 'Resident' | 'Regular' | 'Patron' | 'Ambassador';

export const LABELS: Record<Factor, string> = {
  interactions: 'Conversations that go somewhere', positive_content: 'Content members value', brand_ambassadorship: 'Bringing people in',
  helping_others: 'Helping other members', outing_feedback: 'How outings with you go', campaign_participation: 'Keeping your pledges',
};
const IMPROVE: Record<Factor, string> = {
  interactions: 'Reply to members and make an introduction this week.', positive_content: 'Share a scrapbook entry or a post from your last outing.',
  brand_ambassadorship: 'Invite a friend with your referral code.', helping_others: 'Answer a question in the Lounge or introduce two members.',
  outing_feedback: 'Join a Finesse outing — ratings count after five different members.', campaign_participation: 'Join a Scale campaign and pay inside the 12-hour window.',
};

export function band(score: number): Band {
  return score >= 85 ? 'Ambassador' : score >= 70 ? 'Patron' : score >= 50 ? 'Regular' : score >= 30 ? 'Resident' : 'Arrival';
}

export const decay = (ageDays: number) => Math.pow(0.5, ageDays / HALF_LIFE_DAYS);

/** Raw (pre-percentile) factor metrics for one member. null = not enough evidence (factor held at the median). */
export interface RawMetrics {
  user_id: string;
  joined_at: Date;
  signal_total: number;
  open_strikes: number;
  raw: Record<Factor, number | null>;
}

/** Outing feedback: ≥5 distinct raters, top/bottom 10% trimmed, raters weighted by their own standing (capped). */
export function outingScore(ratings: { rater_id: string; score: number; rater_score?: number | null }[]): number | null {
  const latest = new Map<string, { score: number; w: number }>();
  for (const r of ratings) if (!latest.has(r.rater_id)) latest.set(r.rater_id, { score: r.score, w: Math.min(1.5, Math.max(0.5, (r.rater_score ?? 50) / 50)) });
  if (latest.size < MIN_RATERS) return null;
  const xs = [...latest.values()].sort((a, b) => a.score - b.score);
  const k = Math.floor(xs.length * 0.1);
  const kept = xs.slice(k, xs.length - k);
  const w = kept.reduce((s, x) => s + x.w, 0);
  return kept.reduce((s, x) => s + x.score * x.w, 0) / w;
}

/** Percentile rank (0..100) of v among values; ties share the mid-rank. */
export function percentile(values: number[], v: number): number {
  if (values.length <= 1) return 50;
  const below = values.filter((x) => x < v).length, equal = values.filter((x) => x === v).length;
  return Math.round(((below + (equal - 1) / 2) / (values.length - 1)) * 100);
}

export interface Standing { user_id: string; score: number; band: Band; building: boolean; factors: Record<Factor, number>; strikes: number; reasons: { strongest: string[]; room_to_grow: string; how: string }; confidence: number }

export function computeStandings(members: RawMetrics[], now = new Date()): Standing[] {
  const pools = Object.fromEntries(FACTORS.map((f) => [f, members.map((m) => m.raw[f]).filter((x): x is number => x != null)])) as Record<Factor, number[]>;
  return members.map((m) => {
    const factors = Object.fromEntries(FACTORS.map((f) => [f, m.raw[f] == null ? 50 : percentile(pools[f], m.raw[f]!)])) as Record<Factor, number>;
    const weighted = FACTORS.reduce((s, f) => s + factors[f] * WEIGHTS[f], 0) / 100;
    const penalty = Math.min(STRIKE_CAP, m.open_strikes * STRIKE_POINTS);
    const building = (+now - +m.joined_at) / 86_400_000 < BUILDING_DAYS || m.signal_total < BUILDING_SIGNALS;
    // New members start in Arrival with a "building" label — no penalty for being new, no jump either.
    const score = building ? Math.min(29, Math.max(0, Math.round(weighted - penalty))) : Math.max(0, Math.min(100, Math.round(weighted - penalty)));
    const ranked = [...FACTORS].sort((a, b) => factors[b] - factors[a]);
    const low = ranked[ranked.length - 1]!;
    const evidence = FACTORS.filter((f) => m.raw[f] != null).length / FACTORS.length;
    return {
      user_id: m.user_id, score, band: band(score), building, factors, strikes: m.open_strikes,
      reasons: { strongest: ranked.slice(0, 2).map((f) => LABELS[f]), room_to_grow: LABELS[low], how: IMPROVE[low] },
      confidence: Math.round(Math.min(1, evidence * Math.min(1, m.signal_total / BUILDING_SIGNALS)) * 100) / 100,
    };
  });
}

/** Load raw metrics for every member active in the last 180 days. */
export async function loadMetrics(tx: Tx, now = new Date()): Promise<RawMetrics[]> {
  const users = (await tx.query<{ id: string; created_at: Date }>(
    `select u.id, u.created_at from app.users u
     where exists (select 1 from social.signals_daily s where s.user_id = u.id and s.day > $1::date - 180)
        or exists (select 1 from scale.pledges p where p.user_id = u.id)
        or u.created_at > $1::timestamptz - interval '180 days'`, [now])).rows;
  const sig = (await tx.query<{ user_id: string; kind: string; w: number; n: number }>(
    `select user_id, kind, sum(count * power(0.5, ($1::date - day) / $2::float))::float w, sum(count)::int n
     from social.signals_daily where day > $1::date - 365 group by user_id, kind`, [now, HALF_LIFE_DAYS])).rows;
  const ratings = (await tx.query<{ ratee_id: string; rater_id: string; score: number; rater_score: number | null }>(
    `select distinct on (r.ratee_id, r.rater_id) r.ratee_id, r.rater_id, r.score, s.score rater_score
     from social.ratings r left join social.standing s on s.user_id = r.rater_id
     where r.created_at > $1::timestamptz - interval '365 days' order by r.ratee_id, r.rater_id, r.created_at desc`, [now])).rows;
  // A report counts only once upheld, or when 3+ unrelated members reported (one person cannot sink another).
  const reports = (await tx.query<{ target_id: string; n: number }>(
    `select target_id, (count(*) filter (where status = 'upheld') + case when count(*) filter (where status = 'pending') >= 3 then 1 else 0 end)::int n
     from social.reports group by target_id`)).rows;
  const scale = (await tx.query<{ user_id: string; kept: number; joined: number; missed: number }>(
    `select user_id, count(*) filter (where status = 'paid')::int kept, count(*)::int joined, count(*) filter (where status in ('declined','missed'))::int missed
     from scale.pledges group by user_id`)).rows;
  const strikes = (await tx.query<{ user_id: string; n: number }>(
    "select user_id, count(*)::int n from scale.strikes where voided_at is null and (expires_at is null or expires_at > $1) group by user_id", [now])).rows;
  const referrals = (await tx.query<{ referrer_id: string; n: number }>("select referrer_id, count(*)::int n from social.referrals where status in ('held','credited') group by referrer_id")).rows;

  return users.map((u) => {
    const s = (k: string) => sig.find((x) => x.user_id === u.id && x.kind === k)?.w ?? 0;
    const total = sig.filter((x) => x.user_id === u.id).reduce((a, x) => a + x.n, 0);
    const reported = reports.find((r) => r.target_id === u.id)?.n ?? 0;
    const sc = scale.find((x) => x.user_id === u.id);
    const refs = referrals.find((r) => r.referrer_id === u.id)?.n ?? 0;
    const mine = ratings.filter((r) => r.ratee_id === u.id);
    const any = (...ks: string[]) => ks.some((k) => s(k) > 0);
    return {
      user_id: u.id, joined_at: new Date(u.created_at), signal_total: total + (sc?.joined ?? 0),
      open_strikes: strikes.find((x) => x.user_id === u.id)?.n ?? 0,
      raw: {
        interactions: any('message_sent', 'reply_received', 'intro_accepted', 'conversation_continued')
          ? (s('reply_received') + s('conversation_continued') * 2 + s('intro_accepted') * 3) / Math.max(1, s('message_sent')) : null,
        positive_content: any('post_created', 'like_received', 'save_received', 'scrapbook_shared') || reported
          ? s('like_received') + s('save_received') * 2 + s('scrapbook_shared') * 2 - reported * 10 : null,
        brand_ambassadorship: refs || any('campaign_share_pledge', 'attributed_signup', 'referral_pro')
          ? refs * 5 + s('referral_pro') * 5 + s('campaign_share_pledge') * 2 + s('attributed_signup') * 2 : null,
        helping_others: any('intro_made', 'helpful_marked', 'help_given', 'contribution_sent')
          ? s('intro_made') + s('helpful_marked') * 2 + s('help_given') + s('contribution_sent') : null,
        outing_feedback: outingScore(mine),
        campaign_participation: sc ? sc.kept + sc.joined * 0.5 - sc.missed : null,
      },
    };
  });
}

export async function recompute(tx: Tx, now = new Date()): Promise<number> {
  const standings = computeStandings(await loadMetrics(tx, now), now);
  for (const s of standings) {
    await tx.query(
      `insert into social.standing(user_id, score, band, building, factors, weights, strikes, reasons, version, confidence, computed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (user_id) do update set score = excluded.score, band = excluded.band, building = excluded.building, factors = excluded.factors,
         weights = excluded.weights, strikes = excluded.strikes, reasons = excluded.reasons, version = excluded.version,
         confidence = excluded.confidence, computed_at = excluded.computed_at`,
      [s.user_id, s.score, s.band, s.building, s.factors, WEIGHTS, s.strikes, s.reasons, VERSION, s.confidence, now]);
  }
  return standings.length;
}

/** One rating per rater per member per 90 days; both must have attended the outing when one is given. */
export async function rate(tx: Tx, rater: string, ratee: string, score: number, outingId?: string) {
  if (rater === ratee) throw Object.assign(new Error('cannot rate yourself'), { code: 400 });
  const recent = await tx.query("select 1 from social.ratings where rater_id = $1 and ratee_id = $2 and created_at > now() - interval '90 days'", [rater, ratee]);
  if (recent.rowCount) throw Object.assign(new Error('already rated this member in the last 90 days'), { code: 409 });
  if (outingId) {
    const both = await tx.query('select count(distinct user_id)::int n from public.outing_participants where outing_id = $1 and user_id = any($2::uuid[])', [outingId, [rater, ratee]]);
    if ((both.rows[0] as any).n < 2) throw Object.assign(new Error('both members must have attended the outing'), { code: 403 });
  }
  await tx.query('insert into social.ratings(rater_id, ratee_id, outing_id, score) values ($1,$2,$3,$4)', [rater, ratee, outingId ?? null, score]);
}
