// Unified Agent Dispatch API — members only, rate limited.
// POST { agent: 'scout'|'stylist'|'outing-planner'|'procurement'|'price-hunter', payload: {...} }
// → 200 agent result | 400 invalid | 401 signed_out | 429 rate_limited | 502/503 nova_unavailable

import {NextResponse} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {
  scoutByText,
  scoutByImage,
  suggestForOccasion,
  filterByStyle,
  planOuting,
  findProcurementPath,
  huntPrice,
  NovaUnavailableError,
  type ScoutResult,
} from '@/lib/agents';
import {emit} from '@/lib/intelligence';
import {createClient} from '@/lib/supabase/server';
import {guardAiCall} from '@/lib/ai-rate-limit';
import {novaImageSchema} from '@/lib/nova';

const text = (max: number) => z.string().trim().min(1).max(max);
const styleData = z.record(z.string(), z.unknown()).refine((o) => JSON.stringify(o).length <= 6000, 'style data too large');
const scoutItem = z.object({
  title: z.string().max(200),
  brand: z.string().max(120),
  price_cents: z.number().int().min(0).max(1_000_000_000),
  source: z.enum(['scale', 'embassy', 'nova', 'web']),
  image_url: z.string().max(2048).nullable(),
  purchase_url: z.string().max(2048).nullable(),
  partner: z.string().max(120).nullable(),
  confidence: z.number().min(0).max(1),
});
const member = z.object({username: text(64), nightvision_data: styleData.optional()});

const agentSchema = z.discriminatedUnion('agent', [
  z.object({
    agent: z.literal('scout'),
    payload: z.union([
      z.object({image: novaImageSchema}),
      z.object({query: text(300), style_dna: z.string().max(1000).optional()}),
    ]),
  }),
  z.object({
    agent: z.literal('stylist'),
    payload: z.union([
      z.object({items: z.array(scoutItem).min(1).max(30), nightvision_data: styleData}),
      z.object({occasion: text(300), occasion_type: z.string().max(64).optional(), nightvision_data: styleData.optional()}),
    ]),
  }),
  z.object({
    agent: z.literal('outing-planner'),
    payload: z.object({occasion: text(300), occasion_type: z.string().max(64).optional(), member1: member, member2: member}),
  }),
  z.object({
    agent: z.literal('procurement'),
    payload: z.object({item: z.object({title: text(200), category: text(64), price_cents: z.number().int().min(0).max(1_000_000_000)})}),
  }),
  z.object({
    agent: z.literal('price-hunter'),
    payload: z.object({title: text(200), brand: text(120), category: text(64), retail_cents: z.number().int().min(0).max(1_000_000_000)}),
  }),
]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out'}, {status: 401, headers: {'Cache-Control': 'no-store'}});

  const parsed = await parseBody(req, agentSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const ctx = {userId: user.id};

  // Procurement makes no model call; every other agent does (scout-by-image sends an image).
  if (body.agent !== 'procurement') {
    const bucket = body.agent === 'scout' && 'image' in body.payload ? 'image' : 'nova';
    const limited = await guardAiCall(user.id, bucket);
    if (limited) return limited;
  }

  void emit({
    user_id: user.id,
    kind: 'agent_query',
    payload: {
      agent: body.agent,
      category: 'category' in body.payload ? body.payload.category : undefined,
      query: 'query' in body.payload ? body.payload.query : undefined,
    },
  });

  try {
    switch (body.agent) {
      case 'scout': {
        const p = body.payload;
        if ('image' in p) return NextResponse.json(await scoutByImage(p.image, ctx));
        return NextResponse.json(await scoutByText(p.query, p.style_dna, ctx));
      }
      case 'stylist': {
        const p = body.payload;
        if ('items' in p) {
          // Filter mode: rerank existing items by style DNA
          return NextResponse.json(await filterByStyle(p.items as ScoutResult[], p.nightvision_data, ctx));
        }
        // Suggestion mode: generate items for an occasion
        return NextResponse.json(await suggestForOccasion(p.occasion, p.occasion_type ?? 'general', p.nightvision_data ?? {}, ctx));
      }
      case 'outing-planner': {
        const p = body.payload;
        return NextResponse.json(await planOuting(p.occasion, p.occasion_type ?? 'general', p.member1, p.member2, ctx));
      }
      case 'procurement':
        return NextResponse.json(await findProcurementPath(body.payload.item, user.id));
      case 'price-hunter': {
        const p = body.payload;
        return NextResponse.json(await huntPrice(p.title, p.brand, p.category, p.retail_cents, ctx));
      }
    }
  } catch (err) {
    if (err instanceof NovaUnavailableError) {
      return NextResponse.json({error: 'nova_unavailable'}, {status: err.status === 502 || err.status === 413 ? err.status : 503});
    }
    console.error('[POST /api/agents]', body.agent, err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({error: 'agent_error'}, {status: 500});
  }
}
