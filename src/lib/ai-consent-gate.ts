// Server-side AI consent gate (Apple 5.1.2(i), Google Play AI-generated content). SERVER-ONLY.
//
// Every route that sends a member's words, photos or media to the model on their behalf calls requireAiConsent BEFORE
// the model call (and before the rate-limit slot is taken). The member must have an active member_consents row
// (supabase/migrations/20261017_s2_consents.sql) of kind `ai_processing`, plus `photo_ai` when a photo is sent, plus
// `video_ai` when a Scrapbook film is rendered. Withdrawing a consent deletes the row, so "active" = "row exists".
//
// Refusal: 403 {error:'consent_required', kind} — the clients open the consent sheet for `kind` when they see it
// (web: src/components/nova/ai-consent.tsx; mobile: mobile/src/lib/consents.ts + components/rooms/AIConsent.tsx).
// Fails CLOSED: if the consent table can't be read, 503 consents_unavailable — nothing is sent to the model.

import {NextResponse} from 'next/server';
import type {createClient} from '@/lib/supabase/server';
import type {ConsentKind} from '@/lib/consents';

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type AiConsentKind = Extract<ConsentKind, 'ai_processing' | 'photo_ai' | 'video_ai'>;

const NO_STORE = {'Cache-Control': 'no-store'} as const;

export const consentRequired = (kind: AiConsentKind) =>
  NextResponse.json({error: 'consent_required', kind}, {status: 403, headers: NO_STORE});

/** The AI kinds a call needs: always ai_processing, plus photo_ai when a photo goes to the model, plus video_ai for a film. */
export const neededKinds = (opts: {photo?: boolean; video?: boolean} = {}): AiConsentKind[] => [
  'ai_processing',
  ...(opts.photo ? (['photo_ai'] as const) : []),
  ...(opts.video ? (['video_ai'] as const) : []),
];

/** Pure: the first needed kind the member hasn't accepted, or null. */
export function missingConsent(accepted: readonly string[], needed: readonly AiConsentKind[]): AiConsentKind | null {
  return needed.find((k) => !accepted.includes(k)) ?? null;
}

/**
 * Route helper: null when the member may proceed, else the response to return (403 consent_required or 503).
 * `supabase` is the member's own session client — RLS lets a member read only their own consents.
 */
export async function requireAiConsent(supabase: Supabase, userId: string, opts: {photo?: boolean; video?: boolean} = {}): Promise<NextResponse | null> {
  const needed = neededKinds(opts);
  try {
    const {data, error} = await supabase.from('member_consents').select('kind').eq('member_id', userId).in('kind', needed);
    if (error) {
      console.error('[ai-consent] read failed — refusing (fail closed)', error.code ?? error.message);
      return NextResponse.json({error: 'consents_unavailable'}, {status: 503, headers: NO_STORE});
    }
    const missing = missingConsent(((data ?? []) as Array<{kind: string}>).map((r) => r.kind), needed);
    return missing ? consentRequired(missing) : null;
  } catch (e) {
    console.error('[ai-consent] read threw — refusing (fail closed)', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({error: 'consents_unavailable'}, {status: 503, headers: NO_STORE});
  }
}
