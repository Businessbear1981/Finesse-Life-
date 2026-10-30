// Member consents (supabase/migrations/20261017_s2_consents.sql). Shared by the API route and the web UI.

export const CONSENT_KINDS = ['ai_processing', 'photo_ai', 'video_ai', 'age_18'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];
export type Consent = {kind: ConsentKind; accepted_at: string; version: string};

/** The policy date the member is agreeing under (matches /privacy "Last updated"). */
export const CONSENT_VERSION = '2026-10-12';

export const isConsentKind = (v: unknown): v is ConsentKind => typeof v === 'string' && (CONSENT_KINDS as readonly string[]).includes(v);

/** Who processes Nova's prompts and photos — named in every disclosure. Keep in step with src/lib/ai.ts. */
export const AI_PROCESSOR = 'Anthropic (Claude)';

/** Who renders Scrapbook films from a member's words — named in the video_ai disclosure. Keep in step with the route. */
export const VIDEO_PROCESSOR = 'Higgsfield';

export const AI_DISCLOSURE =
  'Nova is an AI concierge powered by Anthropic’s Claude. What you type is sent to Anthropic (through our AI gateway, Vercel) to write the reply. Don’t share sensitive information such as passwords, card numbers or health details. Replies can be wrong — check anything important, and nothing is booked unless a partner confirms it.';
