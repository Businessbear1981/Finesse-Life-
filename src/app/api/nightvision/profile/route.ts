import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

interface NightvisionData {
  answers: Record<string, string | string[]>;
  style_dna: string;
  brand_radar: string[];
  style_tags: string[];
  photos?: {url: string; category: string}[];
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

    // Own row via the SECURITY DEFINER helper (nightvision_data is not SELECT-granted, 20261020_s4).
    const {data: rows, error} = await supabase.rpc('get_own_profile');

    if (error) {
      // Column/function may not exist yet — treat as no profile
      console.warn('[GET /api/nightvision/profile] query error:', error.message);
      return NextResponse.json({profile: null});
    }

    const nv = (rows?.[0] as {nightvision_data?: NightvisionData | null} | undefined)?.nightvision_data;
    if (!nv) {
      return NextResponse.json({profile: null});
    }

    return NextResponse.json({profile: nv as NightvisionData});
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
      photos?: {url: string; category: string}[];
    };

    const nightvision_data: NightvisionData = {
      answers: body.answers ?? {},
      style_dna: body.style_dna ?? '',
      brand_radar: body.brand_radar ?? [],
      style_tags: body.style_tags ?? [],
      photos: body.photos ?? [],
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
