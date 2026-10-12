import {memberRoute, must} from '@/lib/room-api';

// Opens a scan record. Image bytes go to /api/camera/identify (multipart) — consent is the explicit capture.
export const POST = memberRoute(async (_req, {db, user}) => must(await db.from('camera_scans').insert({user_id: user.id}).select('id, status').single()));
