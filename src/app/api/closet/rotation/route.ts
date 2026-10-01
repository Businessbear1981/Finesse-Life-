import {NextRequest} from 'next/server';
import {z} from 'zod';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {emptyWeek, mondayOf, type RotationDay} from '@/lib/closet';

const q = z.object({week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()});

// GET /api/closet/rotation?week=YYYY-MM-DD — this week's rotation from OWNED looks only.
// If none is saved, a suggestion is drafted (not saved) by rotating the member's own looks.
export async function GET(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const p = q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  const week = mondayOf(p.success && p.data.week ? new Date(`${p.data.week}T12:00:00Z`) : new Date());

  const [{data: looks, error: lErr}, {data: hung}, {data: saved, error: rErr}, {data: missing, error: mErr}] = await Promise.all([
    ctx.supabase.from('wardrobe_looks').select('id, photo_url, caption, brands').eq('user_id', ctx.userId).order('created_at', {ascending: false}).limit(40),
    // Camera items hung in the Closet stay private; served through the owner-only image route.
    ctx.supabase.from('camera_items').select('id, label').eq('user_id', ctx.userId).eq('routed_to', 'closet').order('created_at', {ascending: false}).limit(40),
    ctx.supabase.from('closet_rotations').select('days, approved_at, updated_at').eq('user_id', ctx.userId).eq('week_start', week).maybeSingle(),
    ctx.supabase.from('closet_missing_pieces').select('id, description, route_to, created_at').eq('user_id', ctx.userId).order('created_at', {ascending: false}).limit(10),
  ]);
  const err = lErr ?? rErr ?? mErr;
  if (err) return dbFailure(err, ctx.traceId, 'closet');

  const owned = [
    ...((looks ?? []) as Record<string, unknown>[]).map((l) => ({id: l.id as string, photo_url: l.photo_url as string, caption: (l.caption as string | null) ?? null, source: 'wardrobe' as const})),
    ...((hung ?? []) as Record<string, unknown>[]).map((c) => ({id: c.id as string, photo_url: `/api/camera/items/${c.id}/image`, caption: (c.label as string | null) ?? null, source: 'camera' as const})),
  ];
  let days: RotationDay[] = (saved?.days as RotationDay[] | undefined) ?? emptyWeek();
  const drafted = !saved && owned.length > 0;
  if (drafted) days = emptyWeek().map((d, i) => ({...d, lookId: owned[i % owned.length].id}));

  return json({
    weekStart: week,
    status: saved?.approved_at ? 'approved' : drafted ? 'draft' : saved ? 'held' : 'empty',
    approvedAt: saved?.approved_at ?? null,
    days,
    looks: owned,
    missingPieces: missing ?? [],
  }, ctx.traceId);
}
