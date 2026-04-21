import React from 'react';
import { View, Text } from 'react-native';

interface ManualZoneBannerProps {
  visible: boolean;
}

/**
 * Warns the user that the currently selected zone was changed manually and may
 * not match the coordinates picked on the map. Rendered only when `visible`.
 * Palette: tailwind tokens `warning.bg/border/text` (amber).
 */
export default function ManualZoneBanner({ visible }: ManualZoneBannerProps) {
  if (!visible) return null;
  return (
    <View
      className="mx-5 mb-[15px] p-2.5 rounded-[5px] border bg-warning-bg border-warning-border"
      accessibilityRole="alert"
    >
      <Text className="text-xs text-warning-text text-center">
        Зона изменена вручную. Убедитесь, что выбранная зона соответствует адресу.
      </Text>
    </View>
  );
}
