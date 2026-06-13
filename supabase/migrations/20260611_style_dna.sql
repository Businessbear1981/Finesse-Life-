-- Add style_dna column to profiles (persists Nova's photo analysis result)
alter table public.profiles
  add column if not exists style_dna jsonb default null;

comment on column public.profiles.style_dna is
  'Nova style analysis: {style_archetype, style_labels[], similar_brands[], price_range, buying_tendencies[]}';
