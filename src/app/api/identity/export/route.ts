import {NextResponse} from 'next/server';
import {memberRoute} from '@/lib/room-api';

// Data export (GDPR Art. 15/20, CCPA right to know): every member-owned table, read through RLS.
const TABLES = ['profiles', 'identity_projections', 'closet_items', 'closet_rotations', 'camera_scans', 'diary_items', 'ballroom_proposals', 'room_member_items', 'member_staff', 'interview_answers', 'scrapbook_entries', 'wardrobe_items', 'registry_items', 'posts'];
export const GET = memberRoute(async (_req, {db, user, trace}) => {
  const out: Record<string, unknown> = {exported_at: new Date().toISOString(), user_id: user.id, trace};
  for (const t of TABLES) {
    const r = await db.from(t).select('*');
    out[t] = r.error ? {unavailable: r.error.message} : r.data;
  }
  return new NextResponse(JSON.stringify(out, null, 2), {headers: {'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="finesse-export-${user.id}.json"`}});
});
