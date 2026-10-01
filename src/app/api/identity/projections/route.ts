import {NextRequest} from 'next/server';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {DEFAULT_PROJECTION, projectionsSchema} from '@/lib/identity';

// PATCH /api/identity/projections — choose which allowlisted fields members see.
export async function PATCH(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, projectionsSchema);
  if (parsed.error) return parsed.error;
  const {data: existing} = await ctx.supabase.from('identity_projections').select('visibility').eq('user_id', ctx.userId).maybeSingle();
  const {data, error} = await ctx.supabase
    .from('identity_projections')
    .upsert({user_id: ctx.userId, public_fields: parsed.data.publicFields, visibility: existing?.visibility ?? DEFAULT_PROJECTION.visibility, updated_at: new Date().toISOString()})
    .select('public_fields, visibility, updated_at')
    .single();
  if (error) return dbFailure(error, ctx.traceId, 'this-is-you');
  return json({projection: data}, ctx.traceId);
}
