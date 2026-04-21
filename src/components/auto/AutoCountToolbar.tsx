import React from 'react';
import { View, Text, TouchableHighlight, Image } from 'react-native';

interface AutoCountToolbarProps {
  count: number;
  onAddPress: () => void;
}

/**
 * Toolbar row above the auto list: vehicle count on the left, "Добавить авто"
 * action on the right. Cross-platform.
 */
export default function AutoCountToolbar({ count, onAddPress }: AutoCountToolbarProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-2 bg-white border-b border-[#E8E8E8]">
      <Text className="text-[13px] text-text-secondary select-none">
        Всего {count || 0} авто
      </Text>
      <TouchableHighlight
        activeOpacity={1}
        underlayColor="#F0F0F0"
        onPress={onAddPress}
        accessibilityRole="button"
        accessibilityLabel="Добавить авто"
      >
        <View className="flex-row items-center px-3 py-1.5 gap-1.5">
          <Text className="text-[13px] text-text-primary select-none">Добавить авто</Text>
          <Image source={require('../../../assets/images/edit_2.png')} accessibilityIgnoresInvertColors />
        </View>
      </TouchableHighlight>
    </View>
  );
}
