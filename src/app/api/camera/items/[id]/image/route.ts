import {NextResponse} from 'next/server';
import {requireMember} from '@/lib/api/room';
import {presignGet} from '@/lib/r2';

// GET /api/camera/items/:id/image — owner-only, always-fresh view of a private photo.
// Stable URL for anything that needs to keep pointing at the image (Closet rail, exports);
// each request mints a 5-minute presigned link, so nothing long-lived ever exists.
export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const {data} = await ctx.supabase.from('camera_items').select('image_key').eq('id', id).eq('user_id', ctx.userId).maybeSingle();
  if (!data) return NextResponse.json({error: 'not_found', traceId: ctx.traceId}, {status: 404});
  try {
    const url = await presignGet(data.image_key, 300);
    return NextResponse.redirect(url, {status: 302, headers: {'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer'}});
  } catch {
    return NextResponse.json({error: 'storage_unavailable', traceId: ctx.traceId}, {status: 503});
  }
}
