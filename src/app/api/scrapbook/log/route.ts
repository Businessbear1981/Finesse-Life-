import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

// POST /api/scrapbook/log — add an entry to the signed-in member's own scrapbook.
// Security: the owner is taken from the session, never from the request body. This route
// previously accepted any user_id and wrote with the service role, so anyone could write
// into another member's scrapbook. It now uses the RLS-scoped client.
const body = z.object({
  entry_type: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullish(),
  photo_urls: z.array(z.string().url().max(2048)).max(20).optional(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

function getSeason(date: Date): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  if (month >= 3 && month <= 5) return `Spring ${year}`;
  if (month >= 6 && month <= 8) return `Summer ${year}`;
  if (month >= 9 && month <= 11) return `Fall ${year}`;
  return `Winter ${year}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out'}, {status: 401});
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const {entry_type, title, description, photo_urls, metadata} = parsed.data;

  const {data, error} = await supabase
    .from('scrapbook_entries')
    .insert({
      user_id: user.id,
      entry_type,
      title,
      description: description ?? null,
      photo_urls: photo_urls ?? [],
      metadata: metadata ?? null,
      season: getSeason(new Date()),
    })
    .select('id, season')
    .single();
  if (error) {
    console.error('[scrapbook/log] insert failed:', error.message);
    return NextResponse.json({error: 'Could not save the entry.'}, {status: 500});
  }
  return NextResponse.json({id: data.id, season: data.season}, {status: 201});
}
