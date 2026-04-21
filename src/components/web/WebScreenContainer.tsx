import React from 'react';
import { View, ViewStyle } from 'react-native';

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
 *
 * maxWidth/paddingHorizontal are numeric props (not class names) because they
 * vary per screen — we pass them through `style` rather than creating a
 * class for each possible width.
 */
export default function WebScreenContainer({
  children,
  maxWidth = 820,
  paddingHorizontal = 24,
  style,
  contentStyle,
}: WebScreenContainerProps) {
  return (
    <View className="flex-1 items-center bg-light-bg dark:bg-dark-bg" style={style}>
      <View
        className="flex-1 w-full"
        style={[{ maxWidth, paddingHorizontal }, contentStyle]}
      >
        {children}
      </View>
    </View>
  );
}
