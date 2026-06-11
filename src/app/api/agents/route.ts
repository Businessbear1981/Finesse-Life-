// Unified Agent Dispatch API
// POST { agent: 'scout'|'stylist'|'outing-planner'|'procurement'|'price-hunter', payload: {...} }

import {
  scoutByText,
  scoutByImage,
  suggestForOccasion,
  filterByStyle,
  planOuting,
  findProcurementPath,
  huntPrice,
  type ScoutResult,
} from '@/lib/agents';

interface AgentRequest {
  agent: 'scout' | 'stylist' | 'outing-planner' | 'procurement' | 'price-hunter';
  payload: Record<string, unknown>;
}

export async function POST(req: Request) {
  let body: AgentRequest;
  try {
    body = (await req.json()) as AgentRequest;
  } catch {
    return Response.json({error: 'Invalid JSON body'}, {status: 400});
  }

  const {agent, payload} = body;

  try {
    switch (agent) {
      // ── Scout ──────────────────────────────────────────────────────────────
      case 'scout': {
        if (payload.image && typeof payload.image === 'string') {
          const results = await scoutByImage(payload.image);
          return Response.json(results);
        }
        if (payload.query && typeof payload.query === 'string') {
          const results = await scoutByText(
            payload.query,
            typeof payload.style_dna === 'string' ? payload.style_dna : undefined,
          );
          return Response.json(results);
        }
        return Response.json({error: 'Scout requires query (string) or image (base64 string)'}, {status: 400});
      }

      // ── Stylist ────────────────────────────────────────────────────────────
      case 'stylist': {
        if (payload.items && Array.isArray(payload.items) && payload.nightvision_data) {
          // Filter mode: rerank existing items by style DNA
          const ranked = await filterByStyle(
            payload.items as ScoutResult[],
            (payload.nightvision_data as Record<string, unknown>) ?? {},
          );
          return Response.json(ranked);
        }
        if (payload.occasion && typeof payload.occasion === 'string') {
          // Suggestion mode: generate items for an occasion
          const suggestions = await suggestForOccasion(
            payload.occasion,
            typeof payload.occasion_type === 'string' ? payload.occasion_type : 'general',
            (payload.nightvision_data as Record<string, unknown>) ?? {},
          );
          return Response.json(suggestions);
        }
        return Response.json(
          {error: 'Stylist requires occasion (string) or items + nightvision_data'},
          {status: 400},
        );
      }

      // ── Outing Planner ─────────────────────────────────────────────────────
      case 'outing-planner': {
        if (
          !payload.occasion ||
          typeof payload.occasion !== 'string' ||
          !payload.member1 ||
          !payload.member2
        ) {
          return Response.json(
            {error: 'outing-planner requires occasion, occasion_type, member1, member2'},
            {status: 400},
          );
        }
        const plan = await planOuting(
          payload.occasion,
          typeof payload.occasion_type === 'string' ? payload.occasion_type : 'general',
          payload.member1 as {username: string; nightvision_data?: Record<string, unknown>},
          payload.member2 as {username: string; nightvision_data?: Record<string, unknown>},
        );
        return Response.json(plan);
      }

      // ── Procurement ────────────────────────────────────────────────────────
      case 'procurement': {
        const item = payload.item as {title?: string; category?: string; price_cents?: number};
        if (!item?.title || !item?.category || typeof item?.price_cents !== 'number') {
          return Response.json(
            {error: 'procurement requires item: { title, category, price_cents }'},
            {status: 400},
          );
        }
        const path = await findProcurementPath({
          title: item.title,
          category: item.category,
          price_cents: item.price_cents,
        });
        return Response.json(path);
      }

      // ── Price Hunter ───────────────────────────────────────────────────────
      case 'price-hunter': {
        const {title, brand, category, retail_cents} = payload as {
          title?: string;
          brand?: string;
          category?: string;
          retail_cents?: number;
        };
        if (!title || !brand || !category || typeof retail_cents !== 'number') {
          return Response.json(
            {error: 'price-hunter requires title, brand, category, retail_cents'},
            {status: 400},
          );
        }
        const prices = await huntPrice(title, brand, category, retail_cents);
        return Response.json(prices);
      }

      // ── Unknown ────────────────────────────────────────────────────────────
      default:
        return Response.json(
          {error: `Unknown agent "${agent}". Valid: scout, stylist, outing-planner, procurement, price-hunter`},
          {status: 400},
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent error';
    return Response.json({error: message}, {status: 500});
  }
}
