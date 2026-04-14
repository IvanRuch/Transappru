/**
 * Web version of NotificationSettingsScreen.
 * Uses shared useNotificationSettings hook for business logic.
 * Two-level toggle tree: master (notification type) -> per-auto toggles.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Pressable, ActivityIndicator, ScrollView, StyleSheet, Platform } from 'react-native';
import WebAppLayout from '../../components/web/WebAppLayout';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

export default function NotificationSettingsScreen() {
  const { settings, loading, error, clearError, toggleMaster, toggleAuto } = useNotificationSettings();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (error) {
      window.alert(error);
      clearError();
    }
  }, [error, clearError]);

  return (
    <WebAppLayout>
      <View style={s.header}>
        <Text style={s.title}>Настройки уведомлений</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : settings.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>Нет доступных типов уведомлений</Text>
        </View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={s.listContent}>
          {settings.map(type => {
            const masterOn = type.granted === '1';
            const isExpanded = expanded[type.notification_type];
            const hasAutos = type.auto_granted.length > 0;

            return (
              <View key={type.notification_type} style={s.section}>
                {/* Master row */}
                <View style={s.masterRow}>
                  {hasAutos && (
                    <Pressable
                      style={s.expandBtn}
                      onPress={() => setExpanded(e => ({ ...e, [type.notification_type]: !isExpanded }))}
                    >
                      <Text style={s.expandArrow}>{isExpanded ? '▼' : '▶'}</Text>
                    </Pressable>
                  )}
                  <Text style={[s.masterLabel, !hasAutos && { marginLeft: 32 }]}>{type.header}</Text>
                  <Switch
                    value={masterOn}
                    onValueChange={v => toggleMaster(type.notification_type, v)}
                    trackColor={{ false: '#D0D0D0', true: '#4CAF50' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Per-auto rows */}
                {isExpanded && hasAutos && (
                  <View style={s.autoList}>
                    {type.auto_granted.map(auto => {
                      const autoOn = auto.granted === '1';
                      return (
                        <View key={auto.id} style={s.autoRow}>
                          <Text style={[s.autoLabel, !masterOn && s.autoLabelDisabled]}>
                            {auto.auto_number}
                          </Text>
                          <Switch
                            value={autoOn}
                            onValueChange={v => toggleAuto(type.notification_type, auto.id, v)}
                            disabled={!masterOn}
                            trackColor={{ false: '#D0D0D0', true: '#4CAF50' }}
                            thumbColor="#FFFFFF"
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  empty: { fontSize: 16, color: '#888' },
  list: { flex: 1 },
  listContent: { padding: 16 },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  expandBtn: { width: 24, alignItems: 'center' },
  expandArrow: { fontSize: 12, color: '#888', ...noSelect },
  masterLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#313131', marginLeft: 8, ...noSelect },

  autoList: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 48,
  },
  autoLabel: { flex: 1, fontSize: 14, color: '#313131', ...noSelect },
  autoLabelDisabled: { color: '#999' },
});
