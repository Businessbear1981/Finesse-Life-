import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {parseBody} from '@/lib/api/validate';
import {checkMediaUrls, screenFields} from '@/lib/moderation';
import {TERMS_REQUIRED_MESSAGE, contentRejected, myBlockedIds, postingGate} from '@/lib/moderation-server';
import {r2PublicBase} from '@/lib/r2';

export const dynamic = 'force-dynamic';

const NO_STORE = {'Cache-Control': 'no-store'};

type LookRow = {id: string; user_id: string; moderation_hidden?: boolean | null} & Record<string, unknown>;

// GET /api/wardrobe/looks            → {looks} the member's own rack
// GET /api/wardrobe/looks?feed=true  → {looks} the floor: most liked first
//
// Both read AS THE MEMBER (cookie or mobile bearer), so RLS applies: looks staff hid and looks by members
// blocked in either direction never leave the database (20261019_r1_ugc.sql). The member's own block list
// and the hidden flag are also filtered here, so the floor stays right on a server that hasn't had that
// migration yet.
export async function GET(req: Request) {
  const feed = new URL(req.url).searchParams.get('feed') === 'true';
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (feed) {
    const {data, error} = await supabase
      .from('wardrobe_looks')
      .select('*, profiles:user_id(display_name, username, avatar_url, city)')
      .order('likes_count', {ascending: false})
      .order('created_at', {ascending: false})
      .limit(40);
    if (error) {
      console.error('[GET /api/wardrobe/looks] feed read failed', error.code);
      return NextResponse.json({looks: [], error: 'unavailable', message: 'The floor couldn’t load just now.'}, {status: 500, headers: NO_STORE});
    }
    const blocked = user ? await myBlockedIds(supabase, user.id) : new Set<string>();
    const looks = ((data ?? []) as LookRow[]).filter(
      (l) => (user && l.user_id === user.id) || (!l.moderation_hidden && !blocked.has(String(l.user_id))),
    );
    return NextResponse.json({looks}, {headers: NO_STORE});
  }

  if (!user) return NextResponse.json({looks: []}, {headers: NO_STORE});
  const {data, error} = await supabase
    .from('wardrobe_looks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', {ascending: false});
  if (error) {
    console.error('[GET /api/wardrobe/looks] rack read failed', error.code);
    return NextResponse.json({looks: [], error: 'unavailable', message: 'Your rack couldn’t load just now.'}, {status: 500, headers: NO_STORE});
  }
  return NextResponse.json({looks: data ?? []}, {headers: NO_STORE});
}

const lookBody = z.object({
  photo_url: z.string().trim().min(1, 'Add a photo of the look.').max(600),
  caption: z.string().trim().max(120).optional().nullable(),
  brands: z.array(z.string().trim().max(40)).max(8).optional(),
});

// POST /api/wardrobe/looks {photo_url, caption?, brands?} → 201 {look}
// Member safety (Apple 1.2 / Play UGC): house rules accepted (403 terms_required), the text filter on the
// caption and brands (422 content_rejected), and the photo must be the member's own upload to our storage
// (400 bad_photo). The insert runs as the member, so the database's own terms check applies too.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out', message: 'Sign in first. Nothing was posted.'}, {status: 401, headers: NO_STORE});

  const parsed = await parseBody(req, lookBody);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const gate = await postingGate(supabase, user.id);
  if (gate) return gate;
  const brands = (body.brands ?? []).filter(Boolean);
  const verdict = screenFields([body.caption, ...brands]);
  if (verdict.verdict === 'reject') return contentRejected(verdict);
  const photo = checkMediaUrls([body.photo_url], r2PublicBase(), user.id, 1);
  if (!photo.ok) return NextResponse.json({error: 'bad_photo', message: `${photo.message.replace(/ Nothing was posted\.$/, '')} Nothing was posted.`}, {status: 400, headers: NO_STORE});

  const {data, error} = await supabase
    .from('wardrobe_looks')
    .insert({user_id: user.id, photo_url: photo.urls[0], brands, caption: body.caption || null})
    .select()
    .single();
  if (error) {
    // The database's restrictive insert policy (house rules / suspension) — same answer as the gate.
    if (error.code === '42501') return NextResponse.json({error: 'terms_required', message: TERMS_REQUIRED_MESSAGE}, {status: 403, headers: NO_STORE});
    console.error('[POST /api/wardrobe/looks] insert failed', error.code);
    return NextResponse.json({error: 'unavailable', message: 'Something went wrong on the house side. Nothing was posted.'}, {status: 500, headers: NO_STORE});
  }
  return NextResponse.json({look: data}, {status: 201, headers: NO_STORE});
}
