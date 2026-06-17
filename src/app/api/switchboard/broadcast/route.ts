import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ broadcasts: [] });

  const { data } = await service
    .from('social_broadcasts')
    .select('id, platforms, content, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ broadcasts: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content, platforms } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: 'at least one platform required' }, { status: 400 });
  }

  // Fetch stored tokens
  const { data: accounts } = await service
    .from('social_accounts')
    .select('platform, access_token_enc, connected')
    .eq('user_id', user.id)
    .in('platform', platforms)
    .eq('connected', true);

  const results: Record<string, { status: string; message?: string }> = {};

  for (const platform of platforms) {
    const account = (accounts ?? []).find((a) => a.platform === platform);

    if (!account || !account.access_token_enc) {
      // No token — log as needs-connection
      results[platform] = { status: 'not_connected', message: 'Platform not connected — token required' };
      continue;
    }

    // Attempt platform-specific post
    try {
      switch (platform) {
        case 'twitter': {
          const res = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${account.access_token_enc}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: content.slice(0, 280) }),
          });
          results[platform] = res.ok ? { status: 'sent' } : { status: 'failed', message: `HTTP ${res.status}` };
          break;
        }
        case 'instagram': {
          // Instagram requires page/creator account — log as pending
          results[platform] = { status: 'pending', message: 'Instagram posting requires Creator account setup' };
          break;
        }
        case 'tiktok': {
          results[platform] = { status: 'pending', message: 'TikTok posting via API requires video attachment' };
          break;
        }
        default:
          results[platform] = { status: 'not_supported', message: `Direct API posting not yet available for ${platform}` };
      }
    } catch (e) {
      results[platform] = { status: 'failed', message: String(e) };
    }
  }

  // Log broadcast record
  const broadcastStatus = Object.values(results).every((r) => r.status === 'sent') ? 'sent'
    : Object.values(results).some((r) => r.status === 'sent') ? 'partial' : 'queued';

  await service.from('social_broadcasts').insert({
    user_id: user.id,
    platforms,
    content,
    results,
    status: broadcastStatus,
  });

  return NextResponse.json({ results, status: broadcastStatus });
}
