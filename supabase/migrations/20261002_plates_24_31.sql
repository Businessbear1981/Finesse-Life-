-- Finesse — wiring for cinematic plates 24–31 (Ballroom, Jazz Club, This Is You,
-- Closet, Diary, Camera). Member-owned rows; RLS = owner only (jazz programme is
-- member-readable). States are explicit so a proposal, hold and confirmation can
-- never collapse into one.
-- Apply: SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261002_plates_24_31.sql

-- ── The Diary ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diary_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  starts_at    TIMESTAMPTZ NOT NULL,
  source_room  TEXT NOT NULL DEFAULT 'diary',
  source_id    UUID,
  state        TEXT NOT NULL DEFAULT 'needs_member_action'
               CHECK (state IN ('needs_member_action','held','moved','approved','done','cancelled')),
  notes        TEXT CHECK (char_length(notes) <= 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diary_items_user_day ON public.diary_items(user_id, starts_at);
ALTER TABLE public.diary_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diary_items_owner ON public.diary_items;
CREATE POLICY diary_items_owner ON public.diary_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── The Ballroom ─────────────────────────────────────────────────────────
-- proposal → hold_requested (member asked; NOT a partner hold) → held (partner
-- evidence attached server-side) → confirmed. Cancelled is terminal.
CREATE TABLE IF NOT EXISTS public.ballroom_evenings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  occasion      TEXT CHECK (char_length(occasion) <= 120),
  starts_at     TIMESTAMPTZ NOT NULL,
  party_size    INT NOT NULL DEFAULT 2 CHECK (party_size BETWEEN 1 AND 40),
  track         TEXT CHECK (track IN ('finesse','carpe_diem')),
  components    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{kind, label, partner|null, state}]
  state         TEXT NOT NULL DEFAULT 'proposal'
                CHECK (state IN ('proposal','hold_requested','held','confirmed','cancelled')),
  partner_ref   TEXT,                                -- set only by a partner adapter / staff
  trace_id      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT held_needs_partner CHECK (state NOT IN ('held','confirmed') OR partner_ref IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ballroom_user ON public.ballroom_evenings(user_id, starts_at DESC);
ALTER TABLE public.ballroom_evenings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ballroom_owner_read ON public.ballroom_evenings;
CREATE POLICY ballroom_owner_read ON public.ballroom_evenings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS ballroom_owner_insert ON public.ballroom_evenings;
CREATE POLICY ballroom_owner_insert ON public.ballroom_evenings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND state = 'proposal' AND partner_ref IS NULL);
DROP POLICY IF EXISTS ballroom_owner_update ON public.ballroom_evenings;
-- Members may only move proposal→hold_requested or cancel; held/confirmed need the service role.
CREATE POLICY ballroom_owner_update ON public.ballroom_evenings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND state IN ('proposal','hold_requested','cancelled') AND partner_ref IS NULL);

-- ── The Camera ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.camera_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_key    TEXT NOT NULL,                        -- private R2 key; served only via short-lived presigned URLs
  consent_at   TIMESTAMPTZ NOT NULL,                 -- explicit member consent to store + analyse
  label        TEXT,
  category     TEXT,
  brand_guess  TEXT,
  confidence   NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  model        TEXT,                                 -- provenance: which model produced the label
  state        TEXT NOT NULL DEFAULT 'uploaded'
               CHECK (state IN ('uploaded','identified','unidentified','catalogued','routed')),
  routed_to    TEXT CHECK (routed_to IN ('closet','bag','exchange','scale','embassy')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_camera_items_user ON public.camera_items(user_id, created_at DESC);
ALTER TABLE public.camera_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS camera_items_owner ON public.camera_items;
CREATE POLICY camera_items_owner ON public.camera_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── The Closet ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.closet_rotations (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  days         JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{day:0-6, lookId|null, itemIds:[]}]
  approved_at  TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
ALTER TABLE public.closet_rotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS closet_rotations_owner ON public.closet_rotations;
CREATE POLICY closet_rotations_owner ON public.closet_rotations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.closet_missing_pieces (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  TEXT NOT NULL CHECK (char_length(description) BETWEEN 2 AND 300),
  route_to     TEXT CHECK (route_to IN ('stylist','bag','exchange')),  -- null = just noted
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.closet_missing_pieces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS closet_missing_owner ON public.closet_missing_pieces;
CREATE POLICY closet_missing_owner ON public.closet_missing_pieces FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── This Is You (projections / visibility) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.identity_projections (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_fields  TEXT[] NOT NULL DEFAULT ARRAY['display_name','avatar_url','vibe']::TEXT[],
  visibility     JSONB  NOT NULL DEFAULT '{"lounge":"members","profile_traffic":"self","backstage":"vip_grant_only"}'::jsonb,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.identity_projections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS identity_projections_owner ON public.identity_projections;
CREATE POLICY identity_projections_owner ON public.identity_projections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Jazz Club programme (staff-written, member-readable) ─────────────────
CREATE TABLE IF NOT EXISTS public.jazz_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  performers      TEXT[] NOT NULL DEFAULT '{}',
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  state           TEXT NOT NULL DEFAULT 'scheduled' CHECK (state IN ('scheduled','live','ended','cancelled')),
  stream_room     TEXT,          -- provider room id (LiveKit etc.) — set only when a provider is live
  replay_url      TEXT,
  replay_until    TIMESTAMPTZ,
  licensing_note  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jazz_sessions_start ON public.jazz_sessions(starts_at);
ALTER TABLE public.jazz_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jazz_sessions_member_read ON public.jazz_sessions;
CREATE POLICY jazz_sessions_member_read ON public.jazz_sessions FOR SELECT USING (auth.role() = 'authenticated');
