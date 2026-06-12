// GET  /api/intelligence/market?category=Sneakers
// GET  /api/intelligence/market?mode=anomalies
// POST /api/intelligence/market  { mode: 'price', item: {...} }

import { getMarketSignals, recommendListingPrice, detectMarketAnomalies } from '@/lib/intelligence';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? undefined;
  const mode = searchParams.get('mode');

  try {
    if (mode === 'anomalies') {
      const anomalies = await detectMarketAnomalies();
      return Response.json({ anomalies });
    }

    const signals = await getMarketSignals(category);
    return Response.json({ signals });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Market intelligence error' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { mode, item } = body as {
    mode?: string;
    item?: { title: string; brand?: string; category: string; condition: string };
  };

  if (mode === 'price' && item?.title) {
    try {
      const rec = await recommendListingPrice(item);
      return Response.json(rec);
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Price recommendation error' },
        { status: 500 },
      );
    }
  }

  return Response.json({ error: 'POST requires mode=price and item object' }, { status: 400 });
}
