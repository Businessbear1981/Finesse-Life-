export const C = {
  ground: '#0A0406',
  ink: '#0A0807',
  panel: '#12080A',
  brass: '#C9A961',
  gold: '#E8C87A',
  goldHi: '#F0D88A',
  goldHot: '#FFF1C2',
  brassDeep: '#8A6A2A',
  brassDark: '#5A4018',
  brassShadow: '#3A2610',
  cream: '#F4E8D0',
  creamMuted: 'rgba(244,232,208,0.7)',
  parchment: '#F2E8D2',
  parchmentLo: '#E8DBBE',
  parchmentInk: '#1A120C',
  parchmentMuted: '#5A4630',
  oxblood: '#6B1424',
  her: '#FF4D7D',
  herTint: '#FF8FA9',
  him: '#FFA96B',
  himTint: '#FFD2B0',
  lampOn: '#00FF88',
  lampOff: 'rgba(244,232,208,0.12)',
  rule: 'rgba(201,169,97,0.4)',
};

export const F = {
  display: 'PlayfairDisplay_800ExtraBold_Italic',
  displaySemi: 'PlayfairDisplay_600SemiBold_Italic',
  displayReg: 'PlayfairDisplay_400Regular_Italic',
  caps: 'Cinzel_700Bold',
  capsSemi: 'Cinzel_600SemiBold',
  deco: 'Marcellus_400Regular',
  serif: 'CormorantGaramond_500Medium_Italic',
  sans: 'Manrope_400Regular',
  sansMed: 'Manrope_500Medium',
  sansBold: 'Manrope_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
};

export type Side = 'her' | 'him';
export const accent = (s: Side) => (s === 'him' ? C.him : C.her);
export const tint = (s: Side) => (s === 'him' ? C.himTint : C.herTint);
export const brand = (s: Side) => (s === 'him' ? 'Carpe Diem' : 'Finesse');

export const goldGradient = ['#F6E2A0', C.brass, '#A47A34'] as const;
export const brassBar = ['#1E1408', '#4A3416', '#6B5028', '#4A3416', '#1E1408'] as const;
