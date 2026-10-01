import {NextRequest} from 'next/server';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {DEFAULT_PROJECTION, visibilitySchema} from '@/lib/identity';

// PATCH /api/identity/visibility — audience controls. Profile traffic can only ever be "self".
export async function PATCH(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, visibilitySchema);
  if (parsed.error) return parsed.error;
  const {data: existing} = await ctx.supabase.from('identity_projections').select('public_fields, visibility').eq('user_id', ctx.userId).maybeSingle();
  const visibility = {...(existing?.visibility ?? DEFAULT_PROJECTION.visibility), ...parsed.data, profile_traffic: 'self'};
  const {data, error} = await ctx.supabase
    .from('identity_projections')
    .upsert({user_id: ctx.userId, public_fields: existing?.public_fields ?? DEFAULT_PROJECTION.public_fields, visibility, updated_at: new Date().toISOString()})
    .select('public_fields, visibility, updated_at')
    .single();
  if (error) return dbFailure(error, ctx.traceId, 'this-is-you');
  return json({projection: data}, ctx.traceId);
}
