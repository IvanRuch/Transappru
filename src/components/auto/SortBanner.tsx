import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface SortBannerProps {
  onDismiss: () => void;
}

/**
 * Info-banner shown above the auto list when the user picks «По номеру»
 * (plate_digits sort). Explains that the full fleet is fetched in one
 * request and points to the upcoming server-side sort that will replace
 * this load-all strategy. Dismissible — the dismissal is persisted by the
 * caller (see `useAutoData.dismissSortBanner`).
 *
 * Removed entirely in Phase 2 when backend ships `sort_by=plate_digits`
 * and the load-all strategy is no longer necessary. See ADR-018 and
 * `.claude/plans/2026-05-14-auto-list-sort-toggle.md`.
 */
export function SortBanner({ onDismiss }: SortBannerProps) {
  return (
    <View className="flex-row items-start gap-2 px-4 py-2 bg-[#FFF8E1] border-b border-[#F0E0A0]">
      <Text className="text-[11px] mt-[1px]" accessibilityLabel="Информация">
        ℹ
      </Text>
      <Text className="flex-1 text-[11px] leading-[15px] text-text-secondary select-none">
        Сортировка по номеру применяется ко всему парку — список загружается одним запросом.
        В следующей версии скорость улучшится за счёт серверной сортировки.
      </Text>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Скрыть информационное сообщение"
        className="px-1.5 py-0.5"
      >
        <Text className="text-[14px] text-text-muted select-none">✕</Text>
      </Pressable>
    </View>
  );
}
