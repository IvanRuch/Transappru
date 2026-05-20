import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { LoadErrorKind } from '../../utils/loadError';

interface AutoListLoadErrorProps {
  kind: LoadErrorKind;
  onRetry: () => void;
}

const SUBTITLE: Record<LoadErrorKind, string> = {
  timeout: 'Сервер отвечает дольше обычного. Попробуйте ещё раз.',
  network: 'Проверьте подключение к интернету.',
  server: 'Сервер недоступен. Попробуйте ещё раз через минуту.',
  unknown: 'Что-то пошло не так. Попробуйте ещё раз.',
};

/**
 * Shown in the auto-list empty slot when /get-auto-list failed (timeout,
 * network, 5xx, etc). Replaces the silent "Список авто пуст" + missing
 * chrome state that used to happen on these errors. Retry button calls
 * `refreshAutoList` (= useAutoData.refreshData) which clears loadError
 * immediately so the retry feels responsive.
 */
export default function AutoListLoadError({ kind, onRetry }: AutoListLoadErrorProps) {
  return (
    <View className="items-center justify-center py-[60px] px-6">
      <Text className="text-base text-text-primary text-center font-semibold select-none">
        Не удалось загрузить список
      </Text>
      <Text className="text-sm text-text-muted text-center mt-2.5 select-none">
        {SUBTITLE[kind]}
      </Text>
      <Pressable
        className="mt-5 px-5 py-3 rounded-[10px] bg-accent-secondary"
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Попробовать ещё раз"
      >
        <Text className="text-base font-bold text-white select-none">
          Попробовать ещё раз
        </Text>
      </Pressable>
    </View>
  );
}
