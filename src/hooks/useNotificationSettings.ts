import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';
import type { NotificationTypeGranted, NotificationGrantedResponse } from '../types/notifications';

/**
 * Shared notification-settings logic for mobile and web.
 *
 * Handles: loading settings tree, master toggle (with per-auto cascade),
 * per-auto toggle, optimistic updates with rollback.
 *
 * Error reporting: sets `error` state string. Each screen decides how
 * to display it (mobile → Alert.alert, web → inline or window.alert).
 */
export function useNotificationSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationTypeGranted[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return null;
    }
    return token;
  }, [router]);

  // ── Load settings tree ────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/get-notification-granted', { token });
      const data = res.data as NotificationGrantedResponse;

      if (data.auth_required === 1) {
        router.replace('/');
        return;
      }

      setSettings(data.notification_granted_list || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/');
      } else {
        setError('Не удалось загрузить настройки уведомлений');
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Deep clone for rollback ───────────────────────────────────────────────
  const cloneSettings = (s: NotificationTypeGranted[]) =>
    s.map(t => ({ ...t, auto_granted: t.auto_granted.map(a => ({ ...a })) }));

  // ── Master toggle (type-level) ────────────────────────────────────────────
  // Server logic is OR: notification fires if master OR per-auto.
  // So on master OFF we cascade all per-auto to "0",
  // on master ON we cascade all per-auto to "1".
  const toggleMaster = useCallback(async (notificationType: string, newValue: boolean) => {
    const grantedStr = newValue ? '1' : '0';
    const prev = cloneSettings(settings);

    // Optimistic update: master + all per-auto
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
      // Cascade per-auto FIRST
      const targetType = settings.find(s => s.notification_type === notificationType);
      if (targetType && targetType.auto_granted.length > 0) {
        await Promise.all(
          targetType.auto_granted.map(auto =>
            api.post('/set-notification-granted', {
              token,
              notification_type: notificationType,
              user_auto: auto.id,
              granted: grantedStr,
            })
          )
        );
      }

      // Master LAST — so per-auto calls don't overwrite it on the server
      await api.post('/set-notification-granted', {
        token,
        notification_type: notificationType,
        granted: grantedStr,
      });
    } catch {
      setSettings(prev);
      setError('Не удалось сохранить настройку');
    }
  }, [settings, getToken]);

  // ── Per-auto toggle ───────────────────────────────────────────────────────
  const toggleAuto = useCallback(async (
    notificationType: string,
    userAutoId: string,
    newValue: boolean,
  ) => {
    const grantedStr = newValue ? '1' : '0';
    const prev = cloneSettings(settings);

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
      await api.post('/set-notification-granted', {
        token,
        notification_type: notificationType,
        user_auto: userAutoId,
        granted: grantedStr,
      });
    } catch {
      setSettings(prev);
      setError('Не удалось сохранить настройку');
    }
  }, [settings, getToken]);

  const clearError = useCallback(() => setError(null), []);

  return { settings, loading, error, clearError, loadSettings, toggleMaster, toggleAuto };
}
