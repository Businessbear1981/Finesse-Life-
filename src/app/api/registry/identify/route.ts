import {guardExpensive} from '@/lib/api-guard';
import { NextResponse } from 'next/server';
import { identifyImage } from '@/lib/vision';

export async function POST(req: Request) {
  const me = await guardExpensive('registry/identify', 10);
  if (me instanceof NextResponse) return me;
  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  try {
    const r = await identifyImage(file);
    return NextResponse.json({ title: r.title, brand: r.brand, estimated_price_cents: r.estimated_price_cents, category: r.category, confidence: r.confidence, evidence: r.evidence });
  } catch (e) {
    // No fabricated fallback: report that identification is unavailable.
    return NextResponse.json({ error: e instanceof Error ? e.message : 'identification unavailable' }, { status: 502 });
  }
}
