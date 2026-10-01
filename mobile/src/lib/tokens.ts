export const colors = {
  ink: '#080406',
  oxblood: '#17090D',
  burgundy: '#3A121B',
  brassShadow: '#6B5028',
  brass: '#C9A961',
  brassHighlight: '#E8C87A',
  cream: '#F4E8D0',
  finessePink: '#FF4D7D',
  carpeLamp: '#FFA96B',
} as const;

export const motionMs = { press: 180, room: 450, arrival: 900, doors: 1250 } as const;
export const touchTarget = 44;
export const trackAccent = (track: 'finesse' | 'carpe_diem') =>
  track === 'finesse' ? colors.finessePink : colors.carpeLamp;
