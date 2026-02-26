import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'web_sidebar_expanded';

/**
 * Manages the expanded/collapsed state of the web sidebar.
 * Persists the user's preference across sessions via AsyncStorage.
 */
export function useWebSidebar(defaultExpanded = true) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Restore preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val !== null) setExpanded(val === 'true');
    });
  }, []);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next));
  };

  const setExpanded_ = (value: boolean) => {
    setExpanded(value);
    AsyncStorage.setItem(STORAGE_KEY, String(value));
  };

  return { expanded, toggle, setExpanded: setExpanded_ };
}
