import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type ZoneTab = 'mkad' | 'ttk' | 'sk' | '';

interface ZoneTabsProps {
  value: ZoneTab;
  onToggle: (tab: Exclude<ZoneTab, ''>) => void;
}

const TABS: { key: Exclude<ZoneTab, ''>; label: string }[] = [
  { key: 'mkad', label: 'МКАД' },
  { key: 'ttk',  label: 'ТТК'  },
  { key: 'sk',   label: 'СК'   },
];

/**
 * Three zone tabs for pass ordering. Selecting the active tab unsets it.
 * Equal-width buttons in a row with gap. Works identically on mobile and web.
 * On web adds `cursor-pointer` and `select-none` (no-op on native).
 */
export default function ZoneTabs({ value, onToggle }: ZoneTabsProps) {
  return (
    <View className="flex-row gap-2.5">
      {TABS.map(tab => {
        const active = value === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={`Зона ${tab.label}`}
            accessibilityState={{ selected: active }}
            className={`flex-1 h-[50px] items-center justify-center rounded-lg cursor-pointer select-none ${
              active ? 'bg-bg-elevated' : 'bg-bg-secondary'
            }`}
            onPress={() => onToggle(tab.key)}
          >
            <Text className="text-[15px] font-bold text-text-primary select-none">{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
