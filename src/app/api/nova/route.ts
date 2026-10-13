import {NextResponse} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';
import {emit} from '@/lib/intelligence';
import {guardAiCall} from '@/lib/ai-rate-limit';
import {requireAiConsent} from '@/lib/ai-consent-gate';
import {
  MAX_HISTORY_TURNS,
  MAX_IMAGES,
  MAX_PROMPT_CHARS,
  noteLegacySystem,
  novaImageSchema,
  novaTurnSchema,
  resolvePersona,
  runNova,
} from '@/lib/nova';

// POST /api/nova — members only, rate limited.
// Body: {prompt, persona?, style?, images? (≤3), image? (legacy), history? (≤12)}
// → 200 {text, tool_calls?} | 401 signed_out | 403 consent_required {kind} | 400 invalid | 413 too large | 429 rate_limited
//   | 502 empty_response | 503 nova_unavailable (502/503 carry an honest `text`).
// `system` is accepted for backward compatibility but NEVER used as instructions.

const MAX_BODY_BYTES = 14 * 1024 * 1024;

const novaRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(MAX_PROMPT_CHARS),
    // Canonical ids: NOVA_PERSONAS in src/lib/nova.ts. Unknown/alias values resolve server-side (never a 400) so a
    // caller sending a coarse name keeps working; see resolvePersona.
    persona: z.string().trim().max(32).regex(/^[A-Za-z_-]+$/).optional(),
    // Member style preferences (concierge avatar). Invalid or extra fields are dropped, not a 400.
    style: z.record(z.string(), z.unknown()).optional(),
    /** @deprecated ignored — send `persona`. */
    system: z.string().max(8000).optional(),
    image: novaImageSchema.optional(),
    images: z.array(novaImageSchema).max(MAX_IMAGES).optional(),
    history: z.array(novaTurnSchema).max(MAX_HISTORY_TURNS).optional(),
  })
  .refine((b) => (b.images?.length ?? 0) + (b.image ? 1 : 0) <= MAX_IMAGES, {message: `at most ${MAX_IMAGES} images`, path: ['images']});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out'}, {status: 401, headers: {'Cache-Control': 'no-store'}});

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({error: 'too_large'}, {status: 413});

  const parsed = await parseBody(req, novaRequestSchema);
  if (parsed.error) return parsed.error;
  const {prompt, persona, style, system, image, images, history} = parsed.data;
  const allImages = images && images.length > 0 ? images : image ? [image] : [];

  const resolved = resolvePersona({persona, style, system});
  noteLegacySystem(resolved);

  const noConsent = await requireAiConsent(supabase, user.id, {photo: allImages.length > 0});
  if (noConsent) return noConsent;

  const limited = await guardAiCall(user.id, allImages.length > 0 ? 'image' : 'nova');
  if (limited) return limited;

  void emit({user_id: user.id, kind: 'agent_query', payload: {page: 'concierge', persona: resolved.persona, query_length: prompt.length}});

  const result = await runNova({
    userId: user.id,
    prompt,
    persona: resolved.persona,
    style: resolved.style,
    images: allImages,
    history,
    tools: true,
  });

  if (!result.ok) {
    return NextResponse.json(
      {error: result.error, text: result.text, tool_calls: result.toolCalls},
      {status: result.status},
    );
  }
  return NextResponse.json({text: result.text, tool_calls: result.toolCalls});
}
