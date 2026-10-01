import {dbFailure, json, requireMember} from '@/lib/api/room';

// GET /api/ballroom/context — the member's upcoming evenings and what can feed one.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const since = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const {data, error} = await ctx.supabase
    .from('ballroom_evenings')
    .select('id, title, occasion, starts_at, party_size, track, components, state, updated_at')
    .eq('user_id', ctx.userId)
    .neq('state', 'cancelled')
    .gte('starts_at', since)
    .order('starts_at')
    .limit(10);
  if (error) return dbFailure(error, ctx.traceId, 'ballroom');

  const [{count: looks}, {count: wishes}] = await Promise.all([
    ctx.supabase.from('wardrobe_looks').select('id', {count: 'exact', head: true}).eq('user_id', ctx.userId),
    ctx.supabase.from('registry_items').select('id', {count: 'exact', head: true}).eq('user_id', ctx.userId),
  ]);
  return json({evenings: data ?? [], sources: {looks: looks ?? 0, registryWishes: wishes ?? 0}}, ctx.traceId);
}
