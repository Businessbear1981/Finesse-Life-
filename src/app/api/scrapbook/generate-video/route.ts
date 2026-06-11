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

export async function POST(req: Request) {
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

    const { entry_id } = await req.json();
    if (!entry_id) {
      return NextResponse.json({ error: 'entry_id is required' }, { status: 400 });
    }

    // Fetch entry — ensure ownership
    const { data: entry, error: fetchError } = await serviceClient
      .from('scrapbook_entries')
      .select('id, title, description, user_id')
      .eq('id', entry_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Build cinematic prompt
    const prompt = `Cinematic lifestyle moment: ${entry.title}. ${entry.description ?? 'A beautiful, intimate moment captured in time'}. Luxury aesthetic, golden hour light, intimate atmosphere.`;

    // Call Higgsfield text-to-video
    const higgsfieldRes = await fetch(`${HIGGSFIELD_BASE}/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key-Id': HIGGSFIELD_KEY_ID,
        'X-Api-Key-Secret': HIGGSFIELD_SECRET,
      },
      body: JSON.stringify({
        prompt,
        duration: 4,
        aspect_ratio: '9:16',
        style: 'cinematic',
      }),
    });

    if (!higgsfieldRes.ok) {
      const errText = await higgsfieldRes.text();
      console.error('Higgsfield error:', higgsfieldRes.status, errText);
      return NextResponse.json({ error: 'Video generation failed', detail: errText }, { status: 502 });
    }

    const { job_id } = await higgsfieldRes.json();

    // Update entry with job_id + pending status
    await serviceClient
      .from('scrapbook_entries')
      .update({ video_job_id: job_id, video_status: 'pending' })
      .eq('id', entry_id);

    return NextResponse.json({ job_id, status: 'pending' });
  } catch (err) {
    console.error('scrapbook/generate-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
