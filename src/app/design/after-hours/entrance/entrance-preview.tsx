'use client';

import {EntranceView, type EntranceViewProps} from '../../../entrance-view';

const base: EntranceViewProps = {
  digits: [], flash: null, error: false, message: '', verifying: false, preview: false,
  opening: false, lightFlood: false, showChoice: false, reduceMotion: true,
};

const STEPS: Record<string, Partial<EntranceViewProps>> = {
  idle: {forceFocus: true},
  typing: {digits: ['4', '1', '8'], flash: 2, forceFocus: true},
  preview: {digits: ['2', '7'], preview: true, forceFocus: true},
  error: {digits: ['1', '2', '3', '4', '5', '6'], error: true, message: 'Not on the list. Check your invitation and try again.'},
  lockout: {digits: ['9', '9', '9', '9', '9', '9'], error: true, message: 'The door is resting. Try again in a few minutes.'},
  verifying: {digits: ['4', '1', '8', '2', '0', '6'], verifying: true},
  opening: {digits: ['4', '1', '8', '2', '0', '6'], opening: true},
  choose: {digits: ['4', '1', '8', '2', '0', '6'], opening: true, lightFlood: true, showChoice: true},
};

export function EntrancePreview({step}: {step: string}) {
  return <EntranceView {...base} {...(STEPS[step] ?? STEPS.idle)} />;
}
