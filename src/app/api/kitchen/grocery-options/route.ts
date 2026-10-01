import {json, requireMember} from '@/lib/api/room';
import {groceryPartners} from '@/lib/kitchen';

// GET /api/kitchen/grocery-options — which delivery partners are actually connected.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const partners = groceryPartners();
  return json({partners, disclosure: partners.length ? 'Finesse may earn a referral commission from these partners.' : 'No grocery partner is connected yet.'}, ctx.traceId);
}
