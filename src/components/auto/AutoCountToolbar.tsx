import React from 'react';
import { View, Text, TouchableHighlight, Image, useWindowDimensions } from 'react-native';
import { SortToggle, type SortMode } from './SortToggle';

interface AutoCountToolbarProps {
  count: number;
  onAddPress: () => void;
  /**
   * Sort mode controls. Both must be provided together to render the
   * toggle — omitting them keeps the toolbar in its pre-sort-toggle form.
   */
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
}

const NARROW_BREAKPOINT = 520;

/**
 * Toolbar row above the auto list: vehicle count on the left, sort toggle
 * in the middle (when `sortMode`/`onSortModeChange` are provided), and
 * "Добавить авто" action on the right. Cross-platform.
 *
 * Layout strategy:
 *   - Wide viewport (>= 520px): single row, three items spaced with the
 *     toggle centered between count and action.
 *   - Narrow viewport (< 520px, typical mobile portrait): two rows —
 *     count + action on the top row, toggle centered on the second row.
 *
 * Using `useWindowDimensions` instead of NativeWind responsive variants
 * keeps behaviour consistent across RN and RN-Web; some Tailwind
 * responsive prefixes don't round-trip through NativeWind reliably for
 * conditional `flex-wrap` interactions.
 */
export default function AutoCountToolbar({
  count,
  onAddPress,
  sortMode,
  onSortModeChange,
}: AutoCountToolbarProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < NARROW_BREAKPOINT;
  const showSortToggle = sortMode !== undefined && onSortModeChange !== undefined;

  return (
    <View className="px-4 py-2 bg-white border-b border-[#E8E8E8]">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] text-text-secondary select-none">
          Всего {count || 0} авто
        </Text>

        {showSortToggle && !isNarrow && (
          <View className="flex-1 flex-row justify-center mx-3">
            <SortToggle mode={sortMode!} onChange={onSortModeChange!} compact />
          </View>
        )}

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

      {showSortToggle && isNarrow && (
        <View className="flex-row justify-center mt-2">
          <SortToggle mode={sortMode!} onChange={onSortModeChange!} compact />
        </View>
      )}
    </View>
  );
}
