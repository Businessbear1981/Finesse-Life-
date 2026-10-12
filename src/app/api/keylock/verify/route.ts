import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/data/server';

// Verify a KeyLock session before serving any backstage content.
// Called by backstage API routes as a gate check.

export async function POST(req: NextRequest) {
  const {session_key} = await req.json() as {session_key?: string};
  if (!session_key) return NextResponse.json({valid: false}, {status: 401});

  const dbc = await createClient();
  const {data: {user}} = await dbc.auth.getUser();
  if (!user) return NextResponse.json({valid: false}, {status: 401});

  const {data: session} = await dbc
    .from('backstage_sessions')
    .select('user_id, expires_at')
    .eq('session_key', session_key)
    .eq('user_id', user.id)
    .single();

  if (!session) return NextResponse.json({valid: false}, {status: 401});
  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({valid: false, reason: 'expired'}, {status: 401});
  }

  return NextResponse.json({valid: true});
}
