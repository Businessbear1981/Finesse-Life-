import {NextResponse, type NextRequest} from 'next/server';
import {createClient as createAdmin} from '@supabase/supabase-js';

export const runtime = 'nodejs';

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {auth: {persistSession: false}},
  );
}

// Yahoo Fantasy OAuth2 is phase 2.
// Phase 1: user provides league_id + team_id; we return a realistic demo payload.
// demo: true flag signals the UI to show "demo mode" messaging.

function buildDemoPayload(league_id: string, team_id: string) {
  const seed = parseInt(league_id.replace(/\D/g, '').slice(0, 6) || '1', 10);
  const wins = (seed % 8) + 3;
  const losses = 13 - wins;
  const pts = 1200 + (seed % 400);
  const rank = (seed % 10) + 1;

  return {
    demo: true,
    league_id,
    team_id,
    league_name: `Finesse Fantasy League ${league_id.slice(-4)}`,
    team_name: `Team ${team_id}`,
    rank,
    record: {wins, losses, ties: 0},
    points_for: pts,
    points_against: pts - 40 + (seed % 80),
    projected_points: 95 + (seed % 40),
    week_matchup: {
      week: 14,
      opponent: 'The Rivals',
      opponent_projected: 88 + (seed % 30),
      my_projected: 95 + (seed % 40),
      status: 'in_progress',
    },
    top_players: [
      {name: 'Patrick Mahomes', position: 'QB', projected_pts: 28.4},
      {name: 'CeeDee Lamb', position: 'WR', projected_pts: 18.2},
      {name: 'Christian McCaffrey', position: 'RB', projected_pts: 22.7},
      {name: 'Travis Kelce', position: 'TE', projected_pts: 14.1},
    ],
    waiver_budget_remaining: 50 + (seed % 50),
    trade_deadline_passed: false,
    fetched_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const {league_id, team_id, user_id} = (await req.json()) as {
    league_id: string;
    team_id: string;
    user_id?: string;
  };

  if (!league_id || !team_id) {
    return NextResponse.json({error: 'league_id and team_id required'}, {status: 400});
  }

  const payload = buildDemoPayload(league_id, team_id);

  // Upsert fantasy data into carpe_diem_profiles if user_id provided
  if (user_id) {
    await admin()
      .from('carpe_diem_profiles')
      .upsert(
        {
          user_id,
          fantasy_connected: true,
          fantasy_league_id: league_id,
          fantasy_team_id: team_id,
          fantasy_snapshot: payload,
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'user_id'},
      );
  }

  return NextResponse.json(payload);
}
