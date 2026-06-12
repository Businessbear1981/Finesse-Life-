// POST /api/intelligence/logistics
// Returns multi-carrier quotes and a smart recommendation.
// No auth required — public rate calculator for Exchange listings.

import { quoteLogistics } from '@/lib/intelligence';
import type { ShipmentSpec } from '@/lib/intelligence';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { weight_oz, value_cents, category, from_zip, to_zip } = body as Partial<ShipmentSpec>;

  if (typeof weight_oz !== 'number' || typeof value_cents !== 'number' || !category) {
    return Response.json(
      { error: 'Required: weight_oz (number), value_cents (number), category (string)' },
      { status: 400 },
    );
  }

  const spec: ShipmentSpec = { weight_oz, value_cents, category, from_zip, to_zip };
  const result = quoteLogistics(spec);
  return Response.json(result);
}
