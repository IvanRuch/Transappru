import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableHighlight, ActivityIndicator, Image, Pressable, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Api from '../../utils/Api';
import { ScreenHeader } from '../../components/common';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  registered: string;
  viewed: string | number;
}

export default function NotificationListScreen() {
  const router = useRouter();
  
  const [indicator, setIndicator] = useState(false);
  const [notificationList, setNotificationList] = useState<NotificationItem[]>([]);

  useEffect(() => {
    console.log('NotificationList DidMount');
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.log('No token');
      router.replace('/');
      return;
    }

    setIndicator(true);

    try {
      const res = await Api.post('/get-notification-list', { token });
      const data = res.data;
      console.log('Notifications:', data);

      if (data.auth_required == 1) {
        router.replace('/');
      } else {
        setNotificationList(data.notification_list || []);
        setIndicator(false);
      }
    } catch (error: any) {
      console.log('Error loading notifications:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
      setIndicator(false);
    }
  };

  const setNotificationAsViewed = async (notificationIds: string[]) => {
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
      }
    } catch (error: any) {
      console.log('Error marking as viewed:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    }
  };

  const onPressItem = (item: NotificationItem) => {
    console.log('onPressItem', item.id);

    const updatedList = [...notificationList];
    const notificationIds: string[] = [];

    for (let i = 0; i < updatedList.length; i++) {
      if (updatedList[i].id === item.id && updatedList[i].viewed === '0') {
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
