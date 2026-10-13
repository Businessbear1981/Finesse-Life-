import {reply, sessionMember, unauthorized} from '../../billing/_member';
import {guardAiCall} from '@/lib/ai-rate-limit';
import {requireAiConsent} from '@/lib/ai-consent-gate';
import {cleanDetails, confirmAndDispatch, draftSchema} from '@/lib/nova-requests';
import {z} from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/nova/requests → {requests: NovaRequestRow[]} (own, newest first, max 50)
export async function GET() {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const {data, error} = await member.supabase.from('nova_requests').select('*').order('created_at', {ascending: false}).limit(50);
  if (error) return reply({error: 'requests_unavailable'}, 502);
  return reply({requests: data ?? []});
}

// POST /api/nova/requests {kind, title, details, room?, confirm?} → 201 {request} (draft) | 200 {request} (confirmed + dispatched)
//   | 403 consent_required {kind:'ai_processing'}
// A room can create and confirm in one step when the member pressed the button themselves.
const body = draftSchema.extend({confirm: z.boolean().optional()});
export async function POST(req: Request) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return reply({error: 'invalid'}, 400);
  const clean = cleanDetails(parsed.data.kind, parsed.data.details);
  if (!clean.ok) return reply({error: clean.error}, 400);
  // Nova reads the request (and, on confirm, writes the result) — the member must have agreed to AI processing.
  const noConsent = await requireAiConsent(member.supabase, member.userId);
  if (noConsent) return noConsent;

  // Insert as the member (RLS: own drafts only).
  const {data: row, error} = await member.supabase.from('nova_requests')
    .insert({member_id: member.userId, kind: parsed.data.kind, title: parsed.data.title, details: clean.details, room: parsed.data.room ?? null})
    .select('*').single();
  if (error || !row) return reply({error: 'requests_unavailable'}, 502);
  if (!parsed.data.confirm) return reply({request: row}, 201);

  const limited = await guardAiCall(member.userId, 'nova');
  if (limited) return limited;
  const out = await confirmAndDispatch(row.id, member.userId);
  return reply(out.body, out.status);
}
