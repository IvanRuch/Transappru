import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import WebSidebar from './WebSidebar';
import { useWebSidebar } from '../../hooks/useWebSidebar';
import { useWebLayout } from '../../hooks/useWebLayout';

interface WebAppLayoutProps {
  children: React.ReactNode;
}

/**
 * Root layout for the authenticated web UI.
 * Renders a persistent left sidebar + scrollable main content area.
 *
 *  ┌─────────────────────────────────────────────────────┐
 *  │  Sidebar (fixed w)  │  Main content (flex: 1)       │
 *  └─────────────────────────────────────────────────────┘
 */
export default function WebAppLayout({ children }: WebAppLayoutProps) {
  const { expanded, toggle, setExpanded } = useWebSidebar();
  const { sidebarExpanded }               = useWebLayout();

  // Auto-collapse when viewport narrows; never auto-expand (user's choice)
  useEffect(() => {
    if (!sidebarExpanded) setExpanded(false);
  }, [sidebarExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveExpanded = expanded && sidebarExpanded;

  return (
    <View style={styles.root}>
      {/* Sidebar — fixed width, full height */}
      <WebSidebar expanded={effectiveExpanded} onToggle={toggle} />

      {/* Main content — fills the rest, each screen scrolls internally */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
  },
  content: {
    flex: 1,
  },
});
