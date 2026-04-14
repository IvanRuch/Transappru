/**
 * Web version of NotificationListScreen.
 * Displays notification list with auto-mark-as-viewed on click.
 * On mobile, viewability tracking uses FlatList; on web we mark on click.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import WebAppLayout from '../../components/web/WebAppLayout';
import { useNotification } from '../../contexts/NotificationContext';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  registered: string;
  viewed: string | number;
}

export default function NotificationListScreen() {
  const router = useRouter();
  const { addViewedCount } = useNotification();
  const addViewedCountRef = useRef(addViewedCount);
  addViewedCountRef.current = addViewedCount;

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    setLoading(true);
    try {
      const res = await api.post('/get-notification-list', { token });
      if (res.data.auth_required == 1) { router.replace('/'); return; }
      setNotifications(res.data.notification_list || []);
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAsViewed = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const res = await api.post('/set-notification-as-viewed', {
        token,
        notification_ids: ids.join(','),
      });
      if (res.data.auth_required == 1) { router.replace('/'); return; }
      addViewedCountRef.current(ids.length);
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    }
  }, [router]);

  const onPressItem = useCallback((item: NotificationItem) => {
    if (item.viewed === '0' || item.viewed === 0) {
      setNotifications(prev =>
        prev.map(n => n.id === item.id ? { ...n, viewed: 1 } : n)
      );
      markAsViewed([item.id]);
    }
  }, [markAsViewed]);

  const unviewedCount = notifications.filter(n => n.viewed === '0' || n.viewed === 0).length;

  return (
    <WebAppLayout>
      <View style={s.header}>
        <Text style={s.title}>Уведомления</Text>
        {!loading && (
          <Text style={s.count}>
            Всего {notifications.length} уведомлений
            {unviewedCount > 0 ? ` (${unviewedCount} новых)` : ''}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>Уведомлений нет</Text>
        </View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={s.listContent}>
          {notifications.map(item => {
            const isNew = item.viewed === '0' || item.viewed === 0;
            return (
              <Pressable key={item.id} onPress={() => onPressItem(item)}>
                <View style={[s.card, isNew && s.cardNew]}>
                  {isNew && <View style={s.newDot} />}
                  <View style={s.cardContent}>
                    <Text style={s.cardTitle}>{item.title}</Text>
                    <Text style={s.cardBody}>{item.body}</Text>
                    <Text style={s.cardDate}>{item.registered}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </WebAppLayout>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', ...noSelect },
  count: { fontSize: 13, color: '#656565', marginTop: 4, ...noSelect },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  empty: { fontSize: 16, color: '#888' },
  list: { flex: 1 },
  listContent: { padding: 16 },

  card: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardNew: {
    backgroundColor: '#F0F4FF',
    borderColor: '#B8C8E8',
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A6FD8',
    marginTop: 6,
    marginRight: 10,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#313131', marginBottom: 4, ...noSelect },
  cardBody: { fontSize: 14, color: '#313131', marginBottom: 6, ...noSelect },
  cardDate: { fontSize: 12, color: '#888', ...noSelect },
});
