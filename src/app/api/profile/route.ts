import {NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

async function getServiceClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({name, value, options}) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component context — middleware handles session refresh
          }
        },
      },
    },
  );
}

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

export async function PATCH(request: Request) {
  try {
    // Verify the caller is authenticated using the anon client
    const cookieStore = await cookies();
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({name, value, options}) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

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

    // If any private fields are being written, verify the user is VIP
    const touchesPrivate =
      private_display_name !== undefined ||
      private_avatar_url !== undefined ||
      private_bio !== undefined ||
      private_vibe !== undefined ||
      private_photos !== undefined ||
      has_private_profile !== undefined;

    if (touchesPrivate) {
      const serviceClient = await getServiceClient();
      const {data: currentProfile} = await serviceClient
        .from('profiles')
        .select('is_vip, vip_expires_at')
        .eq('id', user.id)
        .single();

      const isVipActive =
        currentProfile?.is_vip === true &&
        (currentProfile.vip_expires_at === null ||
          new Date(currentProfile.vip_expires_at) > new Date());

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
    if (display_name !== undefined) update.display_name = display_name;
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

    const serviceClient = await getServiceClient();

    const {data: profile, error} = await serviceClient
      .from('profiles')
      .upsert({id: user.id, ...update}, {onConflict: 'id'})
      .select()
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
