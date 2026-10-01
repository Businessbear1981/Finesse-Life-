import {NextRequest} from 'next/server';
import {z} from 'zod';
import {emit} from '@/lib/intelligence';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {trackSchema} from '@/lib/contracts';
import {cashbackRateBps} from '@/lib/vault-guard';
import {recordEngagement} from '@/lib/revenue/events';

const joinSchema = z.object({
  deal_id: z.string().uuid(),
  amount_cents: z.number().int().positive().optional(), // display price only; never charged here
  track: trackSchema.optional(),
});

// POST /api/scale/join — record a PLEDGE. No charge, no revenue, no Vault credit.
// After the goal is met, new joins go on the waitlist. Payment is requested later,
// only when a processor is live (see migration 20261003_scale_pledge_states.sql).
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, joinSchema);
  if (parsed.error) return parsed.error;
  const {deal_id, amount_cents, track} = parsed.data;

  const {data: deal, error: dErr} = await ctx.supabase
    .from('scale_deals').select('id, status, current_count, goal_count, deadline').eq('id', deal_id).maybeSingle();
  if (dErr) return dbFailure(dErr, ctx.traceId, 'scale');
  if (!deal) return json({error: 'not_found'}, ctx.traceId, 404);
  if (deal.status === 'closed' || deal.status === 'cancelled' || (deal.deadline && new Date(deal.deadline) < new Date())) {
    return json({error: 'window_closed', message: 'This group has closed.'}, ctx.traceId, 409);
  }
  const state = deal.status === 'met' || deal.current_count >= deal.goal_count ? 'waitlisted' : 'pledged';

  const {data: join, error} = await ctx.supabase
    .from('scale_joins')
    .insert({user_id: ctx.userId, deal_id, state, track: track ?? null})
    .select('id, state, joined_at')
    .single();
  if (error?.code === '23505') return json({error: 'already_joined', message: 'You are already in this group.'}, ctx.traceId, 409);
  // Pre-migration databases have no `state` column — fall back to the legacy insert.
  if (error && /state|track/.test(error.message ?? '')) {
    const {error: legacyErr} = await ctx.supabase.from('scale_joins').insert({user_id: ctx.userId, deal_id});
    if (legacyErr?.code === '23505') return json({error: 'already_joined'}, ctx.traceId, 409);
    if (legacyErr) return dbFailure(legacyErr, ctx.traceId, 'scale');
  } else if (error) {
    return dbFailure(error, ctx.traceId, 'scale');
  }

  void emit({user_id: ctx.userId, kind: 'scale_join', payload: {deal_id, state}});
  await recordEngagement('scale.pledged', {traceId: ctx.traceId, roomId: 'scale', memberId: ctx.userId, track: track ?? null, key: `scale.pledged:${ctx.userId}:${deal_id}`});

  const rate = cashbackRateBps();
  return json({
    success: true,
    joined: true,
    state: join?.state ?? state,
    charged: false,
    // Only shown when an approved rate exists — and always an estimate, never a credit.
    estimated_cashback_cents: rate !== null && amount_cents ? Math.floor((amount_cents * rate) / 10_000) : null,
    message: state === 'waitlisted'
      ? 'The group is full — you are on the waitlist. Nothing has been charged.'
      : "You're in. Nothing is charged unless the group fills and you confirm payment.",
  }, ctx.traceId);
}
