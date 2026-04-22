import React from 'react';
import { View, Text, Switch, Pressable } from 'react-native';
import type { NotificationTypeGranted } from '../../types/notifications';

// Shared Switch colors so mobile and web render identical visuals.
//
// Contrast matters most on iOS: there the Switch ignores `trackColor.false`
// and uses `ios_backgroundColor` for the OFF state. Previously this was
// `#3e3e3e`, nearly identical to the ON `#3A3A3A` — OFF vs ON was only
// distinguishable by thumb position. We now use a light gray (`#E9E9EA`,
// iOS HIG standard) so the OFF state reads as clearly "inactive" on all
// three platforms, while ON stays on our brand graphite.
const SWITCH_TRACK = { false: '#E9E9EA', true: '#3A3A3A' };
const SWITCH_THUMB = '#FFFFFF';
const IOS_BG = '#E9E9EA';

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
          className={`text-xs w-4 mr-2.5 select-none ${
            masterOn ? 'text-accent-secondary' : 'text-text-muted'
          } ${hasAutos ? '' : 'opacity-0'}`}
        >
          {expanded ? '▼' : '▶'}
        </Text>
        <Text
          className={`flex-1 text-base select-none ${
            masterOn
              ? 'font-semibold text-text-primary'
              : 'font-medium text-text-secondary'
          }`}
        >
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

