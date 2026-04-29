// Soft-prompt banner that asks the user to enable browser notifications.
// Web-only (early-return null on native) — single file is enough because
// the visual is trivial on web and a no-op on native.
//
// UX: appears at the top of /auto-list ~10 seconds after entry, never
// during onboarding/login. Buttons:
//   "Включить" → request browser permission (the only place we call the
//                native `Notification.requestPermission()`).
//   "Позже"   → snooze 14 days (then surface again).
//   "✕"       → dismiss permanently (banner gone forever; user can still
//                opt in via /notification-settings).

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useWebPushPermission } from '../../hooks/useWebPushPermission';

// Show only on the main authenticated page where the value of
// notifications is most obvious. We pick `/auto-list` (and its
// `(authenticated)` group variant) — the user has just seen their
// fleet and any pending fines, so "get notified about new fines" lands
// in the right context.
const AUTHED_PATHS = ['/auto-list', '/(authenticated)/auto-list'];
const SHOW_DELAY_MS = 10_000;

export function PushPermissionPrompt() {
  // Hooks must be called unconditionally — Rules of Hooks. The
  // platform / state / pathname guards run *after* the hook calls.
  const pathname = usePathname();
  const { state, requestPermission, snooze, dismiss } = useWebPushPermission();
  const [delayElapsed, setDelayElapsed] = useState(false);

  // Wait 10s after the user lands on /auto-list before showing — gives
  // them a moment to look at the list and orient before we interrupt.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!AUTHED_PATHS.includes(pathname)) {
      setDelayElapsed(false);
      return;
    }
    const timer = window.setTimeout(() => setDelayElapsed(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Native: render nothing. The banner is purely a web concern.
  if (Platform.OS !== 'web') return null;

  // Only `idle` state shows the banner. Everything else (granted, denied,
  // snoozed, requesting, unsupported) hides it.
  const visible =
    state === 'idle' && delayElapsed && AUTHED_PATHS.includes(pathname);

  if (!visible) return null;

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconCol}>
        <Text style={styles.icon}>🔔</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Уведомления о штрафах и пропусках</Text>
        <Text style={styles.subtitle}>
          Получайте оповещения о новых штрафах ГИБДД и истечении пропусков
        </Text>
        <View style={styles.actionsRow}>
          <Pressable
            style={({ hovered }: any) => [
              styles.button,
              styles.buttonSecondary,
              hovered && styles.buttonHovered,
            ]}
            onPress={snooze}
            accessibilityRole="button"
            accessibilityLabel="Отложить уведомления на 14 дней"
          >
            <Text style={styles.buttonSecondaryLabel}>Позже</Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [
              styles.button,
              styles.buttonPrimary,
              hovered && styles.buttonPrimaryHovered,
            ]}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Включить уведомления"
          >
            <Text style={styles.buttonPrimaryLabel}>Включить</Text>
          </Pressable>
        </View>
      </View>
      <Pressable
        style={styles.closeButton}
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
        hitSlop={8}
      >
        <Text style={styles.closeIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

// Visual aligned with the existing NetworkStatusBanner — top of viewport,
// shadow card, primary/secondary button pair. Matches the project canon.
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    maxWidth: 720,
    marginHorizontal: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 1000,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
      default: {},
    }),
  },
  iconCol: {
    paddingTop: 2,
    paddingRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#4C4C4C',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonSecondary: {
    backgroundColor: '#F2F2F2',
  },
  buttonHovered: {
    backgroundColor: '#E8E8E8',
  },
  buttonSecondaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3A3A3A',
  },
  buttonPrimary: {
    backgroundColor: '#3A3A3A',
  },
  buttonPrimaryHovered: {
    backgroundColor: '#1A1A1A',
  },
  buttonPrimaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    paddingTop: 2,
    paddingLeft: 8,
  },
  closeIcon: {
    fontSize: 18,
    color: '#909090',
  },
});
