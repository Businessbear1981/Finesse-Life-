import 'server-only';
import {generateObject} from 'ai';
import {z} from 'zod';
import {model} from '@/lib/ai';

// Real image identification: the image bytes go to a vision model (via AI Gateway) and the answer is
// schema-validated. Low confidence is returned as such — the UI must never present a guess as fact.
export const Identified = z.object({
  title: z.string(),
  brand: z.string(),
  category: z.enum(['Bags', 'Shoes', 'Jewelry', 'Clothing', 'Beauty', 'Home', 'Travel', 'Watches', 'Other']),
  color: z.string().optional(),
  estimated_price_cents: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().describe('What in the image supports the identification (logos, hardware, stitching).'),
});
export type Identified = z.infer<typeof Identified>;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export async function identifyImage(file: File): Promise<Identified> {
  if (!TYPES.has(file.type)) throw new Error('unsupported image type');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('image too large');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const {object} = await generateObject({
    model: model(),
    schema: Identified,
    system: 'You identify fashion and luxury items from photos. Only state what the image supports. If unsure, lower confidence and say so in evidence. Prices are typical new retail in USD cents.',
    messages: [{role: 'user', content: [{type: 'text', text: 'Identify the main item in this photo.'}, {type: 'image', image: bytes, mediaType: file.type}]}],
  });
  return object;
}
