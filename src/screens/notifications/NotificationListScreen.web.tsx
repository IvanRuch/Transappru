/**
 * Web version of NotificationListScreen.
 *
 * Shares business logic with mobile via useNotificationList (ADR-003) and the
 * `NotificationCard` sub-component (ADR-005). Web specifics:
 *  - ScreenHeader + WebScreenContainer (desktop max-width)
 *  - safeBack to /main when history is empty
 *  - ARIA list role for the notification feed
 *
 * Note: does NOT wrap in WebAppLayout — the authenticated layout
 * (`_layout.web.tsx`) already provides it (see .claude/rules.md).
 */
import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import WebScreenContainer from '../../components/web/WebScreenContainer';
import { NotificationCard } from '../../components/notifications';
import { useNotificationList } from '../../hooks/useNotificationList';

export default function NotificationListScreen() {
  const router = useRouter();
  const { loading, notifications, unviewedCount, onPressItem } = useNotificationList();

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main' as any);
  }, [router]);

  return (
    <View className="flex-1">
      <ScreenHeader
        title="Уведомления"
        onBack={safeBack}
        rightComponent={
          <Pressable
            className="px-2 py-2 cursor-pointer"
            onPress={() => router.push('/(authenticated)/notification-settings' as any)}
            accessibilityRole="button"
            accessibilityLabel="Настройки уведомлений"
          >
            <Text className="text-sm font-medium text-text-primary select-none">Настройки</Text>
          </Pressable>
        }
      />

      <WebScreenContainer maxWidth={820}>
        {loading ? (
          <View className="flex-1 items-center justify-center p-10">
            <ActivityIndicator size="large" color="#313131" />
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center p-10">
            <Text className="text-base text-text-muted">Уведомлений нет</Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 16 }}>
            <Text className="px-4 pb-3 text-[13px] text-text-secondary select-none">
              Всего {notifications.length} уведомлений
              {unviewedCount > 0 ? ` (${unviewedCount} новых)` : ''}
            </Text>
            <View accessibilityRole={'list' as any} aria-label="Список уведомлений">
              {notifications.map(item => (
                <NotificationCard key={item.id} item={item} onPress={onPressItem} />
              ))}
            </View>
          </ScrollView>
        )}
      </WebScreenContainer>
    </View>
  );
}
