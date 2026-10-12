import {reply, sessionMember, unauthorized} from '../../billing/_member';
import {validLatLng} from '@/lib/live-map';

export const runtime = 'nodejs';

// POST /api/map/presence {lat, lng} → share/refresh my (coarse, anonymous) dot.
// The database snaps the fix to a ~200 m cell and never stores the raw coordinates.
export async function POST(req: Request) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const body = await req.json().catch(() => null);
  const at = validLatLng(body?.lat, body?.lng);
  if (!at) return reply({error: 'bad_location'}, 400);
  const {error} = await member.supabase.rpc('map_ping', {p_lat: at.lat, p_lng: at.lng});
  if (error) {
    console.error('[map] ping failed', error.message);
    return reply({error: 'map_unavailable'}, 502);
  }
  return reply({sharing: true});
}

// DELETE /api/map/presence → ghost mode: remove my dot now.
export async function DELETE() {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const {error} = await member.supabase.rpc('map_ghost');
  if (error) {
    console.error('[map] ghost failed', error.message);
    return reply({error: 'map_unavailable'}, 502);
  }
  return reply({sharing: false});
}
