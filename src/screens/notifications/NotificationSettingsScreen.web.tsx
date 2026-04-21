/**
 * Web version of NotificationSettingsScreen.
 *
 * Shares all business logic with mobile via useNotificationSettings
 * (ADR-003) and the `NotificationSettingGroup` sub-component (ADR-005).
 *
 * Does NOT wrap in WebAppLayout — authenticated layout
 * (`_layout.web.tsx`) already provides it (see .claude/rules.md).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import WebScreenContainer from '../../components/web/WebScreenContainer';
import { NotificationSettingGroup } from '../../components/notifications';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { showAlert } from '../../utils/alert';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { settings, loading, error, clearError, toggleMaster, toggleAuto } = useNotificationSettings();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (error) {
      showAlert('Ошибка', error);
      clearError();
    }
  }, [error, clearError]);

  const toggleExpand = useCallback((notificationType: string) => {
    setExpanded(prev => ({ ...prev, [notificationType]: !prev[notificationType] }));
  }, []);

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main' as any);
  }, [router]);

  return (
    <View className="flex-1">
      <ScreenHeader title="Настройки уведомлений" onBack={safeBack} />

      <WebScreenContainer maxWidth={820}>
        {loading ? (
          <View className="flex-1 items-center justify-center p-10">
            <ActivityIndicator size="large" color="#313131" />
          </View>
        ) : settings.length === 0 ? (
          <View className="flex-1 items-center justify-center p-10">
            <Text className="text-base text-text-muted">Нет доступных типов уведомлений</Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
            {settings.map(item => (
              <NotificationSettingGroup
                key={item.notification_type}
                item={item}
                expanded={!!expanded[item.notification_type]}
                onToggleExpand={toggleExpand}
                onToggleMaster={toggleMaster}
                onToggleAuto={toggleAuto}
              />
            ))}
          </ScrollView>
        )}
      </WebScreenContainer>
    </View>
  );
}
