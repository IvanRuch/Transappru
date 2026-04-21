import React from 'react';
import { View, Text, Switch, Pressable } from 'react-native';
import type { NotificationTypeGranted } from '../../types/notifications';

// Shared Switch colors so mobile and web render identical visuals.
const SWITCH_TRACK = { false: '#767577', true: '#3A3A3A' };
const SWITCH_THUMB = '#f4f3f4';
const IOS_BG = '#3e3e3e';

interface NotificationSettingGroupProps {
  item: NotificationTypeGranted;
  expanded: boolean;
  onToggleExpand: (notificationType: string) => void;
  onToggleMaster: (notificationType: string, value: boolean) => void;
  onToggleAuto: (notificationType: string, autoId: string, value: boolean) => void;
}

/**
 * One notification-type block — master toggle + expandable per-auto rows.
 *
 * Tree semantics (server-side OR):
 *   notification fires if master OR any per-auto is enabled for that auto
 * Per-auto Switches are disabled (opacity 40%) while master is OFF.
 */
export default function NotificationSettingGroup({
  item, expanded, onToggleExpand, onToggleMaster, onToggleAuto,
}: NotificationSettingGroupProps) {
  const masterOn = item.granted === '1';
  const hasAutos = item.auto_granted.length > 0;

  return (
    <View className="mb-3 rounded-xl overflow-hidden bg-white">
      {/* Master row */}
      <Pressable
        className="flex-row items-center py-3.5 px-4 cursor-pointer"
        onPress={() => hasAutos && onToggleExpand(item.notification_type)}
        accessibilityRole={hasAutos ? 'button' : undefined}
        accessibilityLabel={
          hasAutos
            ? `${item.header}. ${expanded ? 'Свернуть' : 'Развернуть'} список автомобилей`
            : item.header
        }
      >
        <Text
          className={`text-xs text-accent-secondary w-4 mr-2.5 select-none ${hasAutos ? '' : 'opacity-0'}`}
        >
          {expanded ? '▼' : '▶'}
        </Text>
        <Text className="flex-1 text-base font-semibold text-text-primary select-none">
          {item.header}
        </Text>
        <Switch
          trackColor={SWITCH_TRACK}
          thumbColor={SWITCH_THUMB}
          ios_backgroundColor={IOS_BG}
          value={masterOn}
          onValueChange={v => onToggleMaster(item.notification_type, v)}
          accessibilityLabel={`${item.header} — переключатель уведомлений`}
        />
      </Pressable>

      {/* Per-auto rows */}
      {expanded && hasAutos && (
        <View className="border-t border-[#E0E0E0]">
          {item.auto_granted.map(auto => {
            const autoOn = auto.granted === '1';
            return (
              <View
                key={auto.id}
                className={`flex-row items-center py-2.5 pl-[42px] pr-4 border-b border-[#F0F0F0] ${
                  !masterOn ? 'opacity-40' : ''
                }`}
              >
                <Text
                  className={`flex-1 text-[15px] select-none ${
                    masterOn ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {auto.auto_number}
                </Text>
                <Switch
                  trackColor={SWITCH_TRACK}
                  thumbColor={SWITCH_THUMB}
                  ios_backgroundColor={IOS_BG}
                  value={masterOn && autoOn}
                  disabled={!masterOn}
                  onValueChange={v => onToggleAuto(item.notification_type, auto.id, v)}
                  accessibilityLabel={`${auto.auto_number} — переключатель уведомлений`}
                  accessibilityState={{ disabled: !masterOn }}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

