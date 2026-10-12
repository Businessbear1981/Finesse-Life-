import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

// Any client-sent user_id is ignored: the snapshot is saved for the signed-in member only.
const body = z.object({
  api_key: z.string().trim().min(1).max(128),
  api_secret: z.string().trim().min(1).max(256),
});

interface AlpacaAccount {
  equity: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  unrealized_pl: string;
}

interface AlpacaPosition {
  symbol: string;
  qty: string;
  market_value: string;
  unrealized_pl: string;
  current_price: string;
  change_today: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out'}, {status: 401});

  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const {api_key, api_secret} = parsed.data;

  const headers = {
    'APCA-API-KEY-ID': api_key,
    'APCA-API-SECRET-KEY': api_secret,
    'Accept': 'application/json',
  };

  // Fetch account
  const acctRes = await fetch(`${ALPACA_BASE}/account`, {headers, cache: 'no-store'});
  if (!acctRes.ok) {
    const txt = await acctRes.text();
    return NextResponse.json({error: `Alpaca auth failed: ${txt}`}, {status: 401});
  }
  const acct: AlpacaAccount = await acctRes.json();

  // Fetch positions
  const posRes = await fetch(`${ALPACA_BASE}/positions`, {headers, cache: 'no-store'});
  const positions: AlpacaPosition[] = posRes.ok ? await posRes.json() : [];

  // Top 5 by market value
  const top5 = [...positions]
    .sort((a, b) => parseFloat(b.market_value) - parseFloat(a.market_value))
    .slice(0, 5)
    .map((p) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      market_value: parseFloat(p.market_value),
      unrealized_pl: parseFloat(p.unrealized_pl),
      current_price: parseFloat(p.current_price),
      change_today_pct: parseFloat(p.change_today) * 100,
    }));

  const snapshot = {
    equity: parseFloat(acct.equity),
    cash: parseFloat(acct.cash),
    portfolio_value: parseFloat(acct.portfolio_value),
    buying_power: parseFloat(acct.buying_power),
    pnl_today: parseFloat(acct.unrealized_pl),
    top_positions: top5,
    fetched_at: new Date().toISOString(),
  };

  // Saved as the member (RLS owner_only / carpe_diem_own), never via the service role.
  const {error} = await supabase
    .from('carpe_diem_profiles')
    .upsert(
      {
        user_id: user.id,
        alpaca_connected: true,
        alpaca_api_key: `${api_key.slice(0, 6)}...`, // store partial key only
        alpaca_portfolio_snapshot: snapshot,
        updated_at: new Date().toISOString(),
      },
      {onConflict: 'user_id'},
    );
  if (error) console.warn('[alpaca] snapshot not saved', error.message);

  return NextResponse.json(snapshot);
}
