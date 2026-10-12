import {memberRoute, must} from '@/lib/room-api';

// GET /api/diary?day=YYYY-MM-DD → the day's entries; "needs_you" items first.
export const GET = memberRoute(async (req, {db}) => {
  const day = new URL(req.url).searchParams.get('day') ?? new Date().toISOString().slice(0, 10);
  const items = must(await db.from('diary_items').select('id, day, title, room, status, detail, decided_at').eq('day', day).order('created_at'));
  const rank = (s: string) => (s === 'needs_you' ? 0 : s === 'held' ? 1 : 2);
  return {day, items: [...(items as {status: string}[])].sort((a, b) => rank(a.status) - rank(b.status))};
});
