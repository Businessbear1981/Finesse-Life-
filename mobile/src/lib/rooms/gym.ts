// The Gym, as the signed-in member: today's sets (/api/gym/today), the recovery read (/api/gym/recovery — from
// logged sets only; wearables aren't connected), the server-stamped rest timer and the planned week
// (/api/gym/sessions). A planned session is the member's note — nothing is booked with a studio.
import {api} from '../api';

type Err = {error?: string; message?: string};
export type GymSet = {id: string; exercise: string; reps: number | null; weight_kg: number | null; duration_s: number | null; rpe: number | null; rest_s: number | null; performed_at: string};
export type Recovery = {status: 'no_data' | 'ready' | 'recovering'; hoursSince: number | null; lastLoad: number; meanRpe?: number | null; hoursNeeded?: number; note: string};
export type GymToday = {today: GymSet[]; volumeKg: number; weekSessions: number; recovery: Recovery; healthSync: string};
export type SessionKind = 'class' | 'training' | 'recovery' | 'other';
export type GymSession = {id: string; day: string; at_time: string | null; kind: SessionKind; title: string; venue: string | null; notes: string | null; done: boolean};
export type GymWeek = {weekStart: string; days: string[]; sessions: GymSession[]; trainedDays: string[]};

export const RECOVERY_LABEL: Record<Recovery['status'], string> = {no_data: 'No sessions logged yet', ready: 'Ready', recovering: 'Recovering'};
export const KIND_LABEL: Record<SessionKind, string> = {class: 'Class', training: 'Training', recovery: 'Recovery', other: 'Other'};

export const readToday = () => api<GymToday & Err>('/api/gym/today');
export const readRecovery = () => api<{recovery?: Recovery; sources?: string[]; healthSync?: string} & Err>('/api/gym/recovery');
export const readWeek = () => api<GymWeek & Err>('/api/gym/sessions');
export const logSet = (b: {exercise: string; reps: number | null; weightKg: number | null; rpe: number | null; restS?: number | null}) =>
  api<{set?: GymSet} & Err>('/api/gym/sets', {method: 'POST', json: b});
export const deleteSet = (id: string) => api<Err>(`/api/gym/sets?id=${encodeURIComponent(id)}`, {method: 'DELETE'});
export const stampRest = (seconds: number) => api<{startedAt?: string; endsAt?: string} & Err>('/api/gym/rest-timer', {method: 'POST', json: {seconds}});
export const addSession = (b: {day: string; atTime?: string | null; kind: SessionKind; title: string; venue?: string | null}) =>
  api<{session?: GymSession} & Err>('/api/gym/sessions', {method: 'POST', json: b});
export const patchSession = (id: string, b: {done?: boolean}) => api<Err>(`/api/gym/sessions/${id}`, {method: 'PATCH', json: b});
export const deleteSession = (id: string) => api<Err>(`/api/gym/sessions/${id}`, {method: 'DELETE'});
