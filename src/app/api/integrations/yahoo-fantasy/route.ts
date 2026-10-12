import {NextResponse, type NextRequest} from 'next/server';
import {guardExpensive} from '@/lib/api-guard';
import {createServiceClient} from '@/lib/data/service';
import {fetchTeamSnapshot, openTokens, refresh, sealTokens, yahooConfigured} from '@/lib/integrations/yahoo';

export const runtime = 'nodejs';

// Real Yahoo Fantasy snapshot for the signed-in member (no demo data). Not connected → 409 with connect URL.
export async function POST(req: NextRequest) {
  const me = await guardExpensive('yahoo-fantasy', 10);
  if (me instanceof NextResponse) return me;
  if (!yahooConfigured()) return NextResponse.json({error: 'Yahoo Fantasy is not configured'}, {status: 503});
  const {league_id, team_id} = (await req.json().catch(() => ({}))) as {league_id?: string; team_id?: string};
  if (!league_id || !team_id) return NextResponse.json({error: 'league_id and team_id required'}, {status: 400});

  const svc = createServiceClient();
  const {data: conn} = await svc.from('social_connections').select('access_token_enc').eq('user_id', me.id).eq('provider', 'yahoo').maybeSingle();
  if (!conn?.access_token_enc) return NextResponse.json({error: 'not connected', connect_url: '/api/integrations/yahoo-fantasy/connect'}, {status: 409});

  let tokens = openTokens(conn.access_token_enc);
  if (Date.now() >= tokens.expires_at) {
    tokens = await refresh(tokens);
    await svc.from('social_connections').update({access_token_enc: sealTokens(tokens), updated_at: new Date().toISOString()}).eq('user_id', me.id).eq('provider', 'yahoo');
  }
  let payload;
  try {
    payload = await fetchTeamSnapshot(tokens, String(league_id), String(team_id));
  } catch (e) {
    return NextResponse.json({error: e instanceof Error ? e.message : 'yahoo error'}, {status: 502});
  }
  await svc.from('carpe_diem_profiles').upsert({
    user_id: me.id, fantasy_connected: true, fantasy_league_id: league_id, fantasy_team_id: team_id, fantasy_snapshot: payload, updated_at: new Date().toISOString(),
  }, {onConflict: 'user_id'});
  return NextResponse.json(payload);
}
