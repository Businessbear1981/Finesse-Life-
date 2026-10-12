// The hotel shell and the 31-room manifest grew slightly different ids for the same rooms. This keeps them
// agreeing without renaming anything a member sees: hotel id ⇄ manifest id.
const HOTEL_TO_MANIFEST: Record<string, string> = {perdiem: 'per-diem', profile: 'this-is-you'};
const MANIFEST_TO_HOTEL: Record<string, string> = Object.fromEntries(Object.entries(HOTEL_TO_MANIFEST).map(([h, m]) => [m, h]));

/** Manifest id for a hotel room id (unchanged when they already agree). */
export const manifestId = (hotelId: string) => HOTEL_TO_MANIFEST[hotelId] ?? hotelId;
/** Hotel room id for a manifest id or either alias (unchanged when they already agree). */
export const hotelId = (id: string) => MANIFEST_TO_HOTEL[id] ?? id;
