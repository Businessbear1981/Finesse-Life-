// Nova (the concierge): shared types and option lists. Used by the hook, the view and the design preview.

import type {NovaRequest} from '@/lib/nova-request-view';

export interface AvatarConfig {
  name: string;
  gender: 'female' | 'male' | 'neutral';
  look: string;
  voice: string;
}

export type SetupStep = 'gender' | 'look' | 'voice' | 'name' | 'done';
export const SETUP_STEPS: Exclude<SetupStep, 'done'>[] = ['gender', 'look', 'voice', 'name'];

export interface ToolCallResult {
  name: string;
  result: unknown;
}

export interface Message {
  id: string;
  role: 'concierge' | 'guest' | 'system';
  text: string;
  action?: string;
  tool_calls?: ToolCallResult[];
  /** Requests Nova drafted this turn (draft_request tool) — rendered as confirm cards. */
  requests?: NovaRequest[];
}

export type Option = {key: string; label: string; desc: string};

export const GENDER_OPTIONS: Option[] = [
  {key: 'female', label: 'Female', desc: 'She / her'},
  {key: 'male', label: 'Male', desc: 'He / him'},
  {key: 'neutral', label: 'Neutral', desc: 'They / them'},
];

export const LOOK_OPTIONS: Record<string, Option[]> = {
  female: [
    {key: 'executive', label: 'Executive', desc: 'Tailored suit, minimal jewelry, sharp'},
    {key: 'glam', label: 'Glam', desc: 'Red lip, gold accents, confident'},
    {key: 'casual-chic', label: 'Casual Chic', desc: 'Effortless, relaxed, modern'},
    {key: 'futuristic', label: 'Futuristic', desc: 'Sleek, cyberpunk edge, neon accents'},
  ],
  male: [
    {key: 'executive', label: 'Executive', desc: 'Dark suit, clean lines, authoritative'},
    {key: 'streetwear', label: 'Streetwear', desc: 'Designer casual, fresh, approachable'},
    {key: 'classic', label: 'Classic', desc: 'Timeless, old-money, understated'},
    {key: 'futuristic', label: 'Futuristic', desc: 'Tech-forward, minimal, sharp'},
  ],
  neutral: [
    {key: 'minimalist', label: 'Minimalist', desc: 'Clean, androgynous, modern'},
    {key: 'artistic', label: 'Artistic', desc: 'Creative, expressive, bold'},
    {key: 'professional', label: 'Professional', desc: 'Polished, neutral, trustworthy'},
    {key: 'futuristic', label: 'Futuristic', desc: 'Digital, abstract, AI-forward'},
  ],
};

export const VOICE_OPTIONS: Record<string, Option[]> = {
  female: [
    {key: 'warm', label: 'Warm', desc: 'Smooth, reassuring, like a late-night host'},
    {key: 'confident', label: 'Confident', desc: 'Direct, polished, CEO energy'},
    {key: 'soft', label: 'Soft', desc: 'Gentle, calm, ASMR-adjacent'},
    {key: 'playful', label: 'Playful', desc: 'Witty, quick, charming'},
  ],
  male: [
    {key: 'deep', label: 'Deep', desc: 'Rich baritone, authoritative, Morgan Freeman'},
    {key: 'smooth', label: 'Smooth', desc: 'Radio DJ, late-night, velvet'},
    {key: 'crisp', label: 'Crisp', desc: 'Clear, precise, British concierge'},
    {key: 'casual', label: 'Casual', desc: 'Relaxed, friendly, bartender energy'},
  ],
  neutral: [
    {key: 'balanced', label: 'Balanced', desc: 'Even-toned, clear, professional'},
    {key: 'calm', label: 'Calm', desc: 'Meditative, steady, grounding'},
    {key: 'bright', label: 'Bright', desc: 'Energetic, upbeat, helpful'},
    {key: 'digital', label: 'Digital', desc: 'Slightly synthesized, futuristic AI'},
  ],
};

/** Quick asks: tapping one sends its prompt straight away (as the old quick actions did). */
export const QUICK_ASKS: {key: string; label: string; prompt: string}[] = [
  {key: 'table', label: 'A table for four tonight', prompt: 'A table for four tonight'},
  {key: 'look', label: 'Pull a look', prompt: 'Pull a look for tonight — help me find something to wear'},
  {key: 'route', label: 'Plan the route', prompt: 'Plan the route for my night'},
  {key: 'car', label: 'A black car', prompt: 'I need a black car'},
  {key: 'travel', label: 'Plan a trip', prompt: 'Help me plan a trip'},
  {key: 'appointment', label: 'An appointment', prompt: 'Schedule an appointment'},
  {key: 'reminder', label: 'A reminder', prompt: 'Set a reminder'},
];

/** `?q=` prefill: plain text only, trimmed and capped. Never sent automatically. */
export function sanitizePrefill(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 280);
}
