import {NextResponse, type NextRequest} from 'next/server';
import {createClient as createAdmin} from '@supabase/supabase-js';

export const runtime = 'nodejs';

const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {auth: {persistSession: false}},
  );
}

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
  const {api_key, api_secret, user_id} = (await req.json()) as {
    api_key: string;
    api_secret: string;
    user_id?: string;
  };

  if (!api_key || !api_secret) {
    return NextResponse.json({error: 'api_key and api_secret required'}, {status: 400});
  }

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

  // Upsert into carpe_diem_profiles if user_id provided
  if (user_id) {
    await admin()
      .from('carpe_diem_profiles')
      .upsert(
        {
          user_id,
          alpaca_connected: true,
          alpaca_api_key: `${api_key.slice(0, 6)}...`, // store partial key only
          alpaca_portfolio_snapshot: snapshot,
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'user_id'},
      );
  }

  return NextResponse.json(snapshot);
}
