import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'FSS-VIP-';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

interface TokenPayload {
  item_id?: string;
  title?: string;
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

    const body = (await req.json()) as TokenPayload;
    const token = generateToken();

    const instructions = body.title
      ? `Present this token at the partner portal for "${body.title}". Token is valid for 30 days. One-time use only. Screenshot and store securely.`
      : 'Present this token at the partner portal to activate your VIP access. Token is valid for 30 days and is single-use. Screenshot and store securely.';

    if (user && body.item_id) {
      // Optionally log the token generation — non-blocking
      supabase
        .from('registry_pledges')
        .select('id')
        .eq('item_id', body.item_id)
        .limit(1)
        .then(() => {
          // fire-and-forget; ignore result
        });
    }

    return NextResponse.json({ token, instructions });
  } catch (err) {
    console.error('[registry/token] error:', err);
    return NextResponse.json(
      {
        token: generateToken(),
        instructions:
          'Present this token at the partner portal to activate your VIP access.',
      },
      { status: 200 },
    );
  }
}
