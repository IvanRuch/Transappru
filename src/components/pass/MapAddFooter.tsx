import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

interface MapAddFooterProps {
  /** Whether the footer button should be visible (usually when an address is committed-ready). */
  visible: boolean;
  onPress: () => void;
  /** Default: "Добавить". */
  label?: string;
}

/**
 * Floating "Добавить" button anchored to the bottom of the map screen.
 * Cross-platform; respects iOS safe-area bottom inset. Hidden when the
 * parent decides the commit action is unreachable (no pin / stale data).
 */
export default function MapAddFooter({ visible, onPress, label = 'Добавить' }: MapAddFooterProps) {
  if (!visible) return null;

  return (
    <SafeAreaInsetsContext.Consumer>
      {(insets) => (
        <View
          className="absolute left-2.5 right-2.5 z-10"
          style={{ bottom: Math.max(insets?.bottom || 0, 20), elevation: 3 }}
        >
          <Pressable
            className="h-[50px] m-6 rounded items-center justify-center bg-accent-secondary cursor-pointer"
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text className="text-2xl text-white select-none">{label}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaInsetsContext.Consumer>
  );
}
