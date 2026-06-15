-- =============================================================================
-- Scale Deals — Luxury Seed Data
-- Adds 4 real luxury brand group buys to the scale_deals table
-- =============================================================================

insert into public.scale_deals (title, brand, description, image_url, original_price_cents, group_price_cents, goal_count, current_count, category, deadline, status)
values
  (
    'Gilda Platform Mule — Embellished',
    'Amina Muaddi',
    'The silhouette that launched a thousand weddings. Hand-embellished crystal strap. Group unlocks direct pricing at 20 members.',
    null,
    79500,
    54000,
    20,
    14,
    'Shoes',
    now() + interval '18 hours',
    'open'
  ),
  (
    'Double Washed Fleece Hoodie',
    'Fear of God',
    'Lorenzo''s heavyweight fleece in fog and sand. Factory washed for that broken-in weight. Group at 12.',
    null,
    62500,
    41000,
    12,
    9,
    'Clothes',
    now() + interval '3 days',
    'open'
  ),
  (
    'Classic Cross Ring — Sterling',
    'Chrome Hearts',
    'The OG CH cross ring. Sterling silver. Waitlist 6 months retail. Group buy skips the line at 8.',
    null,
    95000,
    68000,
    8,
    3,
    'Jewelry',
    now() + interval '5 days',
    'open'
  ),
  (
    'Le City Bag — Aged Calfskin',
    'Balenciaga',
    'The original downtown luxury bag. Aged calfskin, antique brass hardware. Group price at 15 members.',
    null,
    189500,
    132000,
    15,
    6,
    'Bags',
    now() + interval '7 days',
    'open'
  )
on conflict do nothing;
