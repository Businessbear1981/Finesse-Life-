import {NextRequest} from 'next/server';
import {z} from 'zod';
import {generateText} from 'ai';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {model, DEFAULT_MODEL} from '@/lib/ai';
import {fromSdkUsage, recordAiUsage} from '@/lib/ai-usage';
import {presignGet} from '@/lib/r2';
import {CAMERA_SELECT, identification, withViewUrl, type CameraRow} from '@/lib/camera';

const body = z.object({itemId: z.string().uuid()});

const PROMPT = `You catalogue a member's own wardrobe photo for a private closet.
Return ONLY JSON: {"identified": boolean, "label": string|null, "category": one of
["tops","bottoms","dresses","outerwear","shoes","bags","accessories","jewelry","beauty","home","other"]|null,
"brand_guess": string|null, "confidence": number 0..1}.
If you cannot clearly see a single item, return identified=false with nulls. Never invent a brand; use null unless a logo is legible.`;

// POST /api/camera/identify — ask the vision model. On ANY failure the item becomes
// "unidentified" with no label; there is no fallback guess.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;

  const {data: row, error} = await ctx.supabase.from('camera_items').select(CAMERA_SELECT).eq('id', parsed.data.itemId).eq('user_id', ctx.userId).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'camera');
  if (!row) return json({error: 'not_found'}, ctx.traceId, 404);
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return json({error: 'model_unavailable', message: 'The reticle has no lens yet — no model is configured.'}, ctx.traceId, 503);
  }

  let result: z.infer<typeof identification> | null = null;
  const started = Date.now();
  try {
    const url = await presignGet((row as CameraRow).image_key, 120);
    const {text, totalUsage} = await generateText({
      model: model(),
      messages: [{role: 'user', content: [{type: 'image', image: new URL(url)}, {type: 'text', text: PROMPT}]}],
    });
    void recordAiUsage({feature: 'camera.identify', model: DEFAULT_MODEL, userId: ctx.userId, traceId: ctx.traceId, latencyMs: Date.now() - started, ...fromSdkUsage(totalUsage)});
    const jsonText = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const ok = identification.safeParse(JSON.parse(jsonText));
    result = ok.success ? ok.data : null;
  } catch (e) {
    console.warn('[camera] identify failed', e instanceof Error ? e.message : e, ctx.traceId);
  }

  const identified = Boolean(result?.identified && result.label);
  const {data: updated, error: upErr} = await ctx.supabase
    .from('camera_items')
    .update({
      state: identified ? 'identified' : 'unidentified',
      label: identified ? result!.label : null,
      category: identified ? result!.category : null,
      brand_guess: identified ? result!.brand_guess : null,
      confidence: result ? result.confidence : null,
      model: DEFAULT_MODEL,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.itemId)
    .eq('user_id', ctx.userId)
    .select(CAMERA_SELECT)
    .single();
  if (upErr) return dbFailure(upErr, ctx.traceId, 'camera');
  return json({item: await withViewUrl(updated as CameraRow)}, ctx.traceId);
}
