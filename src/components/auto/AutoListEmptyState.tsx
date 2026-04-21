import React from 'react';
import { View, Text } from 'react-native';

interface AutoListEmptyStateProps {
  hasActiveFilters: boolean;
}

/**
 * Empty-state block shown when the auto list is empty. Copy differs
 * depending on whether filters are active.
 */
export default function AutoListEmptyState({ hasActiveFilters }: AutoListEmptyStateProps) {
  return (
    <View className="items-center justify-center py-[60px]">
      <Text className="text-base text-text-muted text-center select-none">
        {hasActiveFilters ? 'Ничего не найдено' : 'Список авто пуст'}
      </Text>
      {!hasActiveFilters && (
        <Text className="text-sm text-text-muted text-center mt-2.5 select-none">
          Добавьте первое авто нажав на кнопку выше
        </Text>
      )}
    </View>
  );
}
