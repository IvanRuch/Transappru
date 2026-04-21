import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';

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
 */
export default function ZoneTabs({ value, onToggle }: ZoneTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map(tab => {
        const active = value === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={`Зона ${tab.label}`}
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onToggle(tab.key)}
          >
            <Text style={styles.label} selectable={false}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  tab: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' as any, userSelect: 'none' as any },
    }),
  },
  tabActive: { backgroundColor: '#D7D7D7' },
  label: { fontSize: 15, fontWeight: '700', color: '#313131' },
});
