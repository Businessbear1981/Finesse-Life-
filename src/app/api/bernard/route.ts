import {NextResponse} from 'next/server';

// POST /api/bernard — RETIRED (410 Gone).
// It relayed any prompt and client `system` string straight to the model, had no in-app caller,
// and returned a fabricated "Consider it handled" on failure. Use POST /api/nova with a `persona`
// instead (members only, rate limited, server-owned prompts).
export async function POST() {
  return NextResponse.json(
    {error: 'gone', message: '/api/bernard has been retired. Use POST /api/nova with a persona.'},
    {status: 410, headers: {'Cache-Control': 'no-store'}},
  );
}
