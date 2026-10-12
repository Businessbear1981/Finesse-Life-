import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {NETWORKS, NETWORK_IDS, openToken} from '@/lib/switchboard';

// Member session client throughout (RLS: 20261016_w3_switchboard.sql).

// GET /api/switchboard/broadcast → {broadcasts} (own log, newest first)
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {data, error} = await ctx.supabase.from('social_broadcasts').select('id, platforms, content, results, status, created_at')
    .eq('user_id', ctx.userId).order('created_at', {ascending: false}).limit(50);
  if (error) return dbFailure(error, ctx.traceId, 'switchboard');
  return json({broadcasts: data ?? []}, ctx.traceId);
}

const body = z.object({
  content: z.string().trim().min(1).max(280),
  platforms: z.array(z.enum(NETWORK_IDS)).min(1).max(NETWORKS.length),
});
type Result = {status: 'sent' | 'failed' | 'not_connected' | 'not_supported'; message?: string};

// POST /api/switchboard/broadcast {content, platforms} → 200 {results, status} | 409 no_connected_network
// Posts only to networks with a real OAuth token that opens with INTEGRATIONS_ENCRYPTION_KEY and that support
// posting. If none qualifies nothing is sent and nothing is logged.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const {content, platforms} = parsed.data;

  const {data: rows, error} = await ctx.supabase.from('social_accounts').select('platform, connected, access_token_enc').eq('user_id', ctx.userId).in('platform', platforms);
  if (error) return dbFailure(error, ctx.traceId, 'switchboard');

  const results: Record<string, Result> = {};
  const ready: {platform: string; accessToken: string}[] = [];
  for (const p of platforms) {
    const row = ((rows ?? []) as {platform: string; connected: boolean | null; access_token_enc: string | null}[]).find((r) => r.platform === p);
    const token = row?.connected ? openToken(row.access_token_enc) : null;
    if (!token) { results[p] = {status: 'not_connected', message: 'Not connected — OAuth sign-in is coming soon.'}; continue; }
    if (!NETWORKS.find((n) => n.id === p)?.canPost) { results[p] = {status: 'not_supported', message: 'Posting to this network is not available yet.'}; continue; }
    ready.push({platform: p, accessToken: token.access_token});
  }
  if (ready.length === 0) {
    return json({error: 'no_connected_network', results, message: 'None of these networks is connected, so nothing was sent.'}, ctx.traceId, 409);
  }

  for (const {platform, accessToken} of ready) {
    try {
      if (platform === 'twitter') {
        const res = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json'},
          body: JSON.stringify({text: content}),
        });
        results[platform] = res.ok ? {status: 'sent'} : {status: 'failed', message: `X answered ${res.status}. Nothing was posted.`};
      }
    } catch {
      results[platform] = {status: 'failed', message: 'The network did not answer. Nothing was posted.'};
    }
  }

  const values = Object.values(results);
  const status = values.every((r) => r.status === 'sent') ? 'sent' : values.some((r) => r.status === 'sent') ? 'partial' : 'failed';
  const {data: logged} = await ctx.supabase.from('social_broadcasts').insert({user_id: ctx.userId, platforms, content, results, status}).select('id').maybeSingle();
  return json({id: logged?.id ?? null, results, status}, ctx.traceId);
}
