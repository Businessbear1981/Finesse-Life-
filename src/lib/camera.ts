/** The Camera — private visual intake. Photos are stored under a private key and only ever served by presigned URL. */
import {z} from 'zod';
import {presignGet} from '@/lib/r2';

export const CAMERA_SELECT = 'id, image_key, consent_at, label, category, brand_guess, confidence, model, state, routed_to, created_at, updated_at';

export type CameraRow = {
  id: string; image_key: string; consent_at: string; label: string | null; category: string | null;
  brand_guess: string | null; confidence: number | null; model: string | null; state: string;
  routed_to: string | null; created_at: string; updated_at: string;
};

export async function withViewUrl(row: CameraRow) {
  let viewUrl: string | null = null;
  try { viewUrl = await presignGet(row.image_key, 300); } catch { viewUrl = null; }
  const {image_key: _key, ...rest} = row;
  void _key;
  return {...rest, viewUrl};
}

/** What the vision model must return. Anything else ⇒ "unidentified", never a guess. */
export const identification = z.object({
  identified: z.boolean(),
  label: z.string().min(1).max(120).nullable(),
  category: z.enum(['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories', 'jewelry', 'beauty', 'home', 'other']).nullable(),
  brand_guess: z.string().max(80).nullable(),
  confidence: z.number().min(0).max(1),
});

export const CAMERA_ROUTES = ['closet', 'bag', 'exchange', 'scale', 'embassy'] as const;
