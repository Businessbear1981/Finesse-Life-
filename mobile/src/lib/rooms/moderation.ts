// Member safety (Apple 1.2 / Play UGC) — the app's side of src/lib/moderation.ts and the routes
// POST /api/moderation/report, POST|DELETE /api/moderation/block, GET /api/moderation/blocks and
// GET /api/moderation/reports, GET|POST /api/account/accept-terms (all bearer-aware). Keep the kinds / reasons in step with the web.
import {API_BASE, api} from '../api';

export const REPORT_KINDS = ['post', 'vip_post', 'profile', 'listing', 'club_table', 'outing', 'look', 'nova_reply'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export type ReportReason = 'spam' | 'harassment' | 'hate' | 'sexual' | 'violence' | 'self_harm' | 'illegal' | 'impersonation' | 'scam' | 'other';
/** In picker order. */
export const REPORT_REASONS: Array<[ReportReason, string]> = [
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate speech or slurs'],
  ['sexual', 'Sexual content or solicitation'],
  ['violence', 'Threats or violence'],
  ['self_harm', 'Self-harm or suicide'],
  ['scam', 'Scam or fraud'],
  ['spam', 'Spam'],
  ['impersonation', 'Impersonation'],
  ['illegal', 'Illegal goods or activity'],
  ['other', 'Something else'],
];

export const TERMS_URL = `${API_BASE}/terms`;
export const REPORTED_MESSAGE = 'Thank you. The house reviews every report within 24 hours and removes content that breaks the rules.';

type Err = {error?: string; message?: string};

export const reportContent = (target_kind: ReportKind, target_id: string, reason: ReportReason, note?: string) =>
  api<{reported?: boolean; already?: boolean} & Err>('/api/moderation/report', {method: 'POST', json: {target_kind, target_id, reason, note: note?.trim() || undefined}});

export const blockMember = (member_id: string) =>
  api<{blocked?: boolean} & Err>('/api/moderation/block', {method: 'POST', json: {member_id}});

/** Block whoever owns an item when the app doesn't know their id (Game Room tables hide the host's id). */
export const blockOwnerOf = (target_kind: Exclude<ReportKind, 'nova_reply'>, target_id: string) =>
  api<{blocked?: boolean} & Err>('/api/moderation/block', {method: 'POST', json: {target_kind, target_id}});

export const unblockMember = (member_id: string) =>
  api<{unblocked?: boolean} & Err>(`/api/moderation/block?member_id=${encodeURIComponent(member_id)}`, {method: 'DELETE'});

export const readBlocks = () => api<{blocks?: Array<{member_id: string; name: string; blocked_at: string}>} & Err>('/api/moderation/blocks');

export type MyReport = {id: string; target_kind: ReportKind; target_id: string; reason: ReportReason; note: string | null; status: 'open' | 'actioned' | 'dismissed'; status_label: string; created_at: string};
/** The member's own reports and where each one stands (GET /api/moderation/reports). */
export const readMyReports = () => api<{reports?: MyReport[]} & Err>('/api/moderation/reports');

/** Member-facing noun for each report kind. */
export const REPORT_NOUN: Record<ReportKind, string> = {post: 'Post', vip_post: 'VIP post', profile: 'Profile', listing: 'Listing', club_table: 'Game Room table', outing: 'Outing', look: 'Wardrobe look', nova_reply: 'Nova reply'};

export const readTerms = () => api<{accepted?: boolean} & Err>('/api/account/accept-terms');
export const acceptTerms = () => api<{accepted?: boolean} & Err>('/api/account/accept-terms', {method: 'POST', json: {accept: true}});

/** True when a write failed only because the member hasn't accepted the house rules yet. */
export const needsTerms = (r: {status: number; body: Err}) => r.status === 403 && r.body.error === 'terms_required';
