// Finesse Vault card finishes (founder decision 2026-10-12): Nano Black, Platinum, Rose Gold.
// A finish is the member's choice of card colour — not a membership tier. Keep in sync with
// mobile/src/lib/card-finishes.ts.

export type CardFinish = 'nano_black' | 'platinum' | 'rose_gold';

export const CARD_FINISHES: Record<CardFinish, {
  label: string;
  /** CSS gradient for the card face */
  face: string;
  /** gradient stops (mobile SVG uses these) */
  stops: [string, string, string, string];
  /** primary text colour on the card */
  ink: string;
  /** secondary/muted text colour on the card */
  inkSoft: string;
  /** small swatch colour for pickers */
  swatch: string;
}> = {
  nano_black: {
    label: 'Nano Black',
    face: 'linear-gradient(135deg, #2B2B2E 0%, #0B0B0D 38%, #1C1C1F 68%, #050506 100%)',
    stops: ['#2B2B2E', '#0B0B0D', '#1C1C1F', '#050506'],
    ink: 'rgba(232,230,224,0.92)',
    inkSoft: 'rgba(232,230,224,0.45)',
    swatch: '#111113',
  },
  platinum: {
    label: 'Platinum',
    face: 'linear-gradient(135deg, #F4F4F2 0%, #B9BCC2 38%, #E6E7E9 68%, #8E9298 100%)',
    stops: ['#F4F4F2', '#B9BCC2', '#E6E7E9', '#8E9298'],
    ink: 'rgba(26,28,32,0.88)',
    inkSoft: 'rgba(26,28,32,0.45)',
    swatch: '#D9DBDF',
  },
  rose_gold: {
    label: 'Rose Gold',
    face: 'linear-gradient(135deg, #F2C9B8 0%, #B76E79 38%, #E8B4A0 68%, #8E4B55 100%)',
    stops: ['#F2C9B8', '#B76E79', '#E8B4A0', '#8E4B55'],
    ink: 'rgba(42,16,20,0.88)',
    inkSoft: 'rgba(42,16,20,0.45)',
    swatch: '#C98B86',
  },
};

export const CARD_FINISH_ORDER: CardFinish[] = ['nano_black', 'platinum', 'rose_gold'];
export const DEFAULT_CARD_FINISH: CardFinish = 'nano_black';

export const isCardFinish = (v: unknown): v is CardFinish =>
  typeof v === 'string' && (CARD_FINISH_ORDER as string[]).includes(v);
