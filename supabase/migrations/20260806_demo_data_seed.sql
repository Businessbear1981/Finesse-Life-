-- =============================================================================
-- Rich demo data — every module, tied to the existing demo@finesselife.vip
-- account (src/app/(auth)/demo/page.tsx, access codes FINESSE2026/INVESTOR/
-- ARDENEDGE/PREVIEW). Requires that auth user to already exist — this migration
-- resolves it by email and no-ops on any table where it isn't found.
-- Fully idempotent: uses on conflict do nothing / not-exists guards so it's
-- safe to re-run.
-- =============================================================================

do $$
declare
  demo_id uuid;
begin
  select id into demo_id from auth.users where email = 'demo@finesselife.vip' limit 1;

  if demo_id is null then
    raise notice 'demo@finesselife.vip not found in auth.users — skipping demo data seed. Create the account first (see src/app/(auth)/demo/page.tsx), then re-run this migration.';
    return;
  end if;

  -- ── Profile polish ──────────────────────────────────────────────────────
  update public.profiles
  set
    display_name = coalesce(display_name, 'Sasha Voss'),
    bio = coalesce(bio, 'Editorial by day, Cortez lobby by night. Building a wardrobe that works as hard as I do.'),
    city = coalesce(city, 'New York'),
    vibe = coalesce(vibe, 'luxury'),
    is_vip = true,
    intake_complete = true,
    onboarding_done = true,
    nightvision_data = jsonb_build_object(
      'answers', jsonb_build_object(
        'movement', 'Luxury/Editorial',
        'spending', jsonb_build_array('Bags', 'Shoes', 'Fragrance'),
        'age', '25–34',
        'fragrance', 'Woody/Musky',
        'pricepoint', '$500–1k',
        'cities', jsonb_build_array('NYC', 'Paris', 'Milan')
      ),
      'style_dna', 'You gravitate toward quiet luxury with an editorial edge — clean silhouettes, investment leather, and a fragrance wardrobe that shifts with the season. You buy fewer pieces at a higher price point, and you know the difference between a trend and a signature.',
      'brand_radar', jsonb_build_array('Bottega Veneta', 'The Row', 'Toteme', 'Khaite', 'Loro Piana', 'Jacquemus', 'Staud', 'Amina Muaddi', 'Officine Générale', 'A.P.C.'),
      'style_tags', jsonb_build_array('Quiet Luxury', 'Editorial', 'Investment Pieces', 'Woody Fragrance', 'NYC Minimal'),
      'photos', '[]'::jsonb,
      'generated_at', (now() - interval '2 days')::text
    ),
    updated_at = now()
  where id = demo_id;

  -- ── Vault: account + a real transaction history ─────────────────────────
  insert into public.vault_accounts (user_id, balance_cents, cashback_earned_cents)
  values (demo_id, 18420, 18420)
  on conflict (user_id) do update set balance_cents = excluded.balance_cents, cashback_earned_cents = excluded.cashback_earned_cents;

  insert into public.vault_transactions (user_id, merchant, amount_cents, cashback_cents, category, direction, status, created_at)
  select demo_id, m.merchant, m.amount_cents, m.cashback_cents, m.category, m.direction, 'settled', now() - m.age
  from (values
    ('Bottega Veneta — Cassette Bag',   -285000, 0,    'Bags',       'debit',  interval '2 days'),
    ('1% back — Bottega Veneta',           2850, 0,    'cashback',   'credit', interval '2 days'),
    ('The Row — Margaux Tote',          -395000, 0,    'Bags',       'debit',  interval '6 days'),
    ('1% back — The Row',                  3950, 0,    'cashback',   'credit', interval '6 days'),
    ('Loro Piana — Cashmere Scarf',      -89000, 0,    'Accessories','debit',  interval '9 days'),
    ('1% back — Loro Piana',                890, 0,    'cashback',   'credit', interval '9 days'),
    ('Le Labo — Santal 33',              -18000, 0,    'Fragrance',  'debit',  interval '14 days'),
    ('1% back — Le Labo',                   180, 0,    'cashback',   'credit', interval '14 days')
  ) as m(merchant, amount_cents, cashback_cents, category, direction, age)
  where not exists (
    select 1 from public.vault_transactions vt
    where vt.user_id = demo_id and vt.merchant = m.merchant
  );

  -- ── Registry: gift registry with real pledges ───────────────────────────
  insert into public.registry_items (user_id, name, description, price_cents, category, brand, occasion, source, pledged_cents, purchased)
  select demo_id, r.name, r.description, r.price_cents, r.category, r.brand, r.occasion, 'upload', r.pledged_cents, false
  from (values
    ('Cassette Crossbody', 'The one I keep going back to — intrecciato leather, gold hardware.', 285000, 'Bags', 'Bottega Veneta', 'Birthday', 90000),
    ('Margaux 15 Tote', 'For the office. Structured, quiet, exactly right.', 395000, 'Bags', 'The Row', 'Anniversary', 120000),
    ('Gilda Platform Mule', 'Crystal strap, the wedding-season staple.', 79500, 'Shoes', 'Amina Muaddi', 'Just Because', 30000)
  ) as r(name, description, price_cents, category, brand, occasion, pledged_cents)
  where not exists (
    select 1 from public.registry_items ri where ri.user_id = demo_id and ri.name = r.name
  );

  -- ── Bag: luxury collection tracker ───────────────────────────────────────
  insert into public.bag_items (user_id, edition, name, brand, category, value_est_cents, color, acquired_year, note)
  select demo_id, 'finesse', b.name, b.brand, b.category, b.value_est_cents, b.color, b.acquired_year, b.note
  from (values
    ('Cassette Bag', 'Bottega Veneta', 'bag', 285000, 'Fondant', '2025', 'My first Bottega. Never selling.'),
    ('So Kate 120mm', 'Christian Louboutin', 'shoes', 89500, 'Nude Patent', '2025', 'The ones.'),
    ('Serpenti Viper Ring', 'Bulgari', 'jewelry', 420000, 'Rose Gold', '2024', 'Grail unlocked.')
  ) as b(name, brand, category, value_est_cents, color, acquired_year, note)
  where not exists (
    select 1 from public.bag_items bi where bi.user_id = demo_id and bi.name = b.name
  );

  -- ── Exchange: resale listings ────────────────────────────────────────────
  insert into public.exchange_listings (seller_id, title, description, brand, size, condition, asking_price_cents, category, status)
  select demo_id, e.title, e.description, e.brand, e.size, e.condition, e.asking_price_cents, e.category, 'active'
  from (values
    ('Jacquemus Le Chiquito', 'Worn twice. Comes with dust bag and authenticity card.', 'Jacquemus', 'Mini', 'excellent', 89000, 'Bags'),
    ('Khaite Danielle Jeans', 'Never worn, tags still on. Sizing didn''t work out.', 'Khaite', '27', 'new', 42000, 'Clothes')
  ) as e(title, description, brand, size, condition, asking_price_cents, category)
  where not exists (
    select 1 from public.exchange_listings el where el.seller_id = demo_id and el.title = e.title
  );
end $$;

-- ── Embassy: a few staff-approved live deals (no user tie needed) ─────────
insert into public.embassy_deals (brand, item, source, retail_price_cents, members_price_cents, category, tier, status)
select v.brand, v.item, v.source, v.retail_price_cents, v.members_price_cents, v.category, v.tier, 'live'
from (values
  ('Toteme', 'Signature Scarf', 'Direct partnership', 39000, 27300, 'Accessories', 'premium'),
  ('Staud', 'Shirley Bag', 'Direct partnership', 32500, 22750, 'Bags', 'contemporary'),
  ('Officine Générale', 'Wool Overshirt', 'Direct partnership', 45000, 31500, 'Clothes', 'contemporary')
) as v(brand, item, source, retail_price_cents, members_price_cents, category, tier)
where not exists (
  select 1 from public.embassy_deals ed where ed.brand = v.brand and ed.item = v.item
);
