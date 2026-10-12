import {memberRoute, HttpError} from '@/lib/room-api';

// DELETE /api/identity/data/:table — erase the member's rows in one deletable dataset (RLS limits it to their own).
const DELETABLE = new Set(['closet_items', 'closet_rotations', 'camera_scans', 'diary_items', 'ballroom_proposals', 'room_member_items', 'identity_projections', 'interview_answers', 'scrapbook_entries']);
export const DELETE = memberRoute(async (_req, {db, user}, {id}) => {
  if (!id || !DELETABLE.has(id)) throw new HttpError(400, `not deletable here: ${id}`);
  const r = await db.from(id).delete().eq('user_id', user.id);
  if (r.error) throw new HttpError(400, r.error.message);
  return {deleted: id};
});
