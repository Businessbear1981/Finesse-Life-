// Store-release switches. Release builds (App Store / Play) only show what a reviewer can complete end to end;
// dev builds keep everything visible for the team. Flip a flag once its partner / store requirement is met.
import {hotelId, manifestId} from './room-ids';

/** True in store builds (and when EXPO_PUBLIC_STORE_PREVIEW=1, to preview the store build in dev). */
export const IS_STORE_BUILD = !__DEV__ || process.env.EXPO_PUBLIC_STORE_PREVIEW === '1';

export const RELEASE = {
  /**
   * VIP (Penthouse, VIP feed, lift) is a digital membership sold on the web. Apple 3.1.1 / Play Billing require
   * in-app purchase for digital goods unlocked in the app, so the store build hides VIP-gated features until
   * IAP / Play Billing exists (founder decision pending). No purchase or "buy on the web" copy anywhere in the app.
   */
  vip: !IS_STORE_BUILD,
  /** The Vault presents a prepaid card — hidden until a licensed issuer is live and named. */
  vault: !IS_STORE_BUILD,
  /** Rooms that can't complete their primary action yet. */
  backstage: !IS_STORE_BUILD,
  /** Lounge "After Dark" (dating) and "Score" — need a full dating-safety set before they can ship. */
  loungeAfterDark: !IS_STORE_BUILD,
  loungeScore: !IS_STORE_BUILD,
  /** Jazz Club live audio + tips need LiveKit and a payout partner. */
  jazzLive: !IS_STORE_BUILD,
  /** Lab studios aren't open yet (the room is hidden until they are). */
  labStudios: !IS_STORE_BUILD,
  /** The Club is sample-only (news, market data and the board service aren't connected) — hidden until they are. */
  club: !IS_STORE_BUILD,
  /** Gym "Scan": food recognition needs a nutrition partner — the tab can't do anything yet. */
  foodScan: !IS_STORE_BUILD,
  /** Gym "Wellness": prescription programmes need a licensed clinician partner — nothing can be started yet. */
  wellness: !IS_STORE_BUILD,
  /** Switchboard connects social networks — no network's sign-in is open yet, so nothing can be connected. */
  switchboard: !IS_STORE_BUILD,
} as const;

/** Rooms hidden from navigation in the store build (manifest ids; hotel ids that differ are mapped below). */
export const HIDDEN_ROOMS: ReadonlySet<string> = new Set([
  ...(RELEASE.vault ? [] : ['vault']),
  ...(RELEASE.backstage ? [] : ['backstage']),
  ...(RELEASE.vip ? [] : ['vip-room', 'penthouse']),
  ...(RELEASE.labStudios ? [] : ['lab']),
  ...(RELEASE.club ? [] : ['club']),
  ...(RELEASE.switchboard ? [] : ['switchboard']),
]);

/**
 * True when a room may appear in any navigation surface (rails, dock, Lobby, directory) and open from a link.
 * Accepts hotel ids (perdiem, profile) as well as manifest ids (per-diem, this-is-you).
 */
export const isRoomVisible = (id: string): boolean => !HIDDEN_ROOMS.has(manifestId(id)) && !HIDDEN_ROOMS.has(hotelId(id));
