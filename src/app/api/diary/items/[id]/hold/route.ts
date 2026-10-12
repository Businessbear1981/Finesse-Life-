import {memberRoute, must, HttpError} from '@/lib/room-api';

export const POST = memberRoute(async (_req, {db}, {id}) => {
  const cur = must(await db.from('diary_items').select('status').eq('id', id!).maybeSingle());
  if (!cur) throw new HttpError(404, 'not found');
  if (!['needs_you', 'held', 'moved'].includes((cur as {status: string}).status)) throw new HttpError(409, 'item does not need a decision');
  return must(await db.from('diary_items').update({status: 'held', decided_at: new Date().toISOString(), updated_at: new Date().toISOString()}).eq('id', id!).select('*').single());
});
