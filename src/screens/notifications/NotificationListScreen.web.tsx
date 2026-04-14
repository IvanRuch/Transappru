/**
 * Web version of NotificationListScreen.
 * Displays notification list with mark-as-viewed on click.
 */
import React from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet, Platform } from 'react-native';
import WebAppLayout from '../../components/web/WebAppLayout';
import { useNotificationList } from '../../hooks/useNotificationList';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

export default function NotificationListScreen() {
  const { loading, notifications, unviewedCount, onPressItem } = useNotificationList();

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
