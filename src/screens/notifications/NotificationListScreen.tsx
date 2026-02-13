import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableHighlight, ActivityIndicator, Image, Pressable, StyleSheet, Platform, StatusBar, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Api from '../../utils/Api';
import { ScreenHeader } from '../../components/common';
import { useNotification } from '../../contexts/NotificationContext';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  registered: string;
  viewed: string | number;
}

const viewabilityConfig = {
  waitForInteraction: true,
  itemVisiblePercentThreshold: 75
};

export default function NotificationListScreen() {
  const router = useRouter();
  const { addViewedCount } = useNotification();

  const [indicator, setIndicator] = useState(false);
  const [notificationList, setNotificationList] = useState<NotificationItem[]>([]);

  useEffect(() => {
    console.log('NotificationList DidMount');
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const token = await AsyncStorage.getItem('token');
    console.log('========================================');
    console.log('[NotificationList] Platform:', Platform.OS);
    console.log('[NotificationList] Token:', token ? 'EXISTS (length: ' + token.length + ')' : 'NOT FOUND');
    console.log('[NotificationList] Token value (first 20 chars):', token ? token.substring(0, 20) + '...' : 'N/A');
    console.log('========================================');
    
    if (!token) {
      console.log('[NotificationList] No token, redirecting to auth');
      router.replace('/');
      return;
    }

    setIndicator(true);
    console.log('[NotificationList] Sending request to /get-notification-list');

    try {
      const res = await Api.post('/get-notification-list', { token });
      const data = res.data;
      
      console.log('========================================');
      console.log('[NotificationList] Response received:');
      console.log('  - Platform:', Platform.OS);
      console.log('  - auth_required:', data.auth_required);
      console.log('  - notification_list type:', typeof data.notification_list);
      console.log('  - notification_list is Array:', Array.isArray(data.notification_list));
      console.log('  - notification_list length:', data.notification_list ? data.notification_list.length : 'N/A');
      console.log('  - notification_list content:', JSON.stringify(data.notification_list));
      console.log('  - Full response:', JSON.stringify(data));
      console.log('========================================');

      if (data.auth_required == 1) {
        console.log('[NotificationList] Auth required, redirecting');
        router.replace('/');
      } else {
        const list = data.notification_list || [];
        console.log('[NotificationList] Setting notification list, count:', list.length);
        setNotificationList(list);
        setIndicator(false);
      }
    } catch (error: any) {
      console.log('[NotificationList] ERROR:');
      console.log('  - Message:', error.message);
      console.log('  - Status:', error.response?.status);
      console.log('  - Data:', error.response?.data);
      console.log('  - Full error:', error);
      
      if (error.response?.status === 401) {
        router.replace('/');
      }
      setIndicator(false);
    }
  };

  const addViewedCountRef = useRef(addViewedCount);
  addViewedCountRef.current = addViewedCount;

  const setNotificationAsViewed = useCallback(async (notificationIds: string[]) => {
    const token = await AsyncStorage.getItem('token');
    if (!token || notificationIds.length === 0) return;

    try {
      const res = await Api.post('/set-notification-as-viewed', {
        token,
        notification_ids: notificationIds.join(',')
      });
      const data = res.data;
      console.log('Set as viewed:', data);

      if (data.auth_required == 1) {
        router.replace('/');
      } else {
        addViewedCountRef.current(notificationIds.length);
      }
    } catch (error: any) {
      console.log('Error marking as viewed:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    }
  }, [router]);

  const setNotificationAsViewedRef = useRef(setNotificationAsViewed);
  setNotificationAsViewedRef.current = setNotificationAsViewed;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    console.log('[NotificationList] onViewableItemsChanged - Visible items:', viewableItems.length);

    const notificationIds: string[] = [];

    setNotificationList(prevList => {
      const updatedList = [...prevList];

      for (let i = 0; i < viewableItems.length; i++) {
        if (viewableItems[i].isViewable && viewableItems[i].index !== null && viewableItems[i].index !== undefined) {
          const index = viewableItems[i].index as number;
          const item = viewableItems[i].item as NotificationItem;
          
          console.log('  - Viewable item index:', index, 'id:', item.id, 'viewed:', updatedList[index].viewed);

          if (updatedList[index].viewed === '0' || updatedList[index].viewed === 0) {
            updatedList[index].viewed = 1;
            notificationIds.push(item.id);
          }
        }
      }

      return updatedList;
    });

    if (notificationIds.length > 0) {
      console.log('[NotificationList] Marking as viewed:', notificationIds);
      setNotificationAsViewedRef.current(notificationIds);
    }
  }).current;

  const onPressItem = (item: NotificationItem) => {
    console.log('onPressItem', item.id);

    const updatedList = [...notificationList];
    const notificationIds: string[] = [];

    for (let i = 0; i < updatedList.length; i++) {
      if (updatedList[i].id === item.id && (updatedList[i].viewed === '0' || updatedList[i].viewed === 0)) {
        updatedList[i].viewed = 1;
        notificationIds.push(item.id);
      }
    }

    setNotificationList(updatedList);

    if (notificationIds.length > 0) {
      setNotificationAsViewed(notificationIds);
    }
  };

  const getItemStyle = (item: NotificationItem) => {
    const color = (item.viewed === '0' || item.viewed === 0) ? '#E9E9E9' : '#ffffff';
    return {
      flexDirection: 'row' as const,
      margin: 20,
      padding: 10,
      backgroundColor: color,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#B8B8B8'
    };
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    return (
      <Pressable 
        key={item.id}
        onPress={() => onPressItem(item)}
      >
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
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar 
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      
      {/* Заголовок с кнопкой назад */}
      <ScreenHeader 
        title="Уведомления"
        onBack={() => {
          console.log('-> back to AutoList');
          router.back();
        }}
      />

      {/* Индикатор загрузки */}
      <ActivityIndicator size="large" color="#313131" animating={indicator} />

      {/* Счетчик уведомлений */}
      {!indicator && (
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
            <Text style={{ paddingLeft: 30, paddingRight: 16, paddingBottom: 10, fontSize: 12, fontWeight: 'normal', color: '#656565' }}>
              Всего {notificationList.length} уведомлений:
            </Text>
          </View>
        </View>
      )}

      {/* Список уведомлений */}
      <FlatList
        data={notificationList}
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
