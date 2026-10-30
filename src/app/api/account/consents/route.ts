import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {reply, sessionMember, unauthorized} from '@/app/api/billing/_member';
import {CONSENT_KINDS, CONSENT_VERSION, isConsentKind, type Consent} from '@/lib/consents';

// Member consents — AI processing, photo AI, video AI, 18+ (supabase/migrations/20261017_s2_consents.sql,
// 20261020_s3_consents_video_ai.sql).
//   GET    → {consents: [{kind, accepted_at, version}]}
//   POST   {kind, platform?} → {consent} (accepting again keeps the original row)
//   DELETE ?kind=… → {withdrawn: true}
// The member is the session user (cookie or mobile bearer); RLS scopes every query to them.

const SELECT = 'kind, accepted_at, version';

const acceptBody = z.object({
  kind: z.enum(CONSENT_KINDS),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

const unavailable = (where: string, message?: string) => {
  console.error(`[consents] ${where} failed`, message);
  return reply({error: 'consents_unavailable'}, 503);
};

export async function GET() {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const {data, error} = await m.supabase.from('member_consents').select(SELECT).order('accepted_at', {ascending: true});
  if (error) return unavailable('read', error.message);
  return reply({consents: (data ?? []) as Consent[]});
}

export async function POST(req: NextRequest) {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const parsed = await parseBody(req, acceptBody);
  if (parsed.error) return parsed.error;
  const {kind, platform} = parsed.data;

  const {data, error} = await m.supabase
    .from('member_consents')
    .insert({member_id: m.userId, kind, platform: platform ?? null, version: CONSENT_VERSION})
    .select(SELECT)
    .single();
  if (!error && data) return reply({consent: data as Consent}, 201);
  if (error?.code !== '23505') return unavailable('accept', error?.message);

  // Already accepted — answer with the original row.
  const {data: existing, error: readError} = await m.supabase.from('member_consents').select(SELECT).eq('kind', kind).single();
  if (readError || !existing) return unavailable('re-read', readError?.message);
  return reply({consent: existing as Consent});
}

export async function DELETE(req: NextRequest) {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const kind = req.nextUrl.searchParams.get('kind');
  if (!isConsentKind(kind)) return reply({error: 'unknown_kind'}, 400);
  const {error} = await m.supabase.from('member_consents').delete().eq('member_id', m.userId).eq('kind', kind);
  if (error) return unavailable('withdraw', error.message);
  return reply({withdrawn: true});
}
