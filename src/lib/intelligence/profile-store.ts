// ─── Durable Behavioral Profile Store ────────────────────────────────────────
// buildBehavioralProfile() computes a fresh BehavioralProfile from raw signals
// on every call. This wraps that with a durable cache (member_profiles table,
// 20260803_member_profiles.sql) so repeated reads (Nova, recs, next-action
// prediction) don't all recompute from 250 raw signals, and gives future
// background/self-learning jobs something persistent to read and update.

import { createClient } from '@/lib/supabase/server';
import type { BehavioralProfile } from './types';

interface MemberProfileRow {
  id: string;
  user_id: string;
  profile: BehavioralProfile;
  version: number;
  updated_at: string;
  created_at: string;
}

export async function getStoredProfile(userId: string): Promise<MemberProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getStoredProfile]', error);
    return null;
  }
  return data as MemberProfileRow | null;
}

// Cache is considered fresh for 15 minutes — long enough to avoid recomputing
// on every Nova call in a session, short enough that "self-learning" still
// reflects recent behavior rather than going stale for days.
const FRESHNESS_MS = 15 * 60 * 1000;

export function isFresh(row: MemberProfileRow | null): boolean {
  if (!row) return false;
  return Date.now() - new Date(row.updated_at).getTime() < FRESHNESS_MS;
}

export async function persistProfile(
  userId: string,
  profile: BehavioralProfile,
): Promise<void> {
  const supabase = await createClient();
  const existing = await getStoredProfile(userId);
  const nextVersion = existing ? existing.version + 1 : 1;

  const { error } = await supabase.from('member_profiles').upsert(
    {
      user_id: userId,
      profile,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('[persistProfile]', error);
  }
}
