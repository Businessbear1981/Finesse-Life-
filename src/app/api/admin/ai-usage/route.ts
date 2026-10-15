import {NextResponse, type NextRequest} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';
import {buildReport, clampDays, sinceFor, type DailyRow} from '@/lib/ai-usage-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = {'Cache-Control': 'no-store'};

function bearerMatches(req: NextRequest): boolean {
  const expected = process.env.AI_USAGE_EXPORT_TOKEN;
  // Require a long random token; a short or missing one never authorizes.
  if (!expected || expected.length < 32) return false;
  const got = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return false;
  // Own role via the SECURITY DEFINER helper (role is not SELECT-granted to members, 20261020_s4).
  const {data} = await supabase.rpc('get_own_profile');
  const role = data?.[0]?.role;
  return role === 'admin' || role === 'owner';
}

// GET /api/admin/ai-usage?days=30 — aggregate token usage (counts + estimated cost only).
// Auth: an admin/owner session, or `Authorization: Bearer $AI_USAGE_EXPORT_TOKEN`
// (read-only export used by scripts/obsidian-sync-usage.mjs).
export async function GET(req: NextRequest) {
  if (!bearerMatches(req) && !(await isAdmin())) {
    return NextResponse.json({error: 'forbidden'}, {status: 403, headers: noStore});
  }
  const days = clampDays(req.nextUrl.searchParams.get('days'));
  const since = sinceFor(days);

  const {data, error} = await createServiceClient()
    .from('ai_usage_daily')
    .select('day, feature, model, calls, failures, input_tokens, output_tokens, cache_read_tokens, total_tokens, est_cost_micros')
    .gte('day', since)
    .order('day', {ascending: true})
    .limit(20_000);
  if (error) {
    console.warn('[ai-usage] report query failed', error.code);
    return NextResponse.json({error: 'unavailable'}, {status: 503, headers: noStore});
  }
  return NextResponse.json(buildReport((data ?? []) as DailyRow[], since, days), {headers: noStore});
}
