// POST { brand, item, source, retail_price, members_price, category, tier }
// For MVP: just returns success (in production saves to embassy_deals table)
export async function POST() {
  return Response.json({ success: true, message: 'Deal submitted for review. Our team will assess within 24h.' });
}
