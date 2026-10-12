import {z} from 'zod';

export const TRIP_COLS = 'id, title, origin, destination, depart_at, return_at, party_size, status, brief, plan, nova_request_id, created_at, updated_at';
export const isUuid = (s: string) => z.string().uuid().safeParse(s).success;

