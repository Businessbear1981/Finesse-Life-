import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const HIGGSFIELD_BASE = 'https://platform.higgsfield.ai/v1';
const HIGGSFIELD_KEY_ID = '1388eeb1-9dfc-465a-b52a-dd117280e845';
const HIGGSFIELD_SECRET = '892fa0dc7fea9d01e452296801a1355b759f6d25d06161ef472258e5d083eb81';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entry_id = searchParams.get('entry_id');
    if (!entry_id) {
      return NextResponse.json({ error: 'entry_id is required' }, { status: 400 });
    }

    // Fetch entry — ensure ownership
    const { data: entry, error: fetchError } = await serviceClient
      .from('scrapbook_entries')
      .select('id, video_job_id, video_status, video_url, user_id')
      .eq('id', entry_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // If already ready or no job, return current state
    if (entry.video_status === 'ready' || entry.video_status === 'none' || !entry.video_job_id) {
      return NextResponse.json({ status: entry.video_status, video_url: entry.video_url ?? null });
    }

    // Poll Higgsfield
    const pollRes = await fetch(`${HIGGSFIELD_BASE}/jobs/${entry.video_job_id}`, {
      headers: {
        'X-Api-Key-Id': HIGGSFIELD_KEY_ID,
        'X-Api-Key-Secret': HIGGSFIELD_SECRET,
      },
    });

    if (!pollRes.ok) {
      return NextResponse.json({ status: entry.video_status, video_url: null });
    }

    const job = await pollRes.json();
    const jobStatus: string = job.status ?? 'pending';

    if (jobStatus === 'completed' && job.result?.url) {
      await serviceClient
        .from('scrapbook_entries')
        .update({ video_url: job.result.url, video_status: 'ready' })
        .eq('id', entry_id);
      return NextResponse.json({ status: 'ready', video_url: job.result.url });
    }

    if (jobStatus === 'failed') {
      await serviceClient
        .from('scrapbook_entries')
        .update({ video_status: 'failed' })
        .eq('id', entry_id);
      return NextResponse.json({ status: 'failed', video_url: null });
    }

    return NextResponse.json({ status: 'pending', video_url: null });
  } catch (err) {
    console.error('scrapbook/video-status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
