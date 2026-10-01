import {dbFailure, json, requireMember} from '@/lib/api/room';
import {DEFAULT_PROJECTION, NEVER_PROJECTED, PROJECTABLE_FIELDS} from '@/lib/identity';

// GET /api/identity/context — the member's own record + exactly what others would see.
// The "public" preview is computed SERVER-SIDE from the allowlist, not by hiding with CSS.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const [{data: profile, error: pErr}, {data: proj, error: jErr}] = await Promise.all([
    ctx.supabase.from('profiles').select(`id, ${PROJECTABLE_FIELDS.join(', ')}, created_at`).eq('id', ctx.userId).single(),
    ctx.supabase.from('identity_projections').select('public_fields, visibility, updated_at').eq('user_id', ctx.userId).maybeSingle(),
  ]);
  if (pErr) return dbFailure(pErr, ctx.traceId, 'this-is-you');
  if (jErr) return dbFailure(jErr, ctx.traceId, 'this-is-you');

  const projection = (proj ?? {...DEFAULT_PROJECTION, updated_at: null}) as {public_fields: string[]; visibility: Record<string, string>; updated_at: string | null};
  const rec = (profile ?? {}) as unknown as Record<string, unknown>;
  const publicView = Object.fromEntries(projection.public_fields.filter((f) => (PROJECTABLE_FIELDS as readonly string[]).includes(f)).map((f) => [f, rec[f] ?? null]));

  return json({
    self: rec,
    projection,
    publicView,
    projectableFields: PROJECTABLE_FIELDS,
    neverProjected: NEVER_PROJECTED,
  }, ctx.traceId);
}
