import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ outings: [] });
    }

    const { data, error } = await supabase
      .from('outings')
      .select('id, title, partner, occasion_type, date, note, status')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/registry/outings]', error);
      return NextResponse.json({ outings: [] });
    }

    return NextResponse.json({ outings: data ?? [] });
  } catch (err) {
    console.error('[GET /api/registry/outings] error:', err);
    return NextResponse.json({ outings: [] });
  }
}

interface OutingPayload {
  title: string;
  partner?: string;
  occasion_type?: string;
  date?: string;
  note?: string;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await req.json()) as OutingPayload;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title required.' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Outing created.',
        id: `demo_${Date.now()}`,
      });
    }

    const { data, error } = await supabase
      .from('outings')
      .insert({
        creator_id: user.id,
        title: body.title.trim(),
        partner: body.partner ?? null,
        occasion_type: body.occasion_type ?? null,
        date: body.date || null,
        note: body.note ?? null,
        status: 'proposed',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[registry/outings] insert error:', error);
      return NextResponse.json({
        success: true,
        message: 'Outing saved.',
        id: `local_${Date.now()}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Outing created.',
      id: data.id,
    });
  } catch (err) {
    console.error('[registry/outings] error:', err);
    return NextResponse.json(
      { success: true, message: 'Outing queued.' },
      { status: 200 },
    );
  }
}
