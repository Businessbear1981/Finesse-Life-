import {reply, sessionMember, unauthorized} from '../../billing/_member';
import {isAdmin} from '@/lib/admin';
import {parseNewEvent} from '@/lib/live-map';
import {createServiceClient} from '@/lib/supabase/service';

export const runtime = 'nodejs';

// POST /api/map/events {title, venue?, lat, lng, startsAt, endsAt} → staff put an event on the map.
// Members can't write map_events (RLS); staff writes go through the service role here.
export async function POST(req: Request) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const {data: {user}} = await member.supabase.auth.getUser();
  if (!(await isAdmin(member.supabase, user))) return reply({error: 'forbidden'}, 403);

  const parsed = parseNewEvent(await req.json().catch(() => null));
  if ('error' in parsed) return reply({error: parsed.error}, 400);

  const {data, error} = await createServiceClient().from('map_events').insert({
    title: parsed.title, venue: parsed.venue, lat: parsed.lat, lng: parsed.lng,
    starts_at: parsed.startsAt, ends_at: parsed.endsAt, created_by: member.userId,
  }).select('id').single();
  if (error) {
    console.error('[map] event insert failed', error.message);
    return reply({error: 'map_unavailable'}, 502);
  }
  return reply({id: data.id}, 201);
}
