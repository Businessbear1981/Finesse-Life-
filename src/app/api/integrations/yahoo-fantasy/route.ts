import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Any client-sent user_id is ignored: data is saved for the signed-in member only.
const body = z.object({
  league_id: z.string().trim().min(1).max(64),
  team_id: z.string().trim().min(1).max(64),
});

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
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out'}, {status: 401});

  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const {league_id, team_id} = parsed.data;

  const payload = buildDemoPayload(league_id, team_id);

  // Saved as the member (RLS owner_only / carpe_diem_own), never via the service role.
  const {error} = await supabase
    .from('carpe_diem_profiles')
    .upsert(
      {
        user_id: user.id,
        fantasy_connected: true,
        fantasy_league_id: league_id,
        fantasy_team_id: team_id,
        fantasy_snapshot: payload,
        updated_at: new Date().toISOString(),
      },
      {onConflict: 'user_id'},
    );
  if (error) console.warn('[yahoo-fantasy] snapshot not saved', error.message);

  return NextResponse.json(payload);
}
