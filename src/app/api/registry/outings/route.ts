import { NextResponse } from 'next/server';
import {createClient} from '@/lib/supabase/server';
import { z } from 'zod';
import { parseBody } from '@/lib/api/validate';
import { screenFields } from '@/lib/moderation';
import { contentRejected } from '@/lib/moderation-server';

interface OutingRow {
  id: string;
  title: string;
  partner: string | null;
  occasion_type: string | null;
  date_at: string | null;
  note: string | null;
  status: string;
}

function toCard(row: OutingRow) {
  return {
    id: row.id,
    title: row.title,
    partner: row.partner ?? '',
    occasion_type: row.occasion_type ?? '',
    date: row.date_at,
    note: row.note ?? '',
    status: row.status,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ outings: [] });
    }

    const { data, error } = await supabase
      .from('outings')
      .select('id, title, partner, occasion_type, date_at, note, status')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/registry/outings]', error);
      return NextResponse.json({ error: 'Failed to load outings.' }, { status: 500 });
    }

    return NextResponse.json({ outings: (data ?? []).map(toCard) });
  } catch (err) {
    console.error('[GET /api/registry/outings] error:', err);
    return NextResponse.json({ error: 'Failed to load outings.' }, { status: 500 });
  }
}

const outingSchema = z.object({
  title: z.string().trim().min(1, 'Title required.').max(120),
  partner: z.string().trim().max(80).optional(),
  occasion_type: z.string().trim().max(40).optional(),
  date: z.string().max(40).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.', message: 'Sign in first. Nothing was saved.' }, { status: 401 });
    }

    const parsed = await parseBody(req, outingSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    // Open outings show on the Lounge to other members, so the title and note go through the house text
    // filter (Apple 1.2 / Play UGC). 422 content_rejected with the reason; nothing is saved.
    const verdict = screenFields([body.title, body.note, body.partner]);
    if (verdict.verdict === 'reject') return contentRejected(verdict);

    const { data, error } = await supabase
      .from('outings')
      .insert({
        host_id: user.id,
        title: body.title.trim(),
        partner: body.partner ?? null,
        occasion_type: body.occasion_type ?? null,
        date_at: body.date || null,
        note: body.note ?? null,
        status: 'open',
      })
      .select('id, title, partner, occasion_type, date_at, note, status')
      .single();

    if (error) {
      console.error('[registry/outings] insert error:', error);
      return NextResponse.json({ error: 'Failed to create outing.', message: 'Something went wrong on the house side. Nothing was saved.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, outing: toCard(data) });
  } catch (err) {
    console.error('[registry/outings] error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
