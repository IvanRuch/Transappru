import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { settings, loading, error, clearError, toggleMaster, toggleAuto } = useNotificationSettings();

  useEffect(() => {
    if (error) {
      Alert.alert('Ошибка', error);
      clearError();
    }
  }, [error, clearError]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleExpand = (notificationType: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [notificationType]: !prev[notificationType],
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="Настройки уведомлений" onBack={() => router.back()} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3A3A3A" />
        </View>
      </SafeAreaView>
    );
  }

  if (settings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="Настройки уведомлений" onBack={() => router.back()} />
        <View style={styles.loaderContainer}>
          <Text style={styles.emptyText}>Нет доступных типов уведомлений</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Настройки уведомлений" onBack={() => router.back()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {settings.map(item => {
          const masterOn = item.granted === '1';
          const isExpanded = expandedGroups[item.notification_type];
          const hasAutos = item.auto_granted.length > 0;

          return (
            <View key={item.notification_type} style={styles.section}>
              {/* Master row */}
              <TouchableOpacity
                style={styles.masterRow}
                activeOpacity={0.7}
                onPress={() => hasAutos && toggleExpand(item.notification_type)}
              >
                <View style={styles.masterLeft}>
                  {hasAutos && (
                    <Text style={styles.expandIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </Text>
                  )}
                  <Text style={styles.masterLabel}>{item.header}</Text>
                </View>
                <Switch
                  trackColor={{ false: '#767577', true: '#3A3A3A' }}
                  thumbColor="#f4f3f4"
                  ios_backgroundColor="#3e3e3e"
                  value={masterOn}
                  onValueChange={val => toggleMaster(item.notification_type, val)}
                />
              </TouchableOpacity>

              {/* Per-auto rows */}
              {isExpanded && hasAutos && (
                <View style={styles.autoList}>
                  {item.auto_granted.map(auto => {
                    const autoOn = auto.granted === '1';
                    return (
                      <View
                        key={auto.id}
                        style={[
                          styles.autoRow,
                          !masterOn && styles.autoRowDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.autoLabel,
                            !masterOn && styles.autoLabelDisabled,
                          ]}
                        >
                          {auto.auto_number}
                        </Text>
                        <Switch
                          trackColor={{ false: '#767577', true: '#3A3A3A' }}
                          thumbColor="#f4f3f4"
                          ios_backgroundColor="#3e3e3e"
                          value={masterOn && autoOn}
                          disabled={!masterOn}
                          onValueChange={val =>
                            toggleAuto(item.notification_type, auto.id, val)
                          }
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#656565',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  masterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  expandIcon: {
    fontSize: 12,
    color: '#3A3A3A',
    marginRight: 10,
    width: 16,
  },
  masterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#313131',
    flexShrink: 1,
  },
  autoList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingLeft: 42,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  autoRowDisabled: {
    opacity: 0.4,
  },
  autoLabel: {
    fontSize: 15,
    color: '#313131',
  },
  autoLabelDisabled: {
    color: '#999999',
  },
});
