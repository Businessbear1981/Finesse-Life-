/** This Is You — projection allowlists. Hidden/sensitive fields can never be projected. */
import {z} from 'zod';

/** Fields a member MAY choose to show other members. */
export const PROJECTABLE_FIELDS = ['display_name', 'username', 'avatar_url', 'vibe', 'bio', 'city', 'interests'] as const;
/** Never projectable, never serialized to another member (spend, scores, DNA, contact, VIP status). */
export const NEVER_PROJECTED = ['email', 'age', 'gender', 'is_vip', 'vip_expires_at', 'telegram_chat_id', 'telegram_handle', 'nightvision_data', 'style_dna', 'nova_persona'] as const;

export const projectionsSchema = z.object({
  publicFields: z.array(z.enum(PROJECTABLE_FIELDS)).max(PROJECTABLE_FIELDS.length),
});

export const visibilitySchema = z.object({
  lounge: z.enum(['members', 'nobody']).optional(),
  profile_traffic: z.literal('self').optional(),          // traffic analytics are the member's alone
  backstage: z.enum(['vip_grant_only', 'nobody']).optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to change');

export const DEFAULT_PROJECTION = {
  public_fields: ['display_name', 'avatar_url', 'vibe'] as string[],
  visibility: {lounge: 'members', profile_traffic: 'self', backstage: 'vip_grant_only'} as Record<string, string>,
};

/** Data the member may delete from This Is You. */
export const DELETABLE = {
  camera_item: 'camera_items',
  diary_item: 'diary_items',
  ballroom_evening: 'ballroom_evenings',
  missing_piece: 'closet_missing_pieces',
  wardrobe_look: 'wardrobe_looks',
} as const;
export type DeletableKind = keyof typeof DELETABLE;
