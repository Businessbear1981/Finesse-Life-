import {createContext, useContext} from 'react';
import {useWindowDimensions} from 'react-native';

/** Width available to room content. The hotel shell narrows it (rails on both sides). */
export const ContentWidth = createContext<number | null>(null);
export function useAvailableWidth() {
  const ctx = useContext(ContentWidth);
  const {width} = useWindowDimensions();
  return ctx ?? width - 40;
}
