/**
 * Append-only revenue / product event ledger (table: revenue_events).
 * Rules: a view, recommendation or pledge is never revenue; booked states need a
 * provider receipt; reversals reference the original row. Enforced in Zod here
 * AND by DB constraints + an append-only trigger.
 * SERVER-ONLY (uses the service role).
 */
import {revenueEventSchema, type RevenueEventInput} from '@/lib/contracts';
import {createServiceClient} from '@/lib/supabase/service';

export async function recordEvent(input: RevenueEventInput): Promise<{ok: boolean; duplicate?: boolean; error?: string}> {
  const parsed = revenueEventSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: parsed.error.issues.map((i) => i.message).join('; ')};
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return {ok: false, error: 'ledger unavailable'};
  const e = parsed.data;

  const {error} = await createServiceClient().from('revenue_events').insert({
    event_type: e.eventType,
    idempotency_key: e.idempotencyKey,
    trace_id: e.traceId,
    room_id: e.roomId,
    track: e.track,
    member_id: e.memberId,
    agent_id: e.agentId,
    provider_id: e.providerId,
    provider_receipt_id: e.providerReceiptId,
    campaign_id: e.campaignId,
    click_id: e.clickId,
    conversion_id: e.conversionId,
    amount_minor: e.amountMinor,
    currency: e.currency,
    state: e.state,
    reverses_event_id: e.reversesEventId,
  });
  if (error?.code === '23505') return {ok: true, duplicate: true}; // idempotent replay
  if (error) {
    console.warn('[revenue] insert failed', error.message, e.traceId);
    return {ok: false, error: error.message};
  }
  return {ok: true};
}

/** Engagement / access events: never carry an amount, never count as revenue. */
export function recordEngagement(
  eventType: string,
  ctx: {traceId: string; roomId: string; memberId: string | null; track?: 'finesse' | 'carpe_diem' | null; key?: string},
) {
  return recordEvent({
    eventType,
    idempotencyKey: ctx.key ?? `${eventType}:${ctx.traceId}`,
    traceId: ctx.traceId,
    roomId: ctx.roomId,
    track: ctx.track ?? null,
    memberId: ctx.memberId,
    state: 'intent',
  });
}
