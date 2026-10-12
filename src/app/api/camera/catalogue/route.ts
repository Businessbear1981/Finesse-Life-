import {z} from 'zod';
import {body, memberRoute, must, HttpError} from '@/lib/room-api';

const CAT: Record<string, string> = {Bags: 'bag', Shoes: 'shoes', Clothing: 'top', Jewelry: 'accessory', Watches: 'accessory'};
// Member-confirmed result → closet item. The member may correct name/category before confirming.
export const POST = memberRoute(async (req, {db, user}) => {
  const b = await body(req, z.object({scan_id: z.uuid(), name: z.string().min(1).max(200).optional(), category: z.enum(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory']).optional()}));
  const scan = must(await db.from('camera_scans').select('id, status, result, image_key').eq('id', b.scan_id).maybeSingle()) as {status: string; result: {title?: string; brand?: string; category?: string} | null; image_key: string | null} | null;
  if (!scan) throw new HttpError(404, 'not found');
  if (scan.status !== 'identified') throw new HttpError(409, `scan is ${scan.status}`);
  const name = b.name ?? [scan.result?.brand, scan.result?.title].filter(Boolean).join(' ');
  const item = must(await db.from('closet_items').insert({user_id: user.id, name, category: b.category ?? CAT[scan.result?.category ?? ''] ?? null, source: 'camera', image_key: scan.image_key}).select('id').single()) as {id: string};
  await db.from('camera_scans').update({status: 'catalogued', closet_item_id: item.id, updated_at: new Date().toISOString()}).eq('id', b.scan_id);
  return {scan_id: b.scan_id, closet_item_id: item.id};
});
