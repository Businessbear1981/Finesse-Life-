import type {NextRequest} from 'next/server';
import {reply, sessionMember, unauthorized} from '../../billing/_member';
import {parseBbox, toDot, type MapDot, type MapEvent} from '@/lib/live-map';

export const runtime = 'nodejs';

// GET /api/map/snapshot?bbox=minLng,minLat,maxLng,maxLat → {dots, events, sharing}
// Dots are anonymous (position + colour only) — see supabase/migrations/20261014_live_map.sql.
export async function GET(req: NextRequest) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const bbox = parseBbox(req.nextUrl.searchParams.get('bbox'));
  if (!bbox) return reply({error: 'bad_bbox'}, 400);

  const [dotsRes, eventsRes, sharingRes] = await Promise.all([
    member.supabase.rpc('map_snapshot', {
      p_min_lat: bbox.minLat, p_min_lng: bbox.minLng, p_max_lat: bbox.maxLat, p_max_lng: bbox.maxLng,
    }),
    member.supabase.from('map_events')
      .select('id, title, venue, lat, lng, starts_at, ends_at')
      .gte('lat', bbox.minLat).lte('lat', bbox.maxLat)
      .gte('lng', bbox.minLng).lte('lng', bbox.maxLng)
      .lte('starts_at', new Date(Date.now() + 24 * 3600 * 1000).toISOString())
      .order('starts_at').limit(200),
    member.supabase.rpc('map_sharing'),
  ]);
  if (dotsRes.error || eventsRes.error) {
    console.error('[map] snapshot failed', dotsRes.error?.message ?? eventsRes.error?.message);
    return reply({error: 'map_unavailable'}, 502);
  }
  const dots = ((dotsRes.data ?? []) as {lat: unknown; lng: unknown; kind: unknown}[])
    .map(toDot).filter((d): d is MapDot => d !== null);
  type EventRow = {id: string; title: string; venue: string | null; lat: number; lng: number; starts_at: string; ends_at: string};
  const events: MapEvent[] = ((eventsRes.data ?? []) as EventRow[]).map((e) => ({
    id: e.id, title: e.title, venue: e.venue, lat: e.lat, lng: e.lng, startsAt: e.starts_at, endsAt: e.ends_at,
  }));
  return reply({dots, events, sharing: sharingRes.data === true});
}
