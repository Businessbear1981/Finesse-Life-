// Business policy knobs in one place. Every value here is a DEFAULT pending Sean's sign-off;
// change it here (and bump the version) rather than in engine code. Sources noted per value.

/** Scale (group-buy) policy. */
export const SCALE_POLICY = {
  version: 1,
  /** Decline window after the goal is hit, hours (Workflow doc: 12h). Per-campaign override allowed. */
  declineWindowHours: 12,
  /** Waitlist size as a share of the unit goal (Workflow doc: 20% backfill). */
  waitlistShare: 0.2,
  /**
   * Strike ladder: penalty (basis points of the pledge) assessed at the Nth open strike, then bar.
   * Default mirrors the Workflow doc's escalating ladder: 1st strike is a warning, 2nd 25%, 3rd 50%,
   * 4th 100%, 5th bars from Scale. Industry analogues (eBay seller defects, Airbnb host cancellation
   * fees) escalate the same way and always start with a free warning.
   */
  strikeLadderBps: [0, 2500, 5000, 10000] as readonly number[],
  barAtStrikes: 5,
  /**
   * Strikes expire after this many days. Default 365: marketplaces evaluate defects on a rolling
   * 12-month window (eBay seller standards, Amazon account health), so old mistakes stop counting.
   */
  strikeExpiryDays: 365,
  /**
   * Penalties are only assessed (recorded on the strike) unless this is on. Off by default: charging
   * a member a fee needs explicit Terms language and Sean's approval.
   */
  chargePenalties: false,
} as const;

/** "$75 refer a friend" policy (Workflow §6). */
export const REFERRAL_POLICY = {
  version: 1,
  payoutCents: 7500,
  /**
   * Hold after the friend's first Pro payment clears before the credit is paid. Default 30 days:
   * covers the Pro refund window and the bulk of card disputes (most are filed within 30 days even
   * though networks allow up to 120); fintech referral programs (Chime, Robinhood, Wise) use 14–45 days.
   */
  holdDays: 30,
  /** Max credited referrals per member per calendar year (abuse cap; IRS 1099-MISC threshold is $600 = 8 payouts, so finance should track it). */
  annualPayoutCap: 20,
  /** Refund inside the hold voids the referral. After payout, claw back only if this is on (default off: industry norm is no clawback once the hold passes, except fraud). */
  clawbackAfterPayout: false,
} as const;

/** Social standing (not a credit score) policy. Weights sum to 100. */
export const SOCIAL_POLICY = {
  version: 1,
  /** Engines Spec factor weights. */
  weights: { interactions: 20, positive_content: 15, brand_ambassadorship: 20, helping_others: 15, outing_feedback: 20, campaign_participation: 10 },
  /** Older activity counts half after this many days (exponential decay, common in reputation systems). */
  halfLifeDays: 90,
  /** Points off per open Scale strike, capped. */
  strikePoints: 4,
  strikeCap: 20,
  /** Ratings only count once this many distinct members rated (k-anonymity, blocks single-rater bias). */
  minRaters: 5,
  /** New members show "building" until both thresholds pass. */
  buildingDays: 14,
  buildingSignals: 30,
} as const;

export function strikePenaltyBps(openStrikesIncludingThis: number): number {
  const l = SCALE_POLICY.strikeLadderBps;
  return l[Math.min(Math.max(openStrikesIncludingThis, 1), l.length) - 1] ?? 0;
}

/**
 * Financial data (Plaid) policy — docs/DATA_POLICY.md. Opt-in, consented, scoped, minimized.
 * Never an input to Standing (SOCIAL_POLICY) or any eligibility decision.
 */
export const PLAID_POLICY = {
  version: 1,
  /** Scopes a member can grant. Stored on fin.consents.scopes. */
  allowedScopes: ['accounts', 'balances'] as readonly string[],
  /** Link products. Balance cannot be a Link product, so Link initializes with transactions (we never store transactions). */
  linkProducts: ['transactions'] as readonly string[],
  /** Smallest history window Plaid accepts for transactions init; we do not persist transactions. */
  transactionsDaysRequested: 30,
  countryCodes: ['US'] as readonly string[],
  /** Max linked institutions per member. */
  maxItemsPerMember: 5,
  /** Webhook JWT must be issued within this window (Plaid recommends 5 minutes). */
  webhookMaxAgeSeconds: 300,
  /** On disconnect: remove the Item at Plaid, delete the token and accounts, mark consent revoked. */
  deleteOnDisconnect: true,
} as const;

/** Jazz Club (Feed.fm). Clients stream directly from Feed.fm (geo-IP licensing); we only mint short-lived credentials. */
export const JAZZ_POLICY = {
  /** Access-token lifetime handed to the member's device. Feed.fm clamps at 30 days; keep it short. */
  accessTokenTtlSeconds: 3600,
  /** Required attribution and disclaimer (Feed.fm display requirements). */
  attribution: 'Powered by Feed.fm',
  disclaimer: 'There is no affiliation, connection, association or endorsement of the products, goods or services displayed on this page by the copyright owners, featured recording artists and authors of the sound recordings (and the musical works embodied therein) transmitted through the Feed.fm player.',
} as const;
