import {NextResponse, type NextRequest} from 'next/server';

// GET /api/account/export — alias. The data export lives at /api/identity/export
// (runs as the member, RLS-scoped); this only points account tooling at it.
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/identity/export', req.url), {status: 307, headers: {'Cache-Control': 'no-store'}});
}
