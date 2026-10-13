// Read a finished Nova plan (nova_requests hub) that the signed-in member owns. Used by rooms that keep
// Nova's plan on their own rows (Departures trips, Per Diem nights).
import type {MemberCtx} from '@/lib/api/room';

/**
 * Read a finished Nova plan the member owns (RLS: own requests only) and return its text.
 * Only a plan the planner actually produced (kind 'plan', status ready/done) is accepted — the member's
 * client never sends plan text that it claims came from Nova.
 */
export async function ownNovaPlan(ctx: MemberCtx, requestId: string): Promise<{ok: true; plan: string} | {ok: false; status: number; error: string}> {
  const {data, error} = await ctx.supabase.from('nova_requests').select('id, member_id, kind, status, result').eq('id', requestId).maybeSingle();
  if (error) return {ok: false, status: 502, error: 'requests_unavailable'};
  if (!data || data.member_id !== ctx.userId) return {ok: false, status: 404, error: 'request_not_found'};
  const result = (data.result ?? {}) as {agent?: unknown; plan?: unknown};
  if (data.kind !== 'plan' || !['ready', 'done'].includes(data.status as string) || result.agent !== 'planner' || typeof result.plan !== 'string' || !result.plan.trim()) {
    return {ok: false, status: 409, error: 'plan_not_ready'};
  }
  return {ok: true, plan: result.plan.trim().slice(0, 8000)};
}
