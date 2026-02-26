import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  getViewportWidth,
  WEB_GRID_BREAK_2COL,
  WEB_GRID_BREAK_4COL,
  WEB_MAX_CONTENT_WIDTH,
  WEB_SIDEBAR_COLLAPSE_AT,
} from '../utils/responsive';

export function useWebLayout() {
  const [width, setWidth] = useState(getViewportWidth);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    width,
    /** viewport >= 1200 */
    isDesktop:       width >= WEB_MAX_CONTENT_WIDTH,
    /** viewport 768–1199 */
    isTablet:        width >= WEB_GRID_BREAK_2COL && width < WEB_MAX_CONTENT_WIDTH,
    /** viewport < 768 */
    isMobileWeb:     width < WEB_GRID_BREAK_2COL,
    /** Sidebar should be in expanded mode */
    sidebarExpanded: width >= WEB_SIDEBAR_COLLAPSE_AT,
    /** FlatList column count for auto-list grid */
    columns:         width >= WEB_GRID_BREAK_4COL ? 4 : width >= WEB_MAX_CONTENT_WIDTH ? 3 : width >= WEB_GRID_BREAK_2COL ? 2 : 1,
  };
}
