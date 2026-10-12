import {z} from 'zod';
import {body, memberRoute, must} from '@/lib/room-api';

const Patch = z.object({title: z.string().min(1).max(200).optional(), day: z.iso.date().optional(), detail: z.record(z.string(), z.unknown()).optional()});
export const PATCH = memberRoute(async (req, {db}, {id}) => {
  const b = await body(req, Patch);
  const moved = b.day ? {status: 'moved'} : {};
  return must(await db.from('diary_items').update({...b, ...moved, updated_at: new Date().toISOString()}).eq('id', id!).select('*').single(), true);
});
