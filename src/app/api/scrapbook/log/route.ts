import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
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

export async function POST(req: Request) {
  try {
    const { user_id, entry_type, title, description, photo_urls, metadata } = await req.json();

    if (!user_id || !entry_type || !title) {
      return NextResponse.json({ error: 'user_id, entry_type, and title are required' }, { status: 400 });
    }

    const season = getSeason(new Date());

    const { data, error } = await supabase
      .from('scrapbook_entries')
      .insert({
        user_id,
        entry_type,
        title,
        description: description ?? null,
        photo_urls: photo_urls ?? [],
        metadata: metadata ?? null,
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
