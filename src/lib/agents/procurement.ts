// Procurement: when a registry item is funded, finds the best purchase path
// Knows about partner programs (Carvana for cars, Airbnb for trips, etc.)

export interface ProcurementPath {
  method: 'scale' | 'partner' | 'direct' | 'manual';
  partner_name: string | null;
  partner_url: string | null;
  token: string | null; // FSS-VIP-XXXXXXXX for partner redemptions
  instructions: string;
  estimated_savings_cents: number;
}

interface PartnerEntry {
  name: string;
  url: string;
  discount_pct: number;
}

const PARTNER_MAP: Record<string, PartnerEntry> = {
  car: {name: 'Carvana', url: 'https://carvana.com', discount_pct: 10},
  vehicle: {name: 'Carvana', url: 'https://carvana.com', discount_pct: 10},
  trip: {name: 'Airbnb Luxury', url: 'https://airbnb.com', discount_pct: 8},
  travel: {name: 'Airbnb Luxury', url: 'https://airbnb.com', discount_pct: 8},
  vacation: {name: 'Airbnb Luxury', url: 'https://airbnb.com', discount_pct: 8},
  studio: {name: 'Finesse Studios', url: 'https://finesselife.vip/embassy', discount_pct: 15},
  photoshoot: {name: 'Finesse Studios', url: 'https://finesselife.vip/embassy', discount_pct: 15},
  hotel: {name: 'Hotels.com', url: 'https://hotels.com', discount_pct: 12},
  stay: {name: 'Hotels.com', url: 'https://hotels.com', discount_pct: 12},
  resort: {name: 'Hotels.com', url: 'https://hotels.com', discount_pct: 12},
};

function matchPartner(category: string): PartnerEntry | null {
  const normalized = category.toLowerCase().trim();
  // Exact key match first
  if (PARTNER_MAP[normalized]) return PARTNER_MAP[normalized];
  // Substring match
  for (const [key, partner] of Object.entries(PARTNER_MAP)) {
    if (normalized.includes(key)) return partner;
  }
  return null;
}

export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return (
    'FSS-VIP-' +
    Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
}

export async function findProcurementPath(item: {
  title: string;
  category: string;
  price_cents: number;
}): Promise<ProcurementPath> {
  const partner = matchPartner(item.category);

  if (partner) {
    const savings = Math.round(item.price_cents * (partner.discount_pct / 100));
    return {
      method: 'partner',
      partner_name: partner.name,
      partner_url: partner.url,
      token: generateToken(),
      instructions: `Present your Finesse token at ${partner.name} checkout for ${partner.discount_pct}% off. Token is single-use and expires in 72 hours.`,
      estimated_savings_cents: savings,
    };
  }

  // Check if Scale has a deal for this category (inline lightweight check)
  const {createClient} = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const {data} = await supabase
    .from('scale_deals')
    .select('id,title,purchase_url,price_cents')
    .eq('status', 'live')
    .or(`title.ilike.%${item.title}%,category.ilike.%${item.category}%`)
    .limit(1)
    .maybeSingle();

  if (data) {
    const scaleSavings = Math.max(0, item.price_cents - (data as {price_cents: number}).price_cents);
    return {
      method: 'scale',
      partner_name: 'Finesse Scale',
      partner_url: (data as {purchase_url: string | null}).purchase_url,
      token: generateToken(),
      instructions: `This item is available through a Finesse Scale group buy at a reduced price. Join the campaign to unlock the deal.`,
      estimated_savings_cents: scaleSavings,
    };
  }

  // Fallback: direct purchase
  return {
    method: 'direct',
    partner_name: null,
    partner_url: null,
    token: null,
    instructions: `Purchase directly from the brand or retailer. Your Finesse Vault cashback will be applied post-purchase.`,
    estimated_savings_cents: 0,
  };
}
