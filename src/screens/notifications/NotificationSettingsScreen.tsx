import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
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

  const toggleExpand = (notificationType: string) => {
    setExpanded(prev => ({ ...prev, [notificationType]: !prev[notificationType] }));
  };

  const safeBack = () => (router.canGoBack() ? router.back() : router.replace('/main' as any));

  return (
    <SafeAreaView className="flex-1 bg-[#F5F5F5] dark:bg-dark-bg" edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Настройки уведомлений" onBack={safeBack} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3A3A3A" />
        </View>
      ) : settings.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-text-secondary">Нет доступных типов уведомлений</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}>
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
    </SafeAreaView>
  );
}
