/**
 * Shared API contracts (Zod). Server routes parse with these; clients may import the types.
 */
import {z} from 'zod';

export const trackSchema = z.enum(['finesse', 'carpe_diem']);
export const truthStateSchema = z.enum(['wired', 'specified', 'preview', 'gated', 'error']);

export const roomContextSchema = z.object({
  roomId: z.string().min(1),
  track: trackSchema,
  memberId: z.string().min(1),
  traceId: z.string().min(1),
  consentSnapshotId: z.string().nullable(),
  truthState: truthStateSchema,
});

/* ── Public entrance KeyLock ─────────────────────────────────────────── */
export const entranceVerifyRequest = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});
export const entranceVerifyResponse = z.discriminatedUnion('state', [
  z.object({state: z.literal('open'), mode: z.enum(['production', 'preview']), traceId: z.string()}),
  z.object({state: z.enum(['invalid', 'expired', 'rate_limited']), message: z.string(), traceId: z.string()}),
]);

/* ── VIP / Penthouse private lift ────────────────────────────────────── */
export const vipLiftChallengeResponse = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('ready'),
    challengeId: z.string().uuid(),
    mode: z.enum(['verify', 'enroll']),
    expiresAt: z.string(),
    traceId: z.string(),
  }),
  z.object({
    state: z.enum(['signed_out', 'not_entitled', 'expired', 'rate_limited', 'unavailable']),
    message: z.string(),
    traceId: z.string(),
  }),
]);

export const vipLiftVerifyRequest = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
  destination: z.enum(['vip-room', 'penthouse']).default('penthouse'),
});

export const vipLiftVerifyResponse = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('unlocked'),
    destination: z.enum(['vip-room', 'penthouse']),
    href: z.enum(['/vip', '/vip/penthouse']),
    expiresAt: z.string(),
    traceId: z.string(),
  }),
  z.object({
    state: z.enum(['signed_out', 'not_entitled', 'invalid', 'expired', 'rate_limited', 'unavailable']),
    message: z.string(),
    attemptsRemaining: z.number().int().nonnegative().optional(),
    traceId: z.string(),
  }),
]);

/* ── Revenue / product events ────────────────────────────────────────── */
export const revenueStateSchema = z.enum([
  'impression', 'intent', 'outbound_click', 'quote', 'hold',
  'authorized', 'confirmed', 'settled', 'reversed', 'refunded',
]);
/** Only these states may carry booked revenue, and only with a provider receipt. */
export const BOOKABLE_REVENUE_STATES = ['confirmed', 'settled', 'reversed', 'refunded'] as const;

export const revenueEventSchema = z
  .object({
    eventType: z.string().min(3).max(80),
    idempotencyKey: z.string().min(8).max(200),
    traceId: z.string().min(1),
    roomId: z.string().min(1),
    track: trackSchema.nullable(),
    memberId: z.string().uuid().nullable(),
    agentId: z.string().nullable().default(null),
    providerId: z.string().nullable().default(null),
    providerReceiptId: z.string().nullable().default(null),
    campaignId: z.string().nullable().default(null),
    clickId: z.string().nullable().default(null),
    conversionId: z.string().nullable().default(null),
    amountMinor: z.number().int().nullable().default(null),
    currency: z.string().length(3).nullable().default(null),
    state: revenueStateSchema,
    reversesEventId: z.string().uuid().nullable().default(null),
  })
  .superRefine((e, ctx) => {
    const bookable = (BOOKABLE_REVENUE_STATES as readonly string[]).includes(e.state);
    if (bookable && (!e.providerId || !e.providerReceiptId)) {
      ctx.addIssue({code: 'custom', message: 'Booked revenue requires providerId + providerReceiptId'});
    }
    if (!bookable && e.amountMinor !== null && e.amountMinor !== 0) {
      ctx.addIssue({code: 'custom', message: `State "${e.state}" cannot carry revenue amount`});
    }
    if ((e.state === 'reversed' || e.state === 'refunded') && !e.reversesEventId) {
      ctx.addIssue({code: 'custom', message: 'Reversal/refund must reference the original event'});
    }
  });

export type Track = z.infer<typeof trackSchema>;
export type RoomContext = z.infer<typeof roomContextSchema>;
export type EntranceVerifyResponse = z.infer<typeof entranceVerifyResponse>;
export type VipLiftChallengeResponse = z.infer<typeof vipLiftChallengeResponse>;
export type VipLiftVerifyResponse = z.infer<typeof vipLiftVerifyResponse>;
export type RevenueEventInput = z.input<typeof revenueEventSchema>;
