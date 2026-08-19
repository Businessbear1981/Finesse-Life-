import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { parseBody } from '@/lib/api/validate';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getSeason(date: Date): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  if (month >= 3 && month <= 5) return `Spring ${year}`;
  if (month >= 6 && month <= 8) return `Summer ${year}`;
  if (month >= 9 && month <= 11) return `Fall ${year}`;
  return `Winter ${year}`;
}

const logSchema = z.object({
  entry_type: z.enum(['outing_complete', 'registry_funded', 'scale_win', 'vault_milestone', 'stylist_box', 'nova_moment']),
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    // Auth check — user_id is derived from the session, never trusted from
    // the client body (the route previously accepted an arbitrary user_id
    // with no verification at all).
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

    const parsed = await parseBody(req, logSchema);
    if (parsed.error) return parsed.error;
    const { entry_type, title, description } = parsed.data;

    const season = getSeason(new Date());

    // Real schema (scrapbook_entries): no photo_urls/metadata columns exist;
    // entry_type/season added via 20260807_scrapbook_real_fields.sql.
    const { data, error } = await serviceClient
      .from('scrapbook_entries')
      .insert({
        user_id: user.id,
        entry_type,
        title,
        description: description ?? null,
        season,
      })
      .select('id, season')
      .single();

    if (error) {
      console.error('scrapbook/log insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, season: data.season });
  } catch (err) {
    console.error('scrapbook/log error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
