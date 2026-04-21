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
 * - On web, back button gains `cursor-pointer`; title is non-selectable.
 * - Styling uses design tokens (light/dark text & bg) from tailwind.config.js.
 */
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
        className="flex-1 text-center text-2xl font-bold text-light-text dark:text-dark-text mr-10"
        numberOfLines={1}
        selectable={false}
      >
        {title}
      </Text>

      {rightComponent && (
        <View className="absolute right-[15px]">
          {rightComponent}
        </View>
      )}
    </View>
  );
};
