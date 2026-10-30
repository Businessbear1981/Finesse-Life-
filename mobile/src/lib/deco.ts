// Palette + geometry helpers shared by the KeyLock, the Private Lift and the rooms.
// After Hours (Oct 2026): the historic "brass" keys now carry the chrome/platinum scale and "pink"
// carries rose gold, so every screen built on these tokens moved to the new look at once.
// New code should prefer `ah` (src/lib/ah.ts) for clearer names.
import {Easing} from 'react-native-reanimated';

export const deco = {
  ink: '#050505',
  oxblood: '#0C0C0E',
  burgundy: '#1A1517',
  brassDeep: '#2A2A2E',
  brassShadow: '#55575C',
  brassMid: '#8E9298',
  brass: '#B9BCC2',
  brassHighlight: '#EDEBE7',
  brassLight: '#E3E4E7',
  brassWhite: '#FFFFFF',
  cream: '#EDEBE7',
  champagne: '#F2C9B8',
  lamp: '#C9CCD2',
  pink: '#E8B4A0',
} as const;

// After Hours type: Instrument Serif italic (display/script), Inter Tight (labels, caps, body).
export const fonts = {
  display: 'InstrumentSerif_400Regular_Italic',
  displayBold: 'InstrumentSerif_400Regular_Italic',
  displayHeavy: 'InstrumentSerif_400Regular_Italic',
  label: 'InterTight_600SemiBold',
  caps: 'InterTight_600SemiBold',
  capsBold: 'InterTight_700Bold',
  script: 'InstrumentSerif_400Regular_Italic',
  body: 'InterTight_400Regular',
  bodyStrong: 'InterTight_600SemiBold',
  mono: 'InterTight_500Medium',
} as const;

/** Track accents: Finesse (her) rose gold, Carpe Diem (him) platinum. */
export const track = {
  her: {acc: deco.pink, soft: '#F2C9B8', deep: '#3A1A1E', name: 'Finesse'},
  him: {acc: deco.lamp, soft: '#E3E4E7', deep: '#1E2024', name: 'Carpe Diem'},
} as const;
export type Side = keyof typeof track;

// Cinematic ease from the Finesse motion spec: [0.16, 1, 0.3, 1].
export const easeCine = Easing.bezier(0.16, 1, 0.3, 1);
