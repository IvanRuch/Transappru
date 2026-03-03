import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Api from '../utils/Api';
import type { NotificationTypeGranted, NotificationGrantedResponse } from '../types/notifications';

export function useNotificationSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationTypeGranted[]>([]);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return null;
    }
    return token;
  }, [router]);

  // ── Загрузка дерева настроек ────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await Api.post<NotificationGrantedResponse>('/get-notification-granted', { token });

      if (res.data.auth_required === 1) {
        router.replace('/');
        return;
      }

      setSettings(res.data.notification_granted_list || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/');
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить настройки уведомлений');
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Master toggle (тип целиком) ─────────────────────────────────────────
  // Серверная логика OR: уведомление отправляется если master OR per-auto.
  // Поэтому при master OFF каскадно выставляем все per-auto в "0",
  // при master ON — все per-auto в "1" (записи удалятся из таблицы).
  const toggleMaster = useCallback(async (notificationType: string, newValue: boolean) => {
    const grantedStr = newValue ? '1' : '0';
    const prev = settings.map(s => ({
      ...s,
      auto_granted: s.auto_granted.map(a => ({ ...a })),
    }));

    // Optimistic update: master + все per-auto
    setSettings(s => s.map(item =>
      item.notification_type === notificationType
        ? {
            ...item,
            granted: grantedStr,
            auto_granted: item.auto_granted.map(a => ({ ...a, granted: grantedStr })),
          }
        : item
    ));

    const token = await getToken();
    if (!token) return;

    try {
      // Каскад per-auto СНАЧАЛА
      const targetType = settings.find(s => s.notification_type === notificationType);
      if (targetType && targetType.auto_granted.length > 0) {
        await Promise.all(
          targetType.auto_granted.map(auto =>
            Api.post('/set-notification-granted', {
              token,
              notification_type: notificationType,
              user_auto: auto.id,
              granted: grantedStr,
            })
          )
        );
      }

      // Master ПОСЛЕДНИМ — чтобы per-auto вызовы не затёрли его на сервере
      await Api.post('/set-notification-granted', {
        token,
        notification_type: notificationType,
        granted: grantedStr,
      });
    } catch {
      setSettings(prev);
      Alert.alert('Ошибка', 'Не удалось сохранить настройку');
    }
  }, [settings, getToken]);

  // ── Per-auto toggle ─────────────────────────────────────────────────────
  const toggleAuto = useCallback(async (
    notificationType: string,
    userAutoId: string,
    newValue: boolean,
  ) => {
    const grantedStr = newValue ? '1' : '0';
    const prev = settings.map(s => ({
      ...s,
      auto_granted: s.auto_granted.map(a => ({ ...a })),
    }));

    // Optimistic update
    setSettings(s => s.map(item =>
      item.notification_type === notificationType
        ? {
            ...item,
            auto_granted: item.auto_granted.map(a =>
              a.id === userAutoId ? { ...a, granted: grantedStr } : a
            ),
          }
        : item
    ));

    const token = await getToken();
    if (!token) return;

    try {
      await Api.post('/set-notification-granted', {
        token,
        notification_type: notificationType,
        user_auto: userAutoId,
        granted: grantedStr,
      });
    } catch {
      setSettings(prev);
      Alert.alert('Ошибка', 'Не удалось сохранить настройку');
    }
  }, [settings, getToken]);

  return { settings, loading, loadSettings, toggleMaster, toggleAuto };
}
