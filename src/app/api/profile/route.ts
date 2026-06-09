import {NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

async function getServiceClient() {
  const cookieStore = await cookies();

  // Use service role key so we can write to profiles without RLS blocking
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
    };

    // Build the update payload — only include defined fields
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
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

    const serviceClient = await getServiceClient();

    // Upsert so new accounts (where profile row may not exist yet) work correctly
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
