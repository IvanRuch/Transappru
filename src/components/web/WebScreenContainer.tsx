import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface WebScreenContainerProps {
  children: React.ReactNode;
  /** Max content width in pixels. Default 820 — comfortable reading width for forms. */
  maxWidth?: number;
  /** Horizontal padding inside the container. Default 24. */
  paddingHorizontal?: number;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Centers screen content on desktop with a max-width constraint, collapses to
 * full-width on narrow viewports. Intended for web-only screens that live inside
 * WebAppLayout. On mobile (React Native), this file is not used.
 */
export default function WebScreenContainer({
  children,
  maxWidth = 820,
  paddingHorizontal = 24,
  style,
  contentStyle,
}: WebScreenContainerProps) {
  return (
    <View style={[styles.outer, style]}>
      <View style={[styles.inner, { maxWidth, paddingHorizontal }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
