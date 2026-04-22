import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  rightComponent?: React.ReactNode;
}

/**
 * Standard screen header: back button on the left, centered title, optional
 * right slot. Works identically on mobile and web.
 *
 * Layout uses a proper 3-column flex row:
 *   [back]  [flex-1 title]  [right slot OR spacer]
 * The spacer is a small invisible View that keeps the title visually
 * centered when there is no right component. When the right component
 * is wider than the back button, the title slides left to make room
 * (no more overlap with rightComponent like under the old
 * `absolute right-[15px]` positioning).
 *
 * - On web, back button gains `cursor-pointer`; title is non-selectable.
 * - Styling uses design tokens (light/dark text & bg) from tailwind.config.js.
 */
const RIGHT_SPACER_WIDTH = 40; // mirrors the visual weight of the back button

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, rightComponent }) => {
  return (
    <View className="flex-row items-center px-[15px] py-2.5 bg-light-bg dark:bg-dark-bg">
      <Pressable
        className="p-2 mr-2.5 cursor-pointer"
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Назад"
        hitSlop={8}
      >
        <Image
          source={require('../../../assets/images/back_2.png')}
          accessibilityIgnoresInvertColors
        />
      </Pressable>

      <Text
        className="flex-1 text-center text-2xl font-bold text-light-text dark:text-dark-text"
        numberOfLines={2}
        ellipsizeMode="tail"
        selectable={false}
      >
        {title}
      </Text>

      {rightComponent ? (
        <View className="ml-2.5">{rightComponent}</View>
      ) : (
        <View style={{ width: RIGHT_SPACER_WIDTH }} />
      )}
    </View>
  );
};
