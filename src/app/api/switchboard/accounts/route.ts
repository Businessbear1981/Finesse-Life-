import {NextRequest} from 'next/server';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {NETWORK_IDS, networkStatus} from '@/lib/switchboard';

// The member's own session client (RLS: 20261016_w3_switchboard.sql) — no service role. Members can read and
// disconnect their links; only a server-side OAuth callback can create one, and none is configured yet.

// GET /api/switchboard/accounts → {accounts: [{platform, label, connected, canBroadcast, username, connectedAt, oauth}]}
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {data, error} = await ctx.supabase.from('social_accounts').select('*').eq('user_id', ctx.userId);
  if (error) return dbFailure(error, ctx.traceId, 'switchboard');
  return json({accounts: networkStatus(data ?? [])}, ctx.traceId);
}

// POST /api/switchboard/accounts — there is no OAuth app yet, so nothing can be connected. Honest 501, nothing saved.
export async function POST() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  return json({error: 'oauth_not_available', message: 'Connecting a network needs its OAuth sign-in, which is coming soon. Nothing was saved.'}, ctx.traceId, 501);
}

// DELETE /api/switchboard/accounts?platform=twitter — disconnect (removes the link and its sealed token).
export async function DELETE(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const platform = req.nextUrl.searchParams.get('platform') ?? '';
  if (!(NETWORK_IDS as string[]).includes(platform)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {error} = await ctx.supabase.from('social_accounts').delete().eq('user_id', ctx.userId).eq('platform', platform);
  if (error) return dbFailure(error, ctx.traceId, 'switchboard');
  return json({disconnected: platform}, ctx.traceId);
}
