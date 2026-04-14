import React, { useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet, StatusBar, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import { useNotificationList } from '../../hooks/useNotificationList';
import type { NotificationItem } from '../../types/notifications';

const viewabilityConfig = {
  waitForInteraction: true,
  itemVisiblePercentThreshold: 75,
};

export default function NotificationListScreen() {
  const router = useRouter();
  const { loading, notifications, markItemsViewed, onPressItem } = useNotificationList();

  const markItemsViewedRef = useRef(markItemsViewed);
  markItemsViewedRef.current = markItemsViewed;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const ids: string[] = [];
    for (const vi of viewableItems) {
      if (vi.isViewable && vi.item) {
        const item = vi.item as NotificationItem;
        if (item.viewed === '0' || item.viewed === 0) {
          ids.push(item.id);
        }
      }
    }
    if (ids.length > 0) {
      markItemsViewedRef.current(ids);
    }
  }).current;

  const getItemStyle = (item: NotificationItem) => ({
    flexDirection: 'row' as const,
    margin: 20,
    padding: 10,
    backgroundColor: (item.viewed === '0' || item.viewed === 0) ? '#E9E9E9' : '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  });

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable key={item.id} onPress={() => onPressItem(item)}>
      <View style={getItemStyle(item)}>
        <View style={{ flexDirection: 'column', alignItems: 'stretch', flex: 1 }}>
          <Text style={{ paddingTop: 5, fontSize: 16, fontWeight: 'bold', color: '#313131' }}>
            {item.title}
          </Text>
          <Text style={{ paddingTop: 5, fontSize: 14, fontWeight: 'normal', color: '#313131' }}>
            {item.body}
          </Text>
          <Text style={{ paddingTop: 5, fontSize: 12, fontWeight: 'normal', color: '#313131' }}>
            {item.registered}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <ScreenHeader
        title="Уведомления"
        onBack={() => router.back()}
      />

      <ActivityIndicator size="large" color="#313131" animating={loading} />

      {!loading && (
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
            <Text style={{ paddingLeft: 30, paddingRight: 16, paddingBottom: 10, fontSize: 12, fontWeight: 'normal', color: '#656565' }}>
              Всего {notifications.length} уведомлений:
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={notifications}
        initialNumToRender={10}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});
