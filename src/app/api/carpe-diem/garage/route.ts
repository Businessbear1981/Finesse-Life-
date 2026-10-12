import {NextResponse, type NextRequest} from 'next/server';
import {createClient} from '@/lib/data/server';
import {FINESSE_API, SERVICE_ROLE, createClient as createAdmin} from '@/lib/data/compat';

export const runtime = 'nodejs';

function admin() {
  return createAdmin(
    FINESSE_API,
    SERVICE_ROLE,
    {auth: {persistSession: false}},
  );
}

export async function POST(req: NextRequest) {
  const dbc = await createClient();
  const {data: {user}} = await dbc.auth.getUser();

  const body = (await req.json()) as {
    car_make?: string | null;
    car_model?: string | null;
    car_year?: number | null;
    sneaker_size?: string | null;
    golf_handicap?: number | null;
  };

  // If user is authenticated, upsert into DB
  if (user) {
    const {error} = await admin()
      .from('carpe_diem_profiles')
      .upsert(
        {
          user_id: user.id,
          car_make: body.car_make,
          car_model: body.car_model,
          car_year: body.car_year,
          sneaker_size: body.sneaker_size,
          golf_handicap: body.golf_handicap,
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'user_id'},
      );

    if (error) {
      return NextResponse.json({error: error.message}, {status: 500});
    }
  }

  // Return ok even for unauthenticated (localStorage-only profile)
  return NextResponse.json({ok: true});
}
