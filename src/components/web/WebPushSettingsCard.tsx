// Master toggle for browser push notifications, shown at the top of
// `/notification-settings`. Web-only — early-return null on native (the
// native push permission lives in the OS-level Settings app on iOS /
// Android, not inside our screen).
//
// Three visual states mirror `useWebPushPermission`:
//   - granted: switch ON (read-only — toggle off would require revoking
//              browser permission, which we can't do from JS)
//   - denied:  blocked banner with instructions to fix in Site Settings
//   - idle/snoozed: switch OFF, click triggers `requestPermission`
//
// "unsupported" hides the card entirely — there's nothing the user can
// do (Safari iOS, Firebase config missing, etc).

import { Platform, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { useWebPushPermission } from '../../hooks/useWebPushPermission';

export function WebPushSettingsCard() {
  // Hooks must be called unconditionally — Rules of Hooks. Platform
  // and state guards run *after* the hook call. `useWebPushPermission`
  // itself is no-op on native (state = 'unsupported'), so this is safe.
  const { state, requestPermission } = useWebPushPermission();

  if (Platform.OS !== 'web') return null;
  if (state === 'unsupported') return null;

  const isGranted = state === 'granted';
  const isDenied = state === 'denied';
  const isPending = state === 'requesting';

  const onValueChange = (next: boolean) => {
    if (next && !isGranted) requestPermission();
    // Toggling OFF after grant is intentionally not implemented here —
    // browser permission can only be revoked in Site Settings. We expose
    // a "remove" button below for that case if denied/granted state is misleading.
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.body}>
          <Text style={styles.title}>Push-уведомления в браузере</Text>
          <Text style={styles.subtitle}>
            {isGranted
              ? 'Уведомления включены. Вы получите оповещения о штрафах и пропусках.'
              : isDenied
              ? 'Заблокировано в настройках браузера. Откройте 🔒 рядом с адресом сайта и разрешите уведомления.'
              : 'Получайте оповещения о новых штрафах и истечении пропусков.'}
          </Text>
        </View>
        <View style={styles.switchCol}>
          <Switch
            value={isGranted}
            onValueChange={onValueChange}
            disabled={isDenied || isPending}
            trackColor={{ false: '#E9E9EA', true: '#3A3A3A' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E9E9EA"
          />
        </View>
      </View>

      {isDenied && (
        <Pressable
          style={styles.helpRow}
          onPress={() => {
            // Open the browser's site permission UI when possible. Most
            // browsers don't expose a programmatic way; we just point users
            // at the lock icon. The Pressable is here so the help text
            // feels actionable even though it's just guidance.
          }}
          accessibilityRole="link"
        >
          <Text style={styles.helpText}>
            Подробнее: Chrome / Edge показывают замок 🔒 слева от адреса —
            кликните и установите «Уведомления → Разрешить».
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    paddingRight: 12,
  },
  switchCol: {
    alignItems: 'flex-end',
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
  helpRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  helpText: {
    fontSize: 13,
    color: '#6B6B6B',
    lineHeight: 18,
  },
});
