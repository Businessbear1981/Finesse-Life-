CREATE TABLE IF NOT EXISTS carpe_diem_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  alpaca_connected BOOLEAN DEFAULT false,
  alpaca_api_key TEXT, -- partial key stored for display only; secret never persisted
  alpaca_portfolio_snapshot JSONB,
  fantasy_connected BOOLEAN DEFAULT false,
  fantasy_league_id TEXT,
  fantasy_team_id TEXT,
  fantasy_snapshot JSONB,
  golf_handicap NUMERIC,
  car_make TEXT,
  car_model TEXT,
  car_year INTEGER,
  sneaker_size TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE carpe_diem_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON carpe_diem_profiles
  FOR ALL USING (auth.uid() = user_id);
