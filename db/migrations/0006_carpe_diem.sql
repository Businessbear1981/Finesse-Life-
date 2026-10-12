-- Ported from supabase/migrations/20260610_carpe_diem.sql by scripts/port-supabase-migrations.mjs
CREATE TABLE IF NOT EXISTS carpe_diem_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app.users(id) ON DELETE CASCADE UNIQUE,
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
alter table carpe_diem_profiles add column if not exists id UUID  DEFAULT gen_random_uuid();
alter table carpe_diem_profiles add column if not exists user_id UUID REFERENCES app.users(id) ON DELETE CASCADE ;
alter table carpe_diem_profiles add column if not exists alpaca_connected BOOLEAN DEFAULT false;
alter table carpe_diem_profiles add column if not exists alpaca_api_key TEXT;
alter table carpe_diem_profiles add column if not exists alpaca_portfolio_snapshot JSONB;
alter table carpe_diem_profiles add column if not exists fantasy_connected BOOLEAN DEFAULT false;
alter table carpe_diem_profiles add column if not exists fantasy_league_id TEXT;
alter table carpe_diem_profiles add column if not exists fantasy_team_id TEXT;
alter table carpe_diem_profiles add column if not exists fantasy_snapshot JSONB;
alter table carpe_diem_profiles add column if not exists golf_handicap NUMERIC;
alter table carpe_diem_profiles add column if not exists car_make TEXT;
alter table carpe_diem_profiles add column if not exists car_model TEXT;
alter table carpe_diem_profiles add column if not exists car_year INTEGER;
alter table carpe_diem_profiles add column if not exists sneaker_size TEXT;
alter table carpe_diem_profiles add column if not exists created_at TIMESTAMPTZ DEFAULT now();
alter table carpe_diem_profiles add column if not exists updated_at TIMESTAMPTZ DEFAULT now();


ALTER TABLE carpe_diem_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON carpe_diem_profiles
  FOR ALL USING (app.uid() = user_id);
