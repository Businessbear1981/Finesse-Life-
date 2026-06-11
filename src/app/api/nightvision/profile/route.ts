import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

interface NightvisionData {
  answers: Record<string, string | string[]>;
  style_dna: string;
  brand_radar: string[];
  style_tags: string[];
  generated_at: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {data, error} = await supabase
      .from('profiles')
      .select('nightvision_data')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      // Column may not exist yet — treat as no profile
      console.warn('[GET /api/nightvision/profile] query error:', error.message);
      return NextResponse.json({profile: null});
    }

    if (!data || !data.nightvision_data) {
      return NextResponse.json({profile: null});
    }

    return NextResponse.json({profile: data.nightvision_data as NightvisionData});
  } catch (err) {
    console.error('[GET /api/nightvision/profile]', err);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const body = (await req.json()) as {
      answers: Record<string, string | string[]>;
      style_dna: string;
      brand_radar: string[];
      style_tags: string[];
    };

    const nightvision_data: NightvisionData = {
      answers: body.answers ?? {},
      style_dna: body.style_dna ?? '',
      brand_radar: body.brand_radar ?? [],
      style_tags: body.style_tags ?? [],
      generated_at: new Date().toISOString(),
    };

    const {error} = await supabase
      .from('profiles')
      .upsert(
        {id: user.id, nightvision_data, updated_at: new Date().toISOString()},
        {onConflict: 'id'},
      );

    if (error) {
      console.error('[POST /api/nightvision/profile]', error.message);
      return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({ok: true, generated_at: nightvision_data.generated_at});
  } catch (err) {
    console.error('[POST /api/nightvision/profile]', err);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
