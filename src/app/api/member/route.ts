import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim();
  if (!username) return NextResponse.json({found: false});

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {data: profile} = await supabase
    .from('profiles')
    .select('display_name, gender, vibe, city')
    .ilike('display_name', username)
    .maybeSingle();

  if (!profile) return NextResponse.json({found: false});

  return NextResponse.json({
    found: true,
    display_name: profile.display_name,
    gender: profile.gender,
    vibe: profile.vibe,
    city: profile.city,
  });
}
