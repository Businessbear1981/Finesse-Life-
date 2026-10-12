import type { Engine } from './types';
import { dbExists } from '../truth';

/** Profile engine (tier 0): summarises what the member told us at check-in. */
export const profileEngine: Engine = {
  id: 'profile',
  intents: ['behavioral_profile', 'profile.summary'],
  consumes: ['checkin.saved'],
  emits: ['profile.summarised'],
  tier: 0,
  provider: 'internal',
  timeoutMs: 2000,
  async handle({ read, userId }) {
    const answers = (await read.query<{ answers: Record<string, string> }>(
      'select answers from public.interview_answers where user_id = $1', [userId])).rows[0]?.answers ?? {};
    const staff = (await read.query<{ nova_voice: string; shopper_name: string }>(
      'select nova_voice, shopper_name from public.member_staff where user_id = $1', [userId])).rows[0] ?? null;
    const connected = (await read.query<{ provider: string }>(
      "select provider from public.social_connections where user_id = $1 and status = 'connected'", [userId])).rows.map((r) => r.provider);
    const complete = Object.keys(answers).length > 0 && staff !== null;
    return {
      kind: 'profile.summary',
      result: { answered: Object.keys(answers).length, staff, connected, checkin_complete: complete },
      claims: complete
        ? [{ text: 'member has completed check-in', verify: dbExists('select 1 from public.interview_answers where user_id = $1', [userId], 'public.interview_answers') }]
        : [],
      events: [{ type: 'profile.summarised', payload: { checkin_complete: complete } }],
    };
  },
};
