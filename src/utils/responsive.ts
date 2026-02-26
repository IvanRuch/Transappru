import { Platform, Dimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';

export const WEB_SIDEBAR_WIDTH_EXPANDED  = 240;
export const WEB_SIDEBAR_WIDTH_COLLAPSED = 56;
export const WEB_MAX_CONTENT_WIDTH = 1200;

/** Breakpoint: sidebar auto-collapses below this viewport width */
export const WEB_SIDEBAR_COLLAPSE_AT = 900;
/** Breakpoint: 2-column auto list below this, 3-column above WEB_MAX_CONTENT_WIDTH */
export const WEB_GRID_BREAK_2COL = 768;
/** Breakpoint: 4-column auto list (large monitors ≥ 27") */
export const WEB_GRID_BREAK_4COL = 1600;

export function getViewportWidth(): number {
  if (typeof window !== 'undefined') return window.innerWidth;
  return Dimensions.get('window').width;
}
