-- ============================================================
-- 0031 · Room content out of the code.
--   room_catalog      editorial content per room (partners, classes, recipes, picks…), editable without a deploy
--   room_member_items the member's own room data (reservations, appointments, orders, schedule…), owner RLS
-- Seed = the editorial content that used to be hardcoded in src/app/(hotel)/*/page.tsx. Member data and
-- live numbers (market brief) are NOT seeded: real members start empty instead of seeing invented rows.
-- ============================================================
create table if not exists public.room_catalog (
  id        uuid primary key default gen_random_uuid(),
  room      text not null,
  kind      text not null,
  edition   text not null default 'both' check (edition in ('finesse','carpe_diem','both')),
  position  int  not null default 0,
  data      jsonb not null,
  active    boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists room_catalog_room_idx on public.room_catalog (room, kind, position) where active;
alter table public.room_catalog enable row level security;
drop policy if exists room_catalog_read on public.room_catalog;
create policy room_catalog_read on public.room_catalog for select to app_user using (active);
grant select on public.room_catalog to app_user;
grant all on public.room_catalog to app_service;
select app.apply_service_policy('public.room_catalog'::regclass);

create table if not exists public.room_member_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references app.users(id) on delete cascade,
  room       text not null,
  kind       text not null,
  data       jsonb not null,
  starts_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists room_member_items_user_idx on public.room_member_items (user_id, room, kind, starts_at);
select app.apply_owner_rls('public.room_member_items'::regclass);
grant select, insert, update, delete on public.room_member_items to app_user;
grant all on public.room_member_items to app_service;

insert into public.room_catalog (room, kind, edition, position, data) values
  ('clubhouse', 'partners_masc', 'carpe_diem', 0, $j${"id":"draftkings","name":"DraftKings","tag":"Sportsbook","desc":"Props, parlays, live betting","color":"#00D448","url":"https://www.draftkings.com","logo":"🏆"}$j$::jsonb),
  ('clubhouse', 'partners_masc', 'carpe_diem', 1, $j${"id":"yahoo","name":"Yahoo Fantasy","tag":"Fantasy Sports","desc":"Your leagues, draft board, waiver wire","color":"#7B0099","url":"https://football.fantasysports.yahoo.com","logo":"🏈"}$j$::jsonb),
  ('clubhouse', 'partners_masc', 'carpe_diem', 2, $j${"id":"bovada","name":"Bovada","tag":"Betting","desc":"Lines, futures, casino action","color":"#B8191A","url":"https://www.bovada.lv","logo":"🎰"}$j$::jsonb),
  ('clubhouse', 'partners_masc', 'carpe_diem', 3, $j${"id":"celebrity-crush","name":"Celebrity Crush","tag":"Coming Soon","desc":"Pop culture prediction markets — bet on the culture","color":"#FFA96B","url":"#","logo":"⭐","comingSoon":true}$j$::jsonb),
  ('clubhouse', 'partners_fem', 'finesse', 0, $j${"id":"words","name":"Words With Friends","tag":"Word Game","desc":"Challenge friends, play live","color":"#4CAF50","url":"https://apps.apple.com/app/words-with-friends-2/id1196764367","logo":"📝"}$j$::jsonb),
  ('clubhouse', 'partners_fem', 'finesse', 1, $j${"id":"candy","name":"Candy Crush","tag":"#1 Casual","desc":"12B+ downloads. You know it.","color":"#FF69B4","url":"https://apps.apple.com/app/candy-crush-saga/id553834731","logo":"🍬"}$j$::jsonb),
  ('clubhouse', 'partners_fem', 'finesse', 2, $j${"id":"wordle","name":"NYT Games","tag":"Puzzle","desc":"Wordle, Connections, Mini Crossword","color":"#6FAE3C","url":"https://apps.apple.com/app/nyt-games-word-games-sudoku/id307569751","logo":"🟩"}$j$::jsonb),
  ('clubhouse', 'partners_fem', 'finesse', 3, $j${"id":"roblox","name":"Roblox","tag":"Social Gaming","desc":"Hang, create, play — top 5 women 18-35","color":"#E60026","url":"https://apps.apple.com/app/roblox/id431946152","logo":"🎮"}$j$::jsonb),
  ('clubhouse', 'partners_fem', 'finesse', 4, $j${"id":"celebrity-crush","name":"Celebrity Crush","tag":"Coming Soon","desc":"Pop culture prediction markets — bet on the culture","color":"#FFA96B","url":"#","logo":"⭐","comingSoon":true}$j$::jsonb),
  ('departures', 'connectors', 'both', 0, $j${"key":"groupon","label":"Groupon","icon":"🏷","color":"#53A318","connected":false,"category":"deals","description":"Local deals, spa packages, experiences, and dining discounts.","badge":"up to 70% off"}$j$::jsonb),
  ('departures', 'connectors', 'both', 1, $j${"key":"fareharbor","label":"FareHarbor","icon":"⚓","color":"#1E88E5","connected":false,"category":"deals","description":"Tours, activities, watersports, and adventure bookings."}$j$::jsonb),
  ('departures', 'connectors', 'both', 2, $j${"key":"viator","label":"Viator","icon":"🧭","color":"#F35B04","connected":false,"category":"deals","description":"Guided experiences and excursions worldwide."}$j$::jsonb),
  ('departures', 'connectors', 'both', 3, $j${"key":"google_flights","label":"Google Flights","icon":"✈","color":"#4285F4","connected":false,"category":"flights","description":"Search and compare flights across every airline.","badge":"best prices"}$j$::jsonb),
  ('departures', 'connectors', 'both', 4, $j${"key":"kayak","label":"Kayak","icon":"🛶","color":"#FF690F","connected":false,"category":"flights","description":"Flight + hotel bundles and price alerts."}$j$::jsonb),
  ('departures', 'connectors', 'both', 5, $j${"key":"delta","label":"Delta SkyMiles","icon":"♦","color":"#003DA5","connected":false,"category":"flights","description":"Book with miles or cash, manage your SkyMiles."}$j$::jsonb),
  ('departures', 'connectors', 'both', 6, $j${"key":"aa","label":"American Airlines","icon":"★","color":"#C9A961","connected":false,"category":"flights","description":"AAdvantage miles, upgrades, and lounge access."}$j$::jsonb),
  ('departures', 'connectors', 'both', 7, $j${"key":"airbnb","label":"Airbnb","icon":"⌂","color":"#FF5A5F","connected":false,"category":"hotels","description":"Unique stays, entire homes, and luxury villas.","badge":"members get 10%"}$j$::jsonb),
  ('departures', 'connectors', 'both', 8, $j${"key":"marriott","label":"Marriott Bonvoy","icon":"M","color":"#C9A961","connected":false,"category":"hotels","description":"Hotel bookings and Bonvoy points redemptions."}$j$::jsonb),
  ('departures', 'connectors', 'both', 9, $j${"key":"hilton","label":"Hilton Honors","icon":"H","color":"#12214D","connected":false,"category":"hotels","description":"Hilton properties with member-exclusive rates."}$j$::jsonb),
  ('departures', 'connectors', 'both', 10, $j${"key":"opentable","label":"OpenTable","icon":"🍽","color":"#DA3743","connected":false,"category":"dining","description":"Restaurant reservations at 55,000+ restaurants."}$j$::jsonb),
  ('departures', 'connectors', 'both', 11, $j${"key":"resy","label":"Resy","icon":"🥂","color":"#4C84FF","connected":false,"category":"dining","description":"Reservations at the hottest restaurants in any city."}$j$::jsonb),
  ('departures', 'connectors', 'both', 12, $j${"key":"uber_eats","label":"Uber Eats","icon":"🚀","color":"#06C167","connected":false,"category":"dining","description":"Food delivery from restaurants near you."}$j$::jsonb),
  ('departures', 'connectors', 'both', 13, $j${"key":"doordash","label":"DoorDash","icon":"🛵","color":"#FF3008","connected":false,"category":"dining","description":"Restaurant delivery with DashPass savings."}$j$::jsonb),
  ('departures', 'categories', 'both', 0, $j${"key":"deals","label":"Deals","icon":"🏷","color":"#53A318","desc":"Local experiences & packages"}$j$::jsonb),
  ('departures', 'categories', 'both', 1, $j${"key":"flights","label":"Flights","icon":"✈","color":"#4285F4","desc":"Airfare & miles"}$j$::jsonb),
  ('departures', 'categories', 'both', 2, $j${"key":"hotels","label":"Hotels","icon":"🏨","color":"#FF5A5F","desc":"Stays & rewards"}$j$::jsonb),
  ('departures', 'categories', 'both', 3, $j${"key":"dining","label":"Dining","icon":"🍽","color":"#DA3743","desc":"Reservations & delivery"}$j$::jsonb),
  ('gym', 'fem_classes', 'finesse', 0, $j${"day":"Monday","time":"7:00 AM","name":"SoulCycle","studio":"East 83rd","instructor":"Jordan M."}$j$::jsonb),
  ('gym', 'fem_classes', 'finesse', 1, $j${"day":"Wednesday","time":"6:00 PM","name":"Hot Pilates","studio":"CorePower Studio","instructor":"Studio Class"}$j$::jsonb),
  ('gym', 'fem_classes', 'finesse', 2, $j${"day":"Saturday","time":"10:00 AM","name":"Barre","studio":"Physique 57 (Chelsea)","instructor":"Natalie R."}$j$::jsonb),
  ('gym', 'fem_recovery', 'finesse', 0, $j${"name":"Cryotherapy","venue":"RESTORE Hyper Wellness","price":"$65","when":"Sunday — 2:00 PM"}$j$::jsonb),
  ('gym', 'fem_recovery', 'finesse', 1, $j${"name":"Swedish Massage","venue":"The Well","price":"$195","when":"Next Friday"}$j$::jsonb),
  ('gym', 'fem_gear', 'finesse', 0, $j${"brand":"LULULEMON","name":"Align Leggings — Mauve Mist","price":"$98","novaNote":"Already in your size."}$j$::jsonb),
  ('gym', 'fem_gear', 'finesse', 1, $j${"brand":"VUORI","name":"Performance Jogger","price":"$108","novaNote":"Post-workout or coffee run. Both."}$j$::jsonb),
  ('gym', 'masc_gear', 'carpe_diem', 0, $j${"brand":"HYPERICE","name":"Hypervolt 2 Pro","price":"$299","novaNote":"recovery is the workout"}$j$::jsonb),
  ('gym', 'masc_gear', 'carpe_diem', 1, $j${"brand":"LULULEMON","name":"ABC Pant — Commission","price":"$128","novaNote":"you wear these to everything and you know it"}$j$::jsonb),
  ('gym', 'fem_partners', 'finesse', 0, $j${"brand":"WHOOP","offer":"1 Month Free + Band","saving":"$30 value","code":"FINESSE30","nova":"Your sleep score is killing your results. WHOOP will tell you exactly why."}$j$::jsonb),
  ('gym', 'fem_partners', 'finesse', 1, $j${"brand":"FORM NUTRITION","offer":"20% Off Collagen + Pre-Workout","saving":"20% off","code":"NOVA20","nova":"Clean ingredients. No junk. The collagen powder goes in everything."}$j$::jsonb),
  ('gym', 'fem_partners', 'finesse', 2, $j${"brand":"CLASSPASS","offer":"2 Weeks Free — All Studios","saving":"$40 value","code":"FINESSE2WK","nova":"Try the SoulCycle, the barre, the hot yoga — all on us. Pick your obsession."}$j$::jsonb),
  ('gym', 'masc_partners', 'carpe_diem', 0, $j${"brand":"WHOOP 4.0","offer":"1 Month Free","saving":"$30 value","code":"FINESSE30","nova":"Track your strain, recovery, and sleep. I use this data to schedule your sessions."}$j$::jsonb),
  ('gym', 'masc_partners', 'carpe_diem', 1, $j${"brand":"GAINFUL","offer":"Custom Protein — First Order 25% Off","saving":"25% off","code":"NOVA25","nova":"Personalized protein formula. Built for your body weight and goals. Not generic."}$j$::jsonb),
  ('gym', 'masc_partners', 'carpe_diem', 2, $j${"brand":"HYPERICE","offer":"$50 Off Hypervolt 2 Pro","saving":"$50 off","code":"RECOVER50","nova":"Recovery is the workout. This is the one tool that actually changes your numbers."}$j$::jsonb),
  ('kitchen', 'novas_table', 'both', 0, $j${"name":"Nobu Downtown","cuisine":"Japanese Omakase","neighborhood":"TriBeCa","price":"$$$$","nova":"Where the fish speaks first. Reservation for two, 8pm Friday — I already checked availability."}$j$::jsonb),
  ('kitchen', 'novas_table', 'both', 1, $j${"name":"Carbone","cuisine":"Italian-American","neighborhood":"Greenwich Village","price":"$$$","nova":"The sauce remembers everyone who ever sat there."}$j$::jsonb),
  ('kitchen', 'novas_table', 'both', 2, $j${"name":"Tatiana by Kwame Onwuachi","cuisine":"Contemporary American","neighborhood":"Lincoln Center","price":"$$$","nova":"The room where culture comes to eat."}$j$::jsonb),
  ('kitchen', 'cooking_classes', 'both', 0, $j${"title":"Knife Skills & French Technique","chef":"Chef Marie Laurent","date":"Sun Jun 22 · 11:00 AM","price":"$185"}$j$::jsonb),
  ('kitchen', 'cooking_classes', 'both', 1, $j${"title":"Omakase at Home: Sushi Fundamentals","chef":"Chef Kenji Mori","date":"Sat Jun 28 · 2:00 PM","price":"$240"}$j$::jsonb),
  ('kitchen', 'the_spots', 'both', 0, $j${"name":"STK Steakhouse","category":"Modern Steakhouse · Midtown","nova":"Where the deal gets closed over a tomahawk."}$j$::jsonb),
  ('kitchen', 'the_spots', 'both', 1, $j${"name":"Le Bernardin","category":"French Seafood · Midtown West","nova":"The move when she needs to know you're serious."}$j$::jsonb),
  ('kitchen', 'the_spots', 'both', 2, $j${"name":"The Smith","category":"American Brasserie · Midtown East","nova":"Post-game brunch. Always the right call."}$j$::jsonb),
  ('kitchen', 'fem_recipes', 'finesse', 0, $j${"name":"Citrus Salmon with Mango Slaw","time":"25 min","difficulty":"Easy","tags":["High Protein","Gluten-Free","Date Night"],"nova":"Impressive without the effort. He will absolutely think you cooked all day.","img":"1519708227418-2af883f8b9d4"}$j$::jsonb),
  ('kitchen', 'fem_recipes', 'finesse', 1, $j${"name":"Truffle Pasta — Cacio e Pepe Elevated","time":"20 min","difficulty":"Medium","tags":["Vegetarian","Comfort","Impress"],"nova":"Four ingredients. Restaurant results. This is the one.","img":"1551183053-bf91798d792c"}$j$::jsonb),
  ('kitchen', 'fem_recipes', 'finesse', 2, $j${"name":"Matcha Chia Pudding Parfait","time":"10 min + overnight","difficulty":"Easy","tags":["Meal Prep","Anti-Inflammatory","Breakfast"],"nova":"Make Sunday. Eat all week. Your skin will thank you.","img":"1490645935967-10de6ba17061"}$j$::jsonb),
  ('kitchen', 'masc_recipes', 'carpe_diem', 0, $j${"name":"Cast Iron Ribeye — Steakhouse Method","time":"15 min","difficulty":"Easy","tags":["High Protein","Carnivore","Power Meal"],"nova":"Reverse sear. Butter baste. Salt 24 hours before. You will never order steak out again.","img":"1546833999-2fe44ca9b41b"}$j$::jsonb),
  ('kitchen', 'masc_recipes', 'carpe_diem', 1, $j${"name":"Chicken & Rice — Macro-Optimized","time":"35 min","difficulty":"Easy","tags":["Meal Prep","4 Servings","45g Protein"],"nova":"Meal prep this on Sunday and you solve lunch for the week. 45g protein per serving.","img":"1604908176997-a9b8e9ab3bb2"}$j$::jsonb),
  ('kitchen', 'masc_recipes', 'carpe_diem', 2, $j${"name":"Spicy Tuna Poke Bowl","time":"15 min","difficulty":"Easy","tags":["Sushi-Grade","Clean","Recovery"],"nova":"Post-gym, anti-inflammatory, and looks expensive. Order the tuna from my sourcing link.","img":"1546833999-2fe44ca9b41b"}$j$::jsonb),
  ('lobby', 'feminine_picks', 'finesse', 0, $j${"brand":"Chanel","name":"22 Mini Bag — Black Lambskin","price":"$3,800","img":"1558618666-fcd25c85cd64","tag":"New Season"}$j$::jsonb),
  ('lobby', 'feminine_picks', 'finesse', 1, $j${"brand":"Valentino","name":"Rockstud Slide — Nude Patent","price":"$995","img":"1594938298603-c8148c4b4e59","tag":"Low Stock"}$j$::jsonb),
  ('lobby', 'feminine_picks', 'finesse', 2, $j${"brand":"Bottega Veneta","name":"Andiamo Clutch — Intrecciato","price":"$2,450","img":"1483985988355-763728e1935b","tag":"Curated"}$j$::jsonb),
  ('salon', 'masculine_products', 'carpe_diem', 0, $j${"id":"p1","name":"Shampoo & Conditioner","brand":"Aesop","status":"low","price":62}$j$::jsonb),
  ('salon', 'masculine_products', 'carpe_diem', 1, $j${"id":"p2","name":"Oud Wood EDP 50ml","brand":"Tom Ford","status":"full","price":210}$j$::jsonb),
  ('salon', 'masculine_products', 'carpe_diem', 2, $j${"id":"p3","name":"Recovery Moisturizer","brand":"Malin+Goetz","status":"low","price":52}$j$::jsonb),
  ('salon', 'masculine_products', 'carpe_diem', 3, $j${"id":"p4","name":"Detox Face Wash","brand":"Malin+Goetz","status":"full","price":38}$j$::jsonb),
  ('salon', 'trending_feminine', 'finesse', 0, $j${"name":"Ice Roller Facial","brand":"Tata Harper","venue":"Bergdorf Goodman Spa, 5th Ave NYC","price":"$195"}$j$::jsonb),
  ('salon', 'trending_feminine', 'finesse', 1, $j${"name":"Collagen Lip Treatment","brand":"Joanna Czech","venue":"Upper East Side Studio, NYC","price":"$350"}$j$::jsonb),
  ('salon', 'trending_feminine', 'finesse', 2, $j${"name":"Bespoke Brow Architecture","brand":"Shaping Room","venue":"NoHo, New York","price":"$125"}$j$::jsonb);
