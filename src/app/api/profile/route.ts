import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';
import {screenFields} from '@/lib/moderation';
import {contentRejected} from '@/lib/moderation-server';

function isR2Url(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizePhotos(arr: unknown): string[] | null {
  if (!Array.isArray(arr)) return null;
  const cleaned = arr
    .filter((u) => isR2Url(u))
    .slice(0, 6) as string[];
  return cleaned.length > 0 ? cleaned : null;
}

export async function GET() {
  try {
    const anonClient = await createClient();

    const {
      data: {user},
    } = await anonClient.auth.getUser();

    if (!user) {
      return NextResponse.json({profile: null});
    }

    // Own row via the SECURITY DEFINER helper — gender/is_vip/vip_expires_at are no longer
    // SELECT-granted to the member role (20261020_s4).
    const {data: rows, error} = await anonClient.rpc('get_own_profile');
    const row = (rows?.[0] ?? null) as {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      gender: string | null;
      is_vip: boolean | null;
      vip_expires_at: string | null;
    } | null;

    if (error || !row) {
      if (error) console.error('[GET /api/profile]', error);
      return NextResponse.json({profile: null});
    }

    return NextResponse.json({
      profile: {
        id: row.id,
        display_name: row.display_name,
        username: row.username,
        avatar_url: row.avatar_url,
        gender: row.gender,
        is_vip: row.is_vip,
        vip_expires_at: row.vip_expires_at,
      },
    });
  } catch (e) {
    console.error('[GET /api/profile] unexpected', e);
    return NextResponse.json({profile: null});
  }
}

export async function PATCH(request: Request) {
  try {
    // Verify the caller is authenticated using the anon client
    const anonClient = await createClient();

    const {
      data: {user},
    } = await anonClient.auth.getUser();

    if (!user) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const body = await request.json();
    const {
      display_name,
      gender,
      age,
      city,
      vibe,
      bio,
      intake_complete,
      telegram_handle,
      avatar_url,
      // public profile extras
      public_photos,
      public_links,
      // private / VIP profile
      private_display_name,
      private_avatar_url,
      private_bio,
      private_vibe,
      private_photos,
      has_private_profile,
    } = body as {
      display_name?: string;
      gender?: string;
      age?: number | null;
      city?: string;
      vibe?: string;
      bio?: string | null;
      intake_complete?: boolean;
      telegram_handle?: string | null;
      avatar_url?: string | null;
      public_photos?: unknown;
      public_links?: Record<string, string> | null;
      private_display_name?: string | null;
      private_avatar_url?: string | null;
      private_bio?: string | null;
      private_vibe?: string | null;
      private_photos?: unknown;
      has_private_profile?: boolean;
    };

    // Member safety (Apple 1.2 / Play UGC): the name, bio, vibe and city other members see in the Lounge (and
    // the VIP-floor versions) go through the same text filter as posts. 422 content_rejected; nothing is saved.
    const asText = (v: unknown) => (typeof v === 'string' ? v : null);
    const verdict = screenFields(
      [display_name, bio, vibe, city, private_display_name, private_bio, private_vibe].map(asText),
    );
    if (verdict.verdict === 'reject') {
      return contentRejected({...verdict, message: verdict.message.replace('Nothing was posted.', 'Your profile wasn’t changed.')});
    }

    // If any private fields are being written, verify the user is VIP
    const touchesPrivate =
      private_display_name !== undefined ||
      private_avatar_url !== undefined ||
      private_bio !== undefined ||
      private_vibe !== undefined ||
      private_photos !== undefined ||
      has_private_profile !== undefined;

    if (touchesPrivate) {
      // is_vip / vip_expires_at are no longer SELECT-granted (20261020_s4); ask the helper.
      const {data: isVipActive} = await anonClient.rpc('current_member_is_vip');

      if (!isVipActive) {
        return NextResponse.json(
          {error: 'VIP membership required to update private profile.'},
          {status: 403},
        );
      }
    }

    // Build the update payload — only include defined fields
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Public fields
    if (display_name !== undefined) update.display_name = typeof display_name === 'string' ? display_name.slice(0, 60) : display_name;
    if (gender !== undefined) update.gender = gender;
    if (age !== undefined) update.age = age;
    if (city !== undefined) update.city = city;
    if (vibe !== undefined) update.vibe = vibe;
    if (bio !== undefined) update.bio = bio !== null ? String(bio).slice(0, 200) : null;
    if (intake_complete !== undefined) update.intake_complete = intake_complete;
    if (telegram_handle !== undefined)
      update.telegram_handle =
        telegram_handle ? String(telegram_handle).replace(/^@/, '').slice(0, 32) : null;
    if (avatar_url !== undefined) update.avatar_url = avatar_url;
    if (public_photos !== undefined) update.public_photos = sanitizePhotos(public_photos);
    if (public_links !== undefined)
      update.public_links =
        public_links && typeof public_links === 'object' ? public_links : null;

    // Private / VIP fields
    if (private_display_name !== undefined)
      update.private_display_name = private_display_name
        ? String(private_display_name).slice(0, 60)
        : null;
    if (private_avatar_url !== undefined) update.private_avatar_url = private_avatar_url;
    if (private_bio !== undefined)
      update.private_bio = private_bio ? String(private_bio).slice(0, 400) : null;
    if (private_vibe !== undefined) update.private_vibe = private_vibe;
    if (private_photos !== undefined) update.private_photos = sanitizePhotos(private_photos);
    if (has_private_profile !== undefined)
      update.has_private_profile = Boolean(has_private_profile);

    // Private/VIP columns are not SELECT-granted to members (20261020_s4), so the write + read-back
    // go through the service-role client (identity is the verified auth.uid above).
    const {data: profile, error} = await createServiceClient()
      .from('profiles')
      .upsert({id: user.id, ...update}, {onConflict: 'id'})
      .select('id, display_name, username, avatar_url, gender, is_vip, vip_expires_at')
      .single();

    if (error) {
      console.error('[PATCH /api/profile]', error);
      return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({profile});
  } catch (e) {
    console.error('[PATCH /api/profile] unexpected', e);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
