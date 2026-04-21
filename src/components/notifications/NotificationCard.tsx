import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { NotificationItem } from '../../types/notifications';

interface NotificationCardProps {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}

/**
 * Cross-platform notification card. Shows title, body, and registration date,
 * with a subtle accent background + leading dot when the notification is
 * unviewed. Colors come from tailwind tokens `notification.{newBg,newBorder,newDot}`.
 */
export default function NotificationCard({ item, onPress }: NotificationCardProps) {
  const isNew = String(item.viewed) === '0';

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${isNew ? 'Новое уведомление. ' : ''}${item.title}. ${item.body}`}
      className={`flex-row p-3.5 mx-4 mb-2.5 rounded-lg border cursor-pointer ${
        isNew
          ? 'bg-notification-newBg border-notification-newBorder'
          : 'bg-light-bg dark:bg-dark-bg border-border-secondary dark:border-dark-border'
      }`}
    >
      {isNew && (
        <View
          className="w-2 h-2 rounded-full mt-1.5 mr-2.5 bg-notification-newDot"
          accessibilityLabel="Не прочитано"
        />
      )}
      <View className="flex-1">
        <Text className="text-base font-bold text-light-text dark:text-dark-text mb-1 select-none">
          {item.title}
        </Text>
        <Text className="text-sm text-light-text dark:text-dark-text mb-1.5 select-none">
          {item.body}
        </Text>
        <Text className="text-xs text-text-muted select-none">
          {item.registered}
        </Text>
      </View>
    </Pressable>
  );
}
