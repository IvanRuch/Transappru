import React, { useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, StatusBar, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import { NotificationCard } from '../../components/notifications';
import { useNotificationList } from '../../hooks/useNotificationList';
import type { NotificationItem } from '../../types/notifications';

const viewabilityConfig = {
  waitForInteraction: true,
  itemVisiblePercentThreshold: 75,
};

export default function NotificationListScreen() {
  const router = useRouter();
  const { loading, notifications, unviewedCount, markItemsViewed, onPressItem } = useNotificationList();

  const markItemsViewedRef = useRef(markItemsViewed);
  markItemsViewedRef.current = markItemsViewed;

  /**
   * Auto-mark notifications as viewed once 75% of them are on screen. Works
   * natively via FlatList; the web equivalent (IntersectionObserver) is not
   * implemented — web marks on click only.
   */
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const ids: string[] = [];
    for (const vi of viewableItems) {
      if (vi.isViewable && vi.item) {
        const item = vi.item as NotificationItem;
        if (String(item.viewed) === '0') {
          ids.push(item.id);
        }
      }
    }
    if (ids.length > 0) {
      markItemsViewedRef.current(ids);
    }
  }).current;

  const safeBack = () => (router.canGoBack() ? router.back() : router.replace('/main' as any));

  return (
    <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <ScreenHeader title="Уведомления" onBack={safeBack} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-base text-text-muted">Уведомлений нет</Text>
        </View>
      ) : (
        <>
          <Text className="px-[30px] pb-2.5 text-xs text-text-secondary">
            Всего {notifications.length} уведомлений
            {unviewedCount > 0 ? ` (${unviewedCount} новых)` : ''}
          </Text>
          <FlatList
            data={notifications}
            initialNumToRender={10}
            renderItem={({ item }) => <NotificationCard item={item} onPress={onPressItem} />}
            keyExtractor={item => item.id}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
          />
        </>
      )}
    </SafeAreaView>
  );
}
