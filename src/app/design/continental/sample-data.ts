/* Sample data for the design showcase only — never imported by a live room. */
import type {VaultTransaction} from '@/app/(hotel)/vault/vault-view';
import type {ScoredMember} from '@/app/(hotel)/lounge/lounge-view';
import type {Post} from '@/app/(hotel)/lounge/post-card';

// Fixed base so the server render and the client hydrate from identical data.
const BASE = Date.parse('2026-10-12T07:00:00Z');
const ago = (minutes: number) => new Date(BASE - minutes * 60_000).toISOString();

export const SAMPLE_TRANSACTIONS: VaultTransaction[] = [
  {id: 't1', merchant: 'The Ballroom · Table for two', amount_cents: -18600, cashback_cents: 2232, category: 'dining', direction: 'debit', created_at: ago(60 * 26)},
  {id: 't2', merchant: 'Vault deposit', amount_cents: 50000, cashback_cents: 0, category: 'funding', direction: 'credit', created_at: ago(60 * 50)},
  {id: 't3', merchant: 'Salon · Blow-dry & manicure', amount_cents: -14000, cashback_cents: 1680, category: 'beauty', direction: 'debit', created_at: ago(60 * 75)},
  {id: 't4', merchant: 'Jazz Club · Late set', amount_cents: -9500, cashback_cents: 1140, category: 'events', direction: 'debit', created_at: ago(60 * 120)},
];

const member = (id: string, display_name: string, username: string, vibe: string, score: number): ScoredMember => ({
  id,
  display_name,
  username,
  avatar_url: null,
  vibe,
  city: 'New York',
  interests: [],
  check_in: null,
  score,
  borderOpacity: 0.05 + (score / 100) * 0.35,
  glowStrength: score > 80 ? 'strong' : score > 60 ? 'medium' : 'subtle',
});

export const SAMPLE_MEMBERS: ScoredMember[] = [
  member('m1', 'Vivienne Ashford', 'vivienne', 'magical', 91),
  member('m2', 'Julian Marlowe', 'jmarlowe', 'warm', 84),
  member('m3', 'Celeste Duval', 'celeste', 'electric', 72),
  member('m4', 'Theodore Vance', 'teddy', 'chill', 66),
  member('m5', 'Margaux Sinclair', 'margaux', 'peaceful', 58),
  member('m6', 'August Rhodes', 'arhodes', 'wild', 51),
];

const post = (id: string, name: string, vibe: string, content: string, minutes: number, likes = 0): Post => ({
  id,
  content,
  media_urls: null,
  like_count: likes,
  created_at: ago(minutes),
  liked_by_me: false,
  profiles: {id: `p-${id}`, display_name: name, username: name.split(' ')[0].toLowerCase(), avatar_url: null, vibe},
});

export const SAMPLE_POSTS: Post[] = [
  post('a1', 'Vivienne Ashford', 'magical', 'Corner banquette, second martini, and the pianist just played our song without being asked. This house remembers everything.', 12),
  post('a2', 'Julian Marlowe', 'warm', 'Left my coat at the desk at nine. It came back pressed, with a note. Who are these people.', 48),
  post('a3', 'Celeste Duval', 'electric', 'Salon at four, Ballroom at eight. Dressed for both.', 95),
  post('a4', 'Theodore Vance', 'chill', 'Quiet one tonight. Good company, low music.', 180),
];

/** Extra posts so the showcase can show the full PostCard (posts after the eighth). */
export const SAMPLE_POSTS_FULL: Post[] = [
  ...SAMPLE_POSTS,
  post('a5', 'Margaux Sinclair', 'peaceful', 'Breakfast in the Kitchen, then the Gym. Discipline is the most luxurious habit.', 300),
  post('a6', 'August Rhodes', 'wild', 'Somebody taught the bartender a card trick. He now refuses to tell anyone else.', 400),
  post('a7', 'Vivienne Ashford', 'magical', 'Rain on the windows of the Lounge. Perfect.', 600),
  post('a8', 'Julian Marlowe', 'warm', 'The Concierge found a table that does not exist.', 700),
  post('a9', 'Celeste Duval', 'electric', 'Full card: a longer note with the like button and the wax-red heart. Join the table on Friday.', 900, 14),
];
