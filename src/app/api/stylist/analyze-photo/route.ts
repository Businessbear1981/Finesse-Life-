import {NextResponse} from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {createClient} from '@/lib/supabase/server';
import {recordAiUsage} from '@/lib/ai-usage';
import {guardAiCall} from '@/lib/ai-rate-limit';

const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});

type StyleAnalysis = {
  style_archetype: string;
  style_labels: string[];
  similar_brands: string[];
  price_range: string;
  buying_tendencies: string[];
};

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_BYTES = 5 * 1024 * 1024;

// POST /api/stylist/analyze-photo — members only, rate limited through the shared per-member
// limiter (src/lib/ai-rate-limit.ts, 'image' bucket when a photo is attached). The previous
// in-memory per-instance throttle (5/min) is replaced by the durable one.
// → 200 analysis | 401 | 413 | 415 | 429 rate_limited | 502/503 (never a canned analysis)
export async function POST(req: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out'}, {status: 401});
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES + 64 * 1024) return NextResponse.json({error: 'too_large'}, {status: 413});

  let file: File | null = null;
  try {
    const entry = (await req.formData()).get('file');
    file = entry instanceof File ? entry : null;
  } catch {
    return NextResponse.json({error: 'invalid_form'}, {status: 400});
  }
  if (file && file.size > 0) {
    if (!(ALLOWED as readonly string[]).includes(file.type)) return NextResponse.json({error: 'unsupported_type'}, {status: 415});
    if (file.size > MAX_BYTES) return NextResponse.json({error: 'too_large'}, {status: 413});
  }

  const limited = await guardAiCall(user.id, file && file.size > 0 ? 'image' : 'nova');
  if (limited) return limited;

  const started = Date.now();
  let modelAnswered = false;
  try {
    let imageContent: Anthropic.ImageBlockParam | null = null;

    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mediaType = file.type as (typeof ALLOWED)[number];
      imageContent = {
        type: 'image',
        source: {type: 'base64', media_type: mediaType, data: base64},
      };
    }

    const textPrompt = `You are Nova, a luxury personal stylist AI with deep knowledge of fashion, consumer psychology, and buying behavior.
${imageContent ? 'Analyze this photo for style cues.' : 'Provide a general luxury style analysis.'}
Return ONLY valid JSON with these exact keys:
{
  "style_archetype": "2-4 word label (e.g. Dark Luxe Editorial, Quiet Money, Street Luxe)",
  "style_labels": ["3 specific style descriptors"],
  "similar_brands": ["4 luxury/premium brands that match this aesthetic"],
  "price_range": "$X–$Y typical spend per piece",
  "buying_tendencies": ["4-6 product categories this person most likely buys (e.g. designer bags, fine jewelry, luxury skincare, tailored suits, sneaker culture, home decor)"]
}`;

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: imageContent
          ? [imageContent, {type: 'text', text: textPrompt}]
          : [{type: 'text', text: textPrompt}],
      },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages,
    });
    modelAnswered = true;
    void recordAiUsage({
      feature: 'stylist.analyze_photo',
      model: response.model ?? 'claude-sonnet-4-6',
      userId: user.id,
      latencyMs: Date.now() - started,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      cacheReadTokens: response.usage?.cache_read_input_tokens,
      cacheWriteTokens: response.usage?.cache_creation_input_tokens,
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    const result = JSON.parse(cleaned) as StyleAnalysis;

    // Persist style_dna to the caller's own profile (RLS-scoped client).
    try {
      await supabase.from('profiles').update({style_dna: result}).eq('id', user.id);
    } catch {
      // non-blocking — save failure doesn't break the response
    }

    return NextResponse.json(result);
  } catch {
    // Honest failure — previously returned a canned analysis (FALLBACK) as if Nova had read the photo.
    if (!modelAnswered) {
      void recordAiUsage({feature: 'stylist.analyze_photo', model: 'claude-sonnet-4-6', userId: user.id, latencyMs: Date.now() - started, ok: false});
    }
    return NextResponse.json({error: 'stylist_unavailable', message: "Nova couldn't read this photo just now. No analysis was produced."}, {status: modelAnswered ? 502 : 503});
  }
}
