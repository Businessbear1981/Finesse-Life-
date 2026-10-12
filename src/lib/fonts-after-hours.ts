import {Anton, Inter_Tight, Instrument_Serif} from 'next/font/google';

// "After Hours" type: Instrument Serif (display italics), Inter Tight (UI), Anton (condensed accents).
export const afterHoursSerif = Instrument_Serif({subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--d-serif'});
export const afterHoursSans = Inter_Tight({subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--d-sans'});
export const afterHoursCondensed = Anton({subsets: ['latin'], weight: '400', variable: '--d-cond'});
export const afterHoursFonts = `${afterHoursSerif.variable} ${afterHoursSans.variable} ${afterHoursCondensed.variable}`;
