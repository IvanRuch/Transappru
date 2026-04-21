import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface AutoListFilterChipsProps {
  /** Pre-formatted strings from useAutoList.getActiveFiltersText(). */
  filters: string[];
  onEdit: () => void;
  onClearAll: () => void;
  /** Default "Активные фильтры:". Mobile uses this, web uses "Фильтры:". */
  label?: string;
}

/**
 * Horizontal chips row showing which filters are currently applied, with
 * "Изменить" / "Сбросить" action links. Hidden when there are no filters —
 * the caller is expected to only render this when filters exist.
 */
export default function AutoListFilterChips({
  filters, onEdit, onClearAll, label = 'Активные фильтры:',
}: AutoListFilterChipsProps) {
  return (
    <View className="flex-row items-center flex-wrap px-4 py-2 bg-bg-secondary border-b border-border-primary gap-1.5">
      <Text className="text-xs text-text-secondary mr-2 select-none">{label}</Text>

      {filters.map((f, i) => (
        <View
          key={i}
          className="bg-white rounded-[10px] px-2.5 py-0.5 border border-accent-secondary"
        >
          <Text className="text-[11px] text-accent-secondary font-medium select-none">{f}</Text>
        </View>
      ))}

      <TouchableOpacity onPress={onEdit} className="px-1.5 py-0.5">
        <Text className="text-[11px] font-bold text-accent-secondary select-none">Изменить</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClearAll} className="px-1.5 py-0.5">
        <Text className="text-[11px] font-bold text-status-error select-none">Сбросить</Text>
      </TouchableOpacity>
    </View>
  );
}
