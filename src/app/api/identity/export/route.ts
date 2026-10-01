import {NextResponse} from 'next/server';
import {requireMember} from '@/lib/api/room';

// GET /api/identity/export — download everything this room holds about the member.
// Reads run as the member (RLS), so only their own rows can appear.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const own = (table: string, col = 'user_id') => ctx.supabase.from(table).select('*').eq(col, ctx.userId);
  const tables: Record<string, PromiseLike<{data: unknown; error: {message: string} | null}>> = {
    profile: ctx.supabase.from('profiles').select('*').eq('id', ctx.userId),
    identity_projections: own('identity_projections'),
    diary_items: own('diary_items'),
    ballroom_evenings: own('ballroom_evenings'),
    camera_items: own('camera_items'),
    closet_rotations: own('closet_rotations'),
    closet_missing_pieces: own('closet_missing_pieces'),
    wardrobe_looks: own('wardrobe_looks'),
    registry_items: own('registry_items'),
  };
  const out: Record<string, unknown> = {exportedAt: new Date().toISOString(), traceId: ctx.traceId};
  for (const [k, p] of Object.entries(tables)) {
    const {data, error} = await p;
    out[k] = error ? {unavailable: error.message} : data;
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="finesse-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
