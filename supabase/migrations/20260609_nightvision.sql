-- NIGHTVISION: add nightvision_data column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nightvision_data JSONB;

-- Index for querying profiles with nightvision data
CREATE INDEX IF NOT EXISTS idx_profiles_nightvision ON profiles USING GIN (nightvision_data) WHERE nightvision_data IS NOT NULL;
