-- ============================================================
-- VIP Exclusives — big-ticket board items
-- ============================================================

-- Add partner column to outings if not already present
ALTER TABLE outings ADD COLUMN IF NOT EXISTS partner TEXT;

-- VIP Exclusives table
CREATE TABLE IF NOT EXISTS vip_exclusives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  brand           TEXT NOT NULL,
  price_cents     BIGINT NOT NULL DEFAULT 0,
  pledged_cents   BIGINT NOT NULL DEFAULT 0,
  category        TEXT NOT NULL DEFAULT 'Experience',
  description     TEXT,
  partner_logo    TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vip_exclusives ENABLE ROW LEVEL SECURITY;

-- VIP members (is_vip = true) can read; service role manages writes
CREATE POLICY "vip_exclusives_vip_read"
  ON vip_exclusives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_vip = true
        AND (p.vip_expires_at IS NULL OR p.vip_expires_at > now())
    )
  );

-- Seed 3 luxury exclusives
INSERT INTO vip_exclusives (title, brand, price_cents, pledged_cents, category, description, partner_logo, sort_order) VALUES
  (
    'Genesis GV80 Prestige',
    'Carvana',
    6499900,
    0,
    'Automotive',
    'White on cognac leather. 2025 model. 14-day return window.',
    'CARVANA',
    1
  ),
  (
    'Private Studio Package',
    'Electric Lady Studios',
    450000,
    0,
    'Experience',
    '8 hours. Engineer included. Mixing session after.',
    'ELS',
    2
  ),
  (
    'Santorini Cave Suite — 7 nights',
    'Andronis Luxury Suites',
    1250000,
    0,
    'Travel',
    'Cliffside. Caldera view. Butler service. Private plunge pool.',
    'ANDRONIS',
    3
  )
ON CONFLICT DO NOTHING;
