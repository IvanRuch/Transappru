import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import type { NotificationItem } from '../types/notifications';

export function useNotificationList() {
  const router = useRouter();
  const { addViewedCount } = useNotification();
  const addViewedCountRef = useRef(addViewedCount);
  addViewedCountRef.current = addViewedCount;

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return null;
    }
    return token;
  }, [router]);

  const loadNotifications = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    setLoading(true);
    try {
      const res = await api.post('/get-notification-list', { token });
      if (res.data.auth_required == 1) {
        router.replace('/');
        return;
      }
      setNotifications(res.data.notification_list || []);
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [getToken, router]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsViewed = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.post('/set-notification-as-viewed', {
        token,
        notification_ids: ids.join(','),
      });
      if (res.data.auth_required == 1) {
        router.replace('/');
        return;
      }
      addViewedCountRef.current(ids.length);
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    }
  }, [router]);

  const onPressItem = useCallback((item: NotificationItem) => {
    if (String(item.viewed) === '0') {
      setNotifications(prev =>
        prev.map(n => n.id === item.id ? { ...n, viewed: '1' } : n)
      );
      markAsViewed([item.id]);
    }
  }, [markAsViewed]);

  const markItemsViewed = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) && String(n.viewed) === '0'
        ? { ...n, viewed: '1' }
        : n
      )
    );
    markAsViewed(ids);
  }, [markAsViewed]);

  const unviewedCount = notifications.filter(
    n => String(n.viewed) === '0'
  ).length;

  return {
    loading,
    notifications,
    unviewedCount,
    loadNotifications,
    markAsViewed,
    onPressItem,
    markItemsViewed,
  };
}
