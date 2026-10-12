import {memberRoute, must} from '@/lib/room-api';

export const GET = memberRoute(async (_req, {db}, {id}) => must(await db.from('camera_scans').select('*').eq('id', id!).single(), true));
