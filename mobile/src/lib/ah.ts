// After Hours — the Finesse look on mobile (mirrors web src/components/after-hours/after-hours.css).
// Noir + chrome, editorial serif italics, rose-gold heat. Luxury for 18–30 that anyone can use.

export const ah = {
  ink: '#050505',
  ink2: '#0C0C0E',
  ink3: '#141417',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
  text: '#EDEBE7',
  mute: '#8A8A8F',
  faint: '#5C5C62',
  rose: '#E8B4A0',
  rose2: '#B76E79',
  rose3: '#8E4B55',
  blush: '#F2C9B8',
  platinum: '#B9BCC2',
  ok: '#7EE2B8',
  warn: '#FFCF6E',
  danger: '#FF8AA0',
  white: '#FFFFFF',
} as const;

/** Gradient stops (for react-native-svg LinearGradient). */
export const chromeStops: Array<[number, string]> = [[0, '#FFFFFF'], [0.55, '#B9BCC2'], [1, '#6D7076']];
export const roseStops: Array<[number, string]> = [[0, '#F2C9B8'], [1, '#B76E79']];

export const ahFonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'InterTight_400Regular',
  sansMedium: 'InterTight_500Medium',
  sansSemi: 'InterTight_600SemiBold',
  sansBold: 'InterTight_700Bold',
  cond: 'Anton_400Regular',
} as const;

export const radius = {card: 24, hero: 28, pill: 999, input: 16} as const;
