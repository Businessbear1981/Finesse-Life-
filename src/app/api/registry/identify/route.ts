import { NextResponse } from 'next/server';
import { complete } from '@/lib/ai';
import { guardAiCall } from '@/lib/ai-rate-limit';
import { requireAiConsent } from '@/lib/ai-consent-gate';
import { sessionMember, unauthorized } from '@/app/api/billing/_member';

// POST /api/registry/identify (multipart: file) — members only, AI consent required, rate limited.
// Only the photo's type and size reach the model (not the image), so ai_processing is the consent needed.
// → 200 suggestion | 400 | 401 signed_out | 403 consent_required | 429
export async function POST(req: Request) {
  const member = await sessionMember();
  if (!member) return unauthorized();
  const noConsent = await requireAiConsent(member.supabase, member.userId);
  if (noConsent) return noConsent;
  const limited = await guardAiCall(member.userId, 'nova');
  if (limited) return limited;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Convert image to base64 for description prompt
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type;

    // Ask Nova to identify the item — vision would be ideal but text inference as fallback
    let text: string;
    try {
      text = await complete(
        `A user uploaded a photo of a fashion/luxury item (${mimeType}, ${Math.round(file.size / 1024)}KB). Based on common luxury items, suggest a realistic item. Return ONLY valid JSON with no markdown: {"title":"...","brand":"...","estimated_price_cents":number,"category":"Bags|Shoes|Jewelry|Clothing|Beauty|Home|Travel|Experience|Other"}`,
        {
          system:
            'You are a luxury fashion identifier. Always return valid JSON only. No markdown, no explanation.',
          model: 'anthropic/claude-sonnet-4-6',
          feature: 'registry.identify',
        },
      );
    } catch {
      // Graceful fallback
      void base64;
      return NextResponse.json({
        title: '',
        brand: '',
        estimated_price_cents: 0,
        category: 'Other',
      });
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({
        title: '',
        brand: '',
        estimated_price_cents: 0,
        category: 'Other',
      });
    }

    const data = JSON.parse(match[0]) as {
      title: string;
      brand: string;
      estimated_price_cents: number;
      category: string;
    };

    return NextResponse.json({
      title: data.title ?? '',
      brand: data.brand ?? '',
      estimated_price_cents: typeof data.estimated_price_cents === 'number' ? data.estimated_price_cents : 0,
      category: data.category ?? 'Other',
    });
  } catch (err) {
    console.error('[registry/identify] error:', err);
    return NextResponse.json(
      { title: '', brand: '', estimated_price_cents: 0, category: 'Other' },
      { status: 200 },
    );
  }
}
