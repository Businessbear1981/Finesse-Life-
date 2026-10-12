#!/usr/bin/env node
/**
 * Demo house seed — fills Finesse with clearly-tagged DEMO members and activity so a live demo isn't empty.
 *
 * Everything this creates is tagged and removable:
 *   - auth users with email  demo-NN@demo.finesselife.vip  and  user_metadata.demo = true
 *   - their profiles (username demo_*), Lounge posts, live-map presence (Austin), and map events titled "… · demo"
 *
 * Usage (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment):
 *   node scripts/seed-demo.mjs            # dry run: prints what it would do, touches nothing
 *   node scripts/seed-demo.mjs --apply    # create / refresh the demo house (idempotent)
 *   node scripts/seed-demo.mjs --purge    # delete every demo user (cascades to their rows) + demo events
 *
 * Production use needs a principal's go-ahead (AGENTS.md). Never commit keys.
 */
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';

const APPLY = process.argv.includes('--apply');
const PURGE = process.argv.includes('--purge');
const DOMAIN = 'demo.finesselife.vip';
const AUSTIN = {lat: 30.2655, lng: -97.7425};
// Demo presence stays visible for a week (normally 15 minutes) so the map isn't empty between visits.
const PRESENCE_DAYS = 7;

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

const POSTS = [
  'Rainey is electric tonight. Table by the fire pit if anyone wants in.',
  'Rooftop Session lineup just dropped. 11pm, don’t be late.',
  'Best espresso martini in Austin is still at the hotel bar. Fight me.',
  'SoCo vintage haul: one perfect leather jacket. The Vault 12% hit different.',
  'Anyone else at the Jazz Club late set? Save me a seat.',
  'Sunday reset: Barton Springs at 9, brunch after. Who’s coming?',
  'Nova found me a table at 8:30 on a Friday. Witchcraft.',
  'Black tie Saturday — the Stylist pulled three looks in ten minutes.',
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

async function main() {
  say(`Finesse demo house — ${PURGE ? 'PURGE' : APPLY ? 'APPLY' : 'DRY RUN'}`);
  if (!APPLY && !PURGE) {
    say(`Would create ${MEMBERS.length} demo members (demo-NN@${DOMAIN}), ${POSTS.length} Lounge posts,`);
    say(`${MEMBERS.length} live-map dots around Austin (visible ${PRESENCE_DAYS} days) and ${EVENTS.length} map events.`);
    say('Run with --apply to do it, or --purge to remove it.');
    return;
  }

  const db = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {auth: {persistSession: false}});

  // Existing demo users (paginate the admin list).
  const existing = new Map();
  for (let page = 1; page < 20; page++) {
    const {data, error} = await db.auth.admin.listUsers({page, perPage: 200});
    if (error) throw error;
    for (const u of data.users) if (u.email?.endsWith(`@${DOMAIN}`)) existing.set(u.email, u.id);
    if (data.users.length < 200) break;
  }

  if (PURGE) {
    for (const [email, id] of existing) {
      const {error} = await db.auth.admin.deleteUser(id);
      say(error ? `  ✗ ${email}: ${error.message}` : `  ✓ removed ${email}`);
    }
    const {error} = await db.from('map_events').delete().like('title', '% · demo');
    say(error ? `  ✗ demo events: ${error.message}` : '  ✓ removed demo events');
    return;
  }

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
  say('Done. Purge any time with --purge.');
}

main().catch((e) => {
  console.error('Seed failed:', e.message ?? e);
  process.exit(1);
});
