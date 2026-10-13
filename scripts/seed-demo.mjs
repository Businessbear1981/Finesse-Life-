#!/usr/bin/env node
/**
 * Demo house seed — fills Finesse with clearly-tagged DEMO members and activity so a live demo isn't empty,
 * and (with --reviewer) creates / refreshes the App Store / Google Play reviewer account.
 *
 * Everything this creates is tagged and removable:
 *   - auth users with email  demo-NN@demo.finesselife.vip  and  user_metadata.demo = true
 *   - their profiles (username demo_*), Lounge posts, live-map presence (Austin), and map events titled "… · demo"
 *   - the reviewer: review@demo.finesselife.vip (user_metadata.reviewer = true) and that account's own rows
 *
 * Usage (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment):
 *   node scripts/seed-demo.mjs                       # dry run: prints what it would do, touches nothing
 *   node scripts/seed-demo.mjs --apply               # create / refresh the demo house (idempotent)
 *   node scripts/seed-demo.mjs --purge               # delete every demo member (cascades) + demo events
 *
 *   node scripts/seed-demo.mjs --reviewer            # dry run of the reviewer account (prints the plan + env check)
 *   REVIEWER_PASSWORD=… node scripts/seed-demo.mjs --reviewer --apply
 *                                                    # create / refresh the reviewer + demo members + their content
 *   node scripts/seed-demo.mjs --reviewer --purge    # delete the reviewer account only
 *
 * Reviewer env:
 *   REVIEWER_PASSWORD   required for --reviewer --apply (≥ 12 chars). Never hardcoded, never printed.
 *                       Put the same value in App Store Connect → App Review Information and Play Console → App access.
 *   REVIEWER_LOOK_DIR   optional folder of .jpg look photos (default mobile/store/reviewer/looks, made by
 *                       mobile/store/tools/looks.cjs). Uploaded to the public Storage bucket "review-demo".
 * The house entrance code the reviewer types is the server's ENTRANCE_KEYLOCK_CODE (Vercel env). This script
 * never reads or prints it; the founder pastes it into the review notes (docs/store/app-review-notes.md).
 *
 * The reviewer is NOT VIP (VIP is hidden in the store build). Age (18+) and terms consents are pre-accepted
 * when those tables / columns exist; AI consent is deliberately NOT pre-accepted, so the reviewer sees the
 * Nova disclosure + consent sheet (Apple 5.1.2(i)).
 *
 * Production use needs a principal's go-ahead (AGENTS.md). Never commit keys.
 */
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const APPLY = process.argv.includes('--apply');
const PURGE = process.argv.includes('--purge');
const REVIEWER = process.argv.includes('--reviewer');
const DOMAIN = 'demo.finesselife.vip';
const REVIEWER_EMAIL = `review@${DOMAIN}`;
const IS_DEMO_MEMBER = (email) => /^demo-\d+@/.test(email ?? '') && email.endsWith(`@${DOMAIN}`);
// Demo presence stays visible for a week (normally 15 minutes) so the map isn't empty between visits.
const PRESENCE_DAYS = 7;
const HERE = dirname(fileURLToPath(import.meta.url));
const LOOK_DIR = process.env.REVIEWER_LOOK_DIR || join(HERE, '..', 'mobile', 'store', 'reviewer', 'looks');
const LOOK_BUCKET = 'review-demo';

const MEMBERS = [
  ['Jade Okafor', 'feminine', 'electric', ['nightlife', 'fashion', 'art']],
  ['Marcus Kim', 'masculine', 'warm', ['watches', 'golf', 'dining']],
  ['Sofia Ortiz', 'feminine', 'chill', ['wellness', 'travel', 'beauty']],
  ['Theo Adams', 'masculine', 'magical', ['music', 'sneakers', 'film']],
  ['Lena Ruiz', 'feminine', 'wild', ['nightlife', 'dance', 'fashion']],
  ['Nia Vance', 'feminine', 'peaceful', ['art', 'books', 'wellness']],
  ['Dev Patel', 'masculine', 'electric', ['tech', 'cars', 'dining']],
  ['Ama Boateng', 'feminine', 'warm', ['beauty', 'travel', 'music']],
  ['Kai Morgan', 'nonbinary', 'magical', ['art', 'fashion', 'film']],
  ['Isla Chen', 'feminine', 'chill', ['dining', 'wine', 'travel']],
  ['Rafael Silva', 'masculine', 'wild', ['nightlife', 'football', 'music']],
  ['Zara Hassan', 'feminine', 'electric', ['fashion', 'beauty', 'nightlife']],
  ['Jonah Brooks', 'masculine', 'chill', ['golf', 'whiskey', 'watches']],
  ['Maya Lindqvist', 'feminine', 'peaceful', ['wellness', 'yoga', 'dining']],
  ['Andre Moreau', 'masculine', 'warm', ['wine', 'travel', 'art']],
  ['Priya Rao', 'feminine', 'magical', ['music', 'fashion', 'tech']],
  ['Cole Bennett', 'masculine', 'electric', ['cars', 'nightlife', 'sneakers']],
  ['Elle Laurent', 'feminine', 'wild', ['fashion', 'travel', 'nightlife']],
  ['Sam Rivera', 'nonbinary', 'chill', ['music', 'books', 'coffee']],
  ['Tessa Grant', 'feminine', 'warm', ['dining', 'beauty', 'art']],
  ['Omar Haddad', 'masculine', 'magical', ['watches', 'travel', 'dining']],
  ['Chloe Park', 'feminine', 'electric', ['dance', 'nightlife', 'fashion']],
  ['Luca Romano', 'masculine', 'peaceful', ['wine', 'golf', 'books']],
  ['Ivy Sinclair', 'feminine', 'magical', ['art', 'fashion', 'music']],
];

// Only features every build has (no Vault, no VIP), and nothing that claims Nova booked or paid for anything.
const POSTS = [
  'Rainey is electric tonight. Table by the fire pit if anyone wants in.',
  'Rooftop Session lineup just dropped. 11pm, don’t be late.',
  'Best espresso martini in Austin is still at the hotel bar. Fight me.',
  'SoCo vintage haul: one perfect leather jacket. The Wardrobe rail finally has its missing piece.',
  'Anyone else at the Jazz Club late set? Save me a seat.',
  'Sunday reset: Barton Springs at 9, brunch after. Who’s coming?',
  'Nova drafted three options for Friday in under a minute. I just picked one and called.',
  'Black tie Saturday — the Stylist pulled three looks in ten minutes.',
];

// Extra Lounge posts for the reviewer's feed (by demo members; idempotent by content).
const REVIEW_POSTS = [
  'Gallery opening on East Cesar Chavez tonight. Quiet crowd, great light. Worth the detour.',
  'Kitchen plan for the week is set. Sunday prep, zero weeknight decisions.',
  'Departures: Tulum in three weeks. Packing list already in the Diary.',
  'New tailor on South Lamar. Two fittings, perfect hem. Ask me for the name.',
];

// Night-out hotspots (approximate, public places) — same areas as the design preview.
const SPOTS = [
  {lat: 30.2597, lng: -97.7381, w: 9}, // Rainey Street
  {lat: 30.2672, lng: -97.7392, w: 7}, // East 6th
  {lat: 30.2697, lng: -97.7505, w: 5}, // West 6th
  {lat: 30.2500, lng: -97.7490, w: 4}, // South Congress
  {lat: 30.2640, lng: -97.7290, w: 3}, // East Austin
];

const EVENTS = [
  ['Rainey Takeover · demo', 'Rainey Street', 30.2599, -97.7384, 0, 5],
  ['Rooftop Session · demo', 'The Penthouse · 2nd St', 30.2652, -97.7447, 2, 4],
  ['SoCo After Dark · demo', 'South Congress', 30.2497, -97.7493, 26, 4],
];

// Keep in step with mobile/store/tools/looks.cjs.
const REVIEWER_LOOKS = [
  ['look-01.jpg', 'Black tie, Saturday', ['The Row', 'Mejuri']],
  ['look-02.jpg', 'Gallery night', ['Khaite', 'Toteme']],
  ['look-03.jpg', 'Sunday reset', ['Loro Piana', 'Gucci']],
  ['look-04.jpg', 'Rooftop, late', ['Bottega Veneta', 'Saint Laurent']],
];

const say = (...a) => console.log(...a);
const snap = (v) => Math.round(v / 0.002) * 0.002; // same grid as map_ping

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Set it in the environment (never commit it).`);
    process.exit(2);
  }
  return v;
}

function pickSpot(i) {
  const total = SPOTS.reduce((s, x) => s + x.w, 0);
  let n = (i * 7919) % total;
  for (const s of SPOTS) {
    if (n < s.w) return s;
    n -= s.w;
  }
  return SPOTS[0];
}

// ── dates (UTC, Monday-start weeks like src/lib/closet.ts mondayOf) ─────────────────────────────────────────
const DAY = 864e5;
const isoDate = (d) => d.toISOString().slice(0, 10);
function mondayOf(d) {
  const diff = (d.getUTCDay() + 6) % 7;
  return isoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff)));
}
/** Today + n days at hh:mm Austin time (UTC-5) as an ISO timestamp. */
function at(n, hh, mm = 0) {
  const d = new Date(Date.now() + n * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh + 5, mm)).toISOString();
}
/** The next Friday (today if it's Friday). */
function nextFriday() {
  const d = new Date();
  return new Date(d.getTime() + ((5 - d.getUTCDay() + 7) % 7) * DAY);
}

// ── reviewer content ───────────────────────────────────────────────────────────────────────────────────────
function reviewerContent() {
  const friIso = isoDate(nextFriday());
  const eveningPlan = [
    'Three ways to play Friday, all inside $450 for two:',
    '1. Dinner-first: Uchi, then a nightcap on Rainey.',
    '2. Gallery-first: East Austin openings, late dinner at Suerte.',
    '3. Rooftop-first: sunset drinks downtown, dinner at Comedor.',
    '',
    'Recommended — dinner-first:',
    '7:00 PM — Car to Uchi, South Lamar — $35',
    '7:30 PM — Dinner at Uchi, omakase for two — $260',
    '9:45 PM — Nightcap at Small Victory, downtown — $60',
    '11:30 PM — Car home — $40',
    '',
    'Nothing is booked. Reserve on Uchi’s own site when you’re happy with the plan.',
  ].join('\n');
  const tripPlan = [
    'Tulum, 4 nights for two — a draft for your approval.',
    '',
    'Day 1 — Land CUN early afternoon, private transfer (about 1h45). Check in, beach dinner.',
    'Day 2 — Cenote morning (Gran Cenote, go before 10am), long lunch, sunset at the ruins.',
    'Day 3 — Sian Ka’an boat day, back for a late dinner in the jungle.',
    'Day 4 — Slow morning, spa, last dinner somewhere you dress up for.',
    'Day 5 — Late checkout, transfer to CUN.',
    '',
    'Pack: linen, one dressy look, reef-safe sunscreen, cash in pesos for cenotes.',
    'Nothing is booked. Flights, transfer and rooms are suggestions you confirm yourself.',
  ].join('\n');

  const requests = [
    {key: 'find', kind: 'find_item', room: 'wardrobe', title: 'A black satin slip dress under $600', details: {query: 'black satin slip dress, midi, under $600', size: 'S'},
      result: {agent: 'scout', items: [
        {title: 'Bias-cut satin slip dress', brand: 'Khaite', price_cents: 58000, source: 'web', purchase_url: 'https://khaite.com'},
        {title: 'Silk satin midi slip', brand: 'Toteme', price_cents: 49000, source: 'web', purchase_url: 'https://toteme.com'},
        {title: 'Cowl-neck satin slip dress', brand: 'Reformation', price_cents: 27800, source: 'web', purchase_url: 'https://www.thereformation.com'},
      ]}},
    {key: 'price', kind: 'price_check', room: 'bag', title: 'Best price: Loro Piana Summer Walk loafers', details: {item: 'Loro Piana Summer Walk suede loafers', size: '39'},
      result: {agent: 'price-hunter', prices: [
        {source: 'Loro Piana', price_cents: 109500, url: 'https://www.loropiana.com', is_members_price: false, savings_cents: 0},
        {source: 'Nordstrom', price_cents: 109500, url: 'https://www.nordstrom.com', is_members_price: false, savings_cents: 0},
        {source: 'Neiman Marcus', price_cents: 104000, url: 'https://www.neimanmarcus.com', is_members_price: false, savings_cents: 5500},
      ]}},
    {key: 'evening', kind: 'plan', room: 'perdiem', title: `Night out · ${friIso}`, details: {topic: 'evening', party_size: 2, brief: 'Night out — $450 all in, for two.'},
      result: {agent: 'planner', plan: eveningPlan, booked: false}},
    {key: 'trip', kind: 'plan', room: 'departures', title: 'Tulum, four nights', details: {topic: 'trip', party_size: 2, brief: 'Tulum for two, four nights, relaxed but one dressed-up dinner.'},
      result: {agent: 'planner', plan: tripPlan, booked: false}},
  ];

  return {
    friIso, eveningPlan, tripPlan, requests,
    perDiemItems: [
      {time: '7:00 PM', label: 'Car to Uchi, South Lamar', cost_cents: 3500, done: false},
      {time: '7:30 PM', label: 'Dinner at Uchi, omakase for two', cost_cents: 26000, done: false},
      {time: '9:45 PM', label: 'Nightcap at Small Victory, downtown', cost_cents: 6000, done: false},
      {time: '11:30 PM', label: 'Car home', cost_cents: 4000, done: false},
    ],
    diary: [
      // [dayOffset, hh, mm, title, state, source_room, notes]
      [0, 9, 0, 'Pilates, Lagree Austin', 'done', 'gym', null],
      [0, 13, 0, 'Lunch with Maya at Odd Duck', 'approved', 'diary', null],
      [1, 18, 30, 'Tailor pickup, South Lamar', 'approved', 'wardrobe', 'Hem on the wide-leg trousers.'],
      [2, 11, 0, 'Reserve Friday dinner', 'needs_member_action', 'concierge', 'Nova drafted the evening; nothing is booked yet.'],
      [3, 8, 0, 'Sunday prep: Kitchen grocery list', 'held', 'kitchen', null],
      [5, 19, 0, 'Jordan’s birthday dinner', 'needs_member_action', 'entourage', 'Gift idea saved in the Entourage.'],
    ],
    entourage: [
      {name: 'Jordan Ellis', relation: 'best friend', city: 'Austin', birthdayInDays: 5, loves: ['natural wine', 'vinyl', 'Aesop'], notes: 'Hates surprises, loves a long dinner. Size M.'},
      {name: 'Maya Lindqvist', relation: 'friend', city: 'Austin', birthdayInDays: 64, loves: ['yoga', 'ceramics', 'matcha'], notes: 'Lunch every other Monday.'},
    ],
    kitchen: {
      dailyKcal: 2100,
      meals: [
        {day: 0, slot: 'breakfast', name: 'Greek yogurt, berries, granola', kcal: 420},
        {day: 0, slot: 'lunch', name: 'Chicken shawarma bowl', kcal: 650},
        {day: 0, slot: 'dinner', name: 'Miso salmon, jasmine rice, bok choy', kcal: 720},
        {day: 1, slot: 'breakfast', name: 'Avocado toast, two eggs', kcal: 480},
        {day: 1, slot: 'lunch', name: 'Niçoise salad', kcal: 560},
        {day: 1, slot: 'dinner', name: 'Turkey meatballs, orzo, pesto', kcal: 760},
        {day: 2, slot: 'breakfast', name: 'Overnight oats, almond butter', kcal: 450},
        {day: 2, slot: 'lunch', name: 'Shrimp tacos, slaw', kcal: 620},
        {day: 2, slot: 'dinner', name: 'Steak, roasted potatoes, greens', kcal: 820},
        {day: 3, slot: 'snack', name: 'Hummus, cucumber, pita', kcal: 260},
        {day: 4, slot: 'dinner', name: 'Out: Friday night (Per Diem)', kcal: null},
      ],
      grocery: [
        {item: 'Salmon fillets', qty: '2'}, {item: 'Chicken thighs', qty: '1 lb'}, {item: 'Greek yogurt', qty: '32 oz'},
        {item: 'Berries', qty: '2 pints'}, {item: 'Avocados', qty: '3'}, {item: 'Eggs', qty: '1 dozen'},
        {item: 'Shrimp', qty: '1 lb'}, {item: 'Bok choy', qty: '2 heads'}, {item: 'Jasmine rice', qty: '1 bag'},
      ],
    },
    gym: [
      // [daysAgo, exercise, reps, weight_kg, rpe, rest_s]
      [1, 'Back squat', 6, 70, 8, 150], [1, 'Back squat', 6, 70, 8.5, 150], [1, 'Romanian deadlift', 8, 60, 7.5, 120],
      [3, 'Bench press', 8, 45, 8, 120], [3, 'Bench press', 8, 45, 8.5, 120], [3, 'Seated row', 10, 40, 7, 90],
      [5, 'Hip thrust', 10, 80, 8, 120], [5, 'Walking lunge', 12, 16, 7.5, 90],
    ],
  };
}

// ── shared helpers ─────────────────────────────────────────────────────────────────────────────────────────
async function listUsers(db) {
  const all = new Map();
  for (let page = 1; page < 50; page++) {
    const {data, error} = await db.auth.admin.listUsers({page, perPage: 200});
    if (error) throw error;
    for (const u of data.users) if (u.email?.endsWith(`@${DOMAIN}`)) all.set(u.email, u.id);
    if (data.users.length < 200) break;
  }
  return all;
}

/** Run one step; a missing table/column (older database) is reported and skipped, never fatal. */
async function step(label, fn) {
  try {
    const r = await fn();
    say(`  ✓ ${label}${typeof r === 'string' ? ` — ${r}` : ''}`);
    return r;
  } catch (e) {
    const msg = e?.message ?? String(e);
    const missing = /does not exist|schema cache|PGRST20[45]|42P01|42703/.test(`${msg} ${e?.code ?? ''}`);
    say(`  ${missing ? '–' : '✗'} ${label}: ${missing ? 'skipped (not in this database yet)' : msg}`);
    return null;
  }
}
const must = ({data, error}) => { if (error) throw error; return data; };

/** TERMS_VERSION from src/lib/moderation.ts (null when the file or constant isn't there yet). */
function termsVersion() {
  const f = join(HERE, '..', 'src', 'lib', 'moderation.ts');
  if (!existsSync(f)) return null;
  return /export const TERMS_VERSION\s*=\s*['"]([^'"]{1,32})['"]/.exec(readFileSync(f, 'utf8'))?.[1] ?? null;
}

async function ensureDemoMembers(db, existing) {
  const ids = [];
  for (const [i, [name, gender, vibe, interests]] of MEMBERS.entries()) {
    const email = `demo-${String(i + 1).padStart(2, '0')}@${DOMAIN}`;
    let id = existing.get(email);
    if (!id) {
      const {data, error} = await db.auth.admin.createUser({
        email, password: randomBytes(24).toString('base64url'), email_confirm: true,
        user_metadata: {demo: true, display_name: name},
      });
      if (error) throw error;
      id = data.user.id;
    }
    ids.push(id);
    const username = `demo_${name.split(' ')[0].toLowerCase()}${i + 1}`;
    const {error: pErr} = await db.from('profiles').update({
      display_name: name, username, gender, vibe, interests, city: 'Austin', check_in: new Date().toISOString(),
    }).eq('id', id);
    say(pErr ? `  ✗ profile ${email}: ${pErr.message}` : `  ✓ ${name} (${email})`);
  }
  return ids;
}

// ── demo house ─────────────────────────────────────────────────────────────────────────────────────────────
async function seedHouse(db, existing) {
  const ids = await ensureDemoMembers(db, existing);

  // Lounge posts (only if the demo author has none yet — idempotent).
  for (const [i, content] of POSTS.entries()) {
    const author = ids[i % ids.length];
    const {count} = await db.from('posts').select('id', {count: 'exact', head: true}).eq('author_id', author);
    if (count) continue;
    const {error} = await db.from('posts').insert({author_id: author, content, media_urls: []});
    say(error ? `  ✗ post: ${error.message}` : `  ✓ post by ${MEMBERS[i % MEMBERS.length][0]}`);
  }

  // Live map presence (coarse cells, like real members).
  const until = new Date(Date.now() + PRESENCE_DAYS * 864e5).toISOString();
  const presence = ids.map((id, i) => {
    const s = pickSpot(i);
    const jitter = (k) => (((i * 2654435761 + k) % 1000) / 1000 - 0.5) * 0.004;
    const kind = MEMBERS[i][1] === 'feminine' ? 'f' : MEMBERS[i][1] === 'masculine' ? 'm' : 'x';
    return {member_id: id, cell_lat: snap(s.lat + jitter(1)), cell_lng: snap(s.lng + jitter(2)), kind, seen_at: until};
  });
  const {error: mErr} = await db.from('map_presence').upsert(presence, {onConflict: 'member_id'});
  say(mErr ? `  ✗ map presence: ${mErr.message}` : `  ✓ ${presence.length} dots on the Austin map`);

  // Map events (replace demo events).
  await db.from('map_events').delete().like('title', '% · demo');
  const now = Date.now();
  const events = EVENTS.map(([title, venue, lat, lng, inH, hours]) => ({
    title, venue, lat, lng, starts_at: new Date(now + inH * 36e5).toISOString(), ends_at: new Date(now + (inH + hours) * 36e5).toISOString(),
  }));
  const {error: eErr} = await db.from('map_events').insert(events);
  say(eErr ? `  ✗ events: ${eErr.message}` : `  ✓ ${events.length} events on the map`);
  return ids;
}

// ── reviewer ───────────────────────────────────────────────────────────────────────────────────────────────
function reviewerDryRun() {
  const c = reviewerContent();
  const looks = existsSync(LOOK_DIR) ? readdirSync(LOOK_DIR).filter((f) => /\.jpe?g$/i.test(f)) : [];
  say(`Reviewer account: ${REVIEWER_EMAIL} (password from REVIEWER_PASSWORD; never printed)`);
  say('  not VIP · is_vip=false, any VIP grants revoked · age 18+ and terms consents pre-accepted when present');
  say('  AI consent NOT pre-accepted (the reviewer sees the Nova disclosure sheet)');
  say('Would seed for the reviewer:');
  say(`  ${c.diary.length} Diary items · ${REVIEWER_LOOKS.length} Wardrobe looks (${looks.length} photos found in ${LOOK_DIR}) · a Closet week`);
  say(`  1 trip (Tulum, planned) · Per Diem night ${c.friIso} ($450, ${c.perDiemItems.length} stops) · ${c.entourage.length} Entourage people`);
  say(`  Kitchen plan (${c.kitchen.meals.length} meals, ${c.kitchen.grocery.length} grocery lines) · ${c.gym.length} Gym sets`);
  say(`  ${c.requests.length} Nova requests in "ready" state (find it, price check, evening plan, trip plan) — nothing booked`);
  say(`  ${REVIEW_POSTS.length} more Lounge posts by demo members (plus the ${MEMBERS.length}-member demo house)`);
  say('');
  say('Environment check (values never printed):');
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'REVIEWER_PASSWORD']) say(`  ${process.env[k] ? '✓' : '✗'} ${k}`);
  say('  · ENTRANCE_KEYLOCK_CODE / KEYLOCK_SECRET must be set on the SERVER (Vercel), not here. Paste the code into App Review notes.');
  say('Run with --reviewer --apply to do it.');
}

async function uploadLooks(db) {
  const files = existsSync(LOOK_DIR) ? readdirSync(LOOK_DIR).filter((f) => /\.jpe?g$/i.test(f)).sort() : [];
  if (!files.length) throw new Error(`no look photos in ${LOOK_DIR} (run: node mobile/store/tools/looks.cjs)`);
  const {error: bErr} = await db.storage.createBucket(LOOK_BUCKET, {public: true});
  if (bErr && !/exist/i.test(bErr.message)) throw bErr;
  const urls = new Map();
  for (const f of files) {
    const {error} = await db.storage.from(LOOK_BUCKET).upload(`looks/${f}`, readFileSync(join(LOOK_DIR, f)), {contentType: 'image/jpeg', upsert: true});
    if (error) throw error;
    urls.set(f, db.storage.from(LOOK_BUCKET).getPublicUrl(`looks/${f}`).data.publicUrl);
  }
  return urls;
}

async function seedReviewer(db, existing, demoIds) {
  const password = env('REVIEWER_PASSWORD');
  if (password.length < 12) { console.error('REVIEWER_PASSWORD must be at least 12 characters.'); process.exit(2); }
  const c = reviewerContent();
  const meta = {reviewer: true, display_name: 'Avery Lane'};

  say(`Reviewer: ${REVIEWER_EMAIL}`);
  let uid = existing.get(REVIEWER_EMAIL);
  if (uid) {
    must(await db.auth.admin.updateUserById(uid, {password, email_confirm: true, user_metadata: meta}));
    say('  ✓ account refreshed (password reset to REVIEWER_PASSWORD)');
  } else {
    uid = must(await db.auth.admin.createUser({email: REVIEWER_EMAIL, password, email_confirm: true, user_metadata: meta})).user.id;
    say('  ✓ account created');
  }

  await step('profile (not VIP)', async () => {
    must(await db.from('profiles').upsert({
      id: uid, username: 'avery_review', display_name: 'Avery Lane', city: 'Austin', age: 29, vibe: 'warm',
      interests: ['dining', 'fashion', 'travel'], is_vip: false, vip_expires_at: null, intake_complete: true, onboarding_done: true,
    }, {onConflict: 'id'}));
  });
  await step('VIP grants revoked', async () => {
    must(await db.from('vip_grants').update({revoked_at: new Date().toISOString()}).eq('user_id', uid).is('revoked_at', null));
  });

  // Consents present at run time (tolerate absence): member_consents kinds + profile columns.
  await step('age 18+ consent', async () => {
    must(await db.from('member_consents').upsert({member_id: uid, kind: 'age_18', platform: null}, {onConflict: 'member_id,kind'}));
  });
  await step('house rules & terms accepted', async () => {
    // Same columns POST /api/account/accept-terms writes; the version is read from src/lib/moderation.ts.
    const version = termsVersion();
    must(await db.from('profiles').update({terms_accepted_at: new Date().toISOString(), ...(version ? {terms_version: version} : {})}).eq('id', uid));
    return version ? `version ${version}` : 'no TERMS_VERSION found';
  });

  // Fresh content every run: clear the reviewer's own rows, then insert.
  const wipe = async (table, col = 'user_id') => { const {error} = await db.from(table).delete().eq(col, uid); if (error) throw error; };

  const reqIds = {};
  await step(`Nova requests (${c.requests.length}, ready)`, async () => {
    await wipe('nova_requests', 'member_id');
    for (const r of c.requests) {
      const row = must(await db.from('nova_requests').insert({member_id: uid, kind: r.kind, title: r.title, details: r.details, room: r.room, status: 'ready', result: r.result}).select('id').single());
      reqIds[r.key] = row.id;
    }
  });

  await step(`Diary (${c.diary.length} items)`, async () => {
    await wipe('diary_items');
    for (const [n, hh, mm, title, state, room, notes] of c.diary) {
      const linked = room === 'concierge' ? reqIds.evening ?? null : null;
      const row = must(await db.from('diary_items').insert({user_id: uid, title, starts_at: at(n, hh, mm), state, source_room: room, source_id: linked, notes}).select('id').single());
      if (linked) await db.from('nova_requests').update({diary_item_id: row.id}).eq('id', linked);
    }
  });

  const lookIds = [];
  await step(`Wardrobe looks (${REVIEWER_LOOKS.length})`, async () => {
    const urls = await uploadLooks(db);
    await wipe('wardrobe_looks');
    for (const [i, [file, caption, brands]] of REVIEWER_LOOKS.entries()) {
      const url = urls.get(file) ?? [...urls.values()][i % urls.size];
      lookIds.push(must(await db.from('wardrobe_looks').insert({user_id: uid, photo_url: url, caption, brands}).select('id').single()).id);
    }
  });
  await step('Closet week', async () => {
    if (!lookIds.length) return 'no looks';
    const worn = [0, 2, 4, 5]; // Mon, Wed, Fri, Sat
    const days = Array.from({length: 7}, (_, day) => ({day, lookId: worn.includes(day) ? lookIds[worn.indexOf(day) % lookIds.length] : null}));
    must(await db.from('closet_rotations').upsert({user_id: uid, week_start: mondayOf(new Date()), days}, {onConflict: 'user_id,week_start'}));
  });

  await step('Departures trip (Tulum, planned)', async () => {
    await wipe('trips', 'member_id');
    must(await db.from('trips').insert({
      member_id: uid, title: 'Tulum, four nights', origin: 'Austin (AUS)', destination: 'Tulum, Mexico',
      depart_at: at(21, 9, 30), return_at: at(25, 15, 0), party_size: 2, status: 'planned',
      brief: 'Tulum for two, four nights, relaxed but one dressed-up dinner.', plan: c.tripPlan, nova_request_id: reqIds.trip ?? null,
    }));
  });

  await step(`Per Diem night (${c.friIso})`, async () => {
    await wipe('per_diem_plans', 'member_id');
    must(await db.from('per_diem_plans').insert({
      member_id: uid, plan_date: c.friIso, occasion: 'Night out', budget_cents: 45000, items: c.perDiemItems,
      plan_text: c.eveningPlan, nova_request_id: reqIds.evening ?? null, status: 'planned',
    }));
  });

  await step(`Entourage (${c.entourage.length})`, async () => {
    await wipe('entourage_people', 'member_id');
    for (const p of c.entourage) {
      const b = new Date(Date.now() + p.birthdayInDays * DAY);
      must(await db.from('entourage_people').insert({member_id: uid, name: p.name, relation: p.relation, city: p.city,
        birthday: `1996-${isoDate(b).slice(5)}`, loves: p.loves, notes: p.notes}));
    }
  });

  await step('Kitchen plan (this week)', async () => {
    must(await db.from('kitchen_plans').upsert({user_id: uid, week_start: mondayOf(new Date()), daily_kcal: c.kitchen.dailyKcal,
      meals: c.kitchen.meals, grocery_list: c.kitchen.grocery, updated_at: new Date().toISOString()}, {onConflict: 'user_id,week_start'}));
  });

  await step(`Gym sets (${c.gym.length})`, async () => {
    await wipe('gym_sets');
    must(await db.from('gym_sets').insert(c.gym.map(([ago, exercise, reps, weight_kg, rpe, rest_s], i) => ({
      user_id: uid, exercise, reps, weight_kg, rpe, rest_s, source: 'manual', performed_at: new Date(Date.now() - ago * DAY - i * 6e4).toISOString(),
    }))));
  });

  await step(`Lounge posts by demo members (${REVIEW_POSTS.length})`, async () => {
    let added = 0;
    for (const [i, content] of REVIEW_POSTS.entries()) {
      const {count} = await db.from('posts').select('id', {count: 'exact', head: true}).eq('content', content);
      if (count) continue;
      must(await db.from('posts').insert({author_id: demoIds[(i * 5 + 3) % demoIds.length], content, media_urls: []}));
      added += 1;
    }
    return `${added} new`;
  });

  say('');
  say('Reviewer ready. In App Store Connect / Play Console App access give:');
  say(`  house code: the server's ENTRANCE_KEYLOCK_CODE · sign in: ${REVIEWER_EMAIL} / (REVIEWER_PASSWORD)`);
}

async function main() {
  const mode = PURGE ? 'PURGE' : APPLY ? 'APPLY' : 'DRY RUN';
  say(`Finesse ${REVIEWER ? 'reviewer account' : 'demo house'} — ${mode}`);
  if (!APPLY && !PURGE) {
    if (REVIEWER) return reviewerDryRun();
    say(`Would create ${MEMBERS.length} demo members (demo-NN@${DOMAIN}), ${POSTS.length} Lounge posts,`);
    say(`${MEMBERS.length} live-map dots around Austin (visible ${PRESENCE_DAYS} days) and ${EVENTS.length} map events.`);
    say('Run with --apply to do it, or --purge to remove it. Add --reviewer for the App Review account.');
    return;
  }

  const db = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {auth: {persistSession: false}});
  if (REVIEWER && APPLY) env('REVIEWER_PASSWORD'); // fail before touching anything
  const existing = await listUsers(db);

  if (PURGE) {
    if (REVIEWER) {
      const id = existing.get(REVIEWER_EMAIL);
      if (!id) return say('  – no reviewer account');
      const {error} = await db.auth.admin.deleteUser(id);
      return say(error ? `  ✗ ${REVIEWER_EMAIL}: ${error.message}` : `  ✓ removed ${REVIEWER_EMAIL}`);
    }
    for (const [email, id] of existing) {
      if (!IS_DEMO_MEMBER(email)) continue; // the reviewer is removed only with --reviewer --purge
      const {error} = await db.auth.admin.deleteUser(id);
      say(error ? `  ✗ ${email}: ${error.message}` : `  ✓ removed ${email}`);
    }
    const {error} = await db.from('map_events').delete().like('title', '% · demo');
    say(error ? `  ✗ demo events: ${error.message}` : '  ✓ removed demo events');
    return;
  }

  if (REVIEWER) {
    say('Demo members (Lounge authors):');
    const demoIds = await seedHouse(db, existing);
    await seedReviewer(db, existing, demoIds);
    return;
  }
  await seedHouse(db, existing);
  say('Done. Purge any time with --purge.');
}

main().catch((e) => {
  console.error('Seed failed:', e.message ?? e);
  process.exit(1);
});
