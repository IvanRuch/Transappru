import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type SortMode = 'plate_digits' | 'lexicographic';

interface SortToggleProps {
  mode: SortMode;
  onChange: (mode: SortMode) => void;
  /** Optional smaller variant for tight layouts. */
  compact?: boolean;
}

/**
 * Two-option segmented control with a leading label: «Сортировка по
 * [алфавиту | номеру]». The genitive option labels read naturally
 * after the prefix.
 *
 * Shared across mobile and web (ADR-005). On web, react-native-web
 * renders Pressable as a focusable `<div>`; `accessibilityRole="radio"`
 * exposes the correct semantics for assistive technologies. Active
 * option has the accent fill, inactive options stay transparent with
 * the secondary text colour so the row reads as a single grouped
 * control even on busy toolbars.
 *
 * Used by AutoCountToolbar.
 */
export function SortToggle({ mode, onChange, compact = false }: SortToggleProps) {
  const paddingX = compact ? 'px-2' : 'px-3';
  const paddingY = compact ? 'py-1' : 'py-1.5';
  const fontSize = compact ? 'text-[11px]' : 'text-xs';

  return (
    <View className="flex-row items-center gap-2">
      <Text
        className={`${fontSize} text-text-secondary select-none`}
        numberOfLines={1}
      >
        Сортировка по
      </Text>
      <View
        className="flex-row items-center bg-bg-secondary rounded-lg p-0.5 border border-border-primary"
        accessibilityRole="radiogroup"
        accessibilityLabel="Сортировка списка авто"
      >
        <SortOption
          label="алфавиту"
          active={mode === 'lexicographic'}
          onPress={() => onChange('lexicographic')}
          paddingX={paddingX}
          paddingY={paddingY}
          fontSize={fontSize}
        />
        <SortOption
          label="номеру"
          active={mode === 'plate_digits'}
          onPress={() => onChange('plate_digits')}
          paddingX={paddingX}
          paddingY={paddingY}
          fontSize={fontSize}
        />
      </View>
    </View>
  );
}

interface SortOptionProps {
  label: string;
  active: boolean;
  onPress: () => void;
  paddingX: string;
  paddingY: string;
  fontSize: string;
}

function SortOption({ label, active, onPress, paddingX, paddingY, fontSize }: SortOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Сортировка по ${label}`}
      className={`${paddingX} ${paddingY} rounded-md ${active ? 'bg-accent-secondary' : 'bg-transparent'}`}
    >
      <Text
        className={`${fontSize} font-semibold select-none ${active ? 'text-white' : 'text-text-secondary'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
